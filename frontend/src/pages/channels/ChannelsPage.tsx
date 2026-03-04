import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { silviaService } from '@/services/silvia.service';
import { Channel, Persona } from '@/types';
import {
  Plus, Radio, MessageCircle, Mail, Phone, Trash2, Users,
  Loader2, QrCode, Wifi, WifiOff, RefreshCw, X,
} from 'lucide-react';

const channelIcons: Record<string, typeof Radio> = {
  WHATSAPP: Phone,
  WEBCHAT: MessageCircle,
  EMAIL: Mail,
};

const channelLabels: Record<string, string> = {
  WHATSAPP: 'WhatsApp',
  WEBCHAT: 'Web Chat',
  EMAIL: 'Email',
};

interface EvolutionConfig {
  serverUrl?: string;
  apiKey?: string;
  instanceName?: string;
}

export function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', type: 'WEBCHAT' as string });

  // QR Code state
  const [qrData, setQrData] = useState<{ channelId: string; qrCode: string } | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, string>>({});
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(() => {
    Promise.all([
      silviaService.listChannels(),
      silviaService.listPersonas(),
    ]).then(([chRes, pRes]) => {
      if (chRes.data) {
        setChannels(chRes.data);
        // Fetch status for all WhatsApp channels with config
        chRes.data.forEach((ch) => {
          const cfg = (ch.config ?? {}) as EvolutionConfig;
          if (ch.type === 'WHATSAPP' && cfg.instanceName) {
            silviaService.getWhatsAppStatus(ch.id).then((res) => {
              if (res.data) {
                setConnectionStatus((prev) => ({ ...prev, [ch.id]: res.data!.status }));
              }
            }).catch(() => { /* ignore */ });
          }
        });
      }
      if (pRes.data) setPersonas(pRes.data);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [load]);

  const handleCreate = async () => {
    if (!newForm.name.trim()) return;
    await silviaService.createChannel(newForm);
    setNewForm({ name: '', type: 'WEBCHAT' });
    setShowNew(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar canal?')) return;
    await silviaService.deleteChannel(id);
    load();
  };

  const handleAssignPersona = async (channelId: string, personaId: string) => {
    await silviaService.assignPersonaToChannel(channelId, personaId, true);
    load();
  };

  // ── QR Code connect flow ───────────────────────────────────────────────

  const handleConnect = async (channelId: string) => {
    setConnecting(channelId);
    try {
      const res = await silviaService.connectWhatsApp(channelId);
      if (res.data?.qrCode) {
        setQrData({ channelId, qrCode: res.data.qrCode });
        startPolling(channelId);
      }
    } catch (err) {
      console.error('Erro ao conectar WhatsApp:', err);
    } finally {
      setConnecting(null);
    }
  };

  const startPolling = (channelId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    let attempts = 0;
    pollingRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 20) { // ~60s timeout
        stopPolling();
        setQrData(null);
        return;
      }
      try {
        const res = await silviaService.getWhatsAppStatus(channelId);
        const status = res.data?.status ?? 'close';
        setConnectionStatus((prev) => ({ ...prev, [channelId]: status }));

        if (status === 'open') {
          stopPolling();
          setQrData(null);
          load();
        }
      } catch {
        /* ignore polling errors */
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const closeQrModal = () => {
    stopPolling();
    setQrData(null);
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">A carregar...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Canais</h1>
          <p className="text-muted-foreground mt-1">Configurar canais de comunicacao</p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4" /> Novo Canal
        </Button>
      </div>

      {showNew && (
        <Card className="mb-6">
          <CardContent className="p-4 space-y-3">
            <Input value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} placeholder="Nome do canal" />
            <div className="flex gap-2">
              {(['WEBCHAT', 'WHATSAPP', 'EMAIL'] as const).map((type) => {
                const Icon = channelIcons[type];
                return (
                  <Button
                    key={type}
                    variant={newForm.type === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewForm({ ...newForm, type })}
                  >
                    <Icon className="h-3.5 w-3.5" /> {channelLabels[type]}
                  </Button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={!newForm.name.trim()}>Criar</Button>
              <Button variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* QR Code Modal */}
      {qrData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-[400px] max-w-[90vw]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <QrCode className="h-5 w-5" /> Conectar WhatsApp
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeQrModal}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 pb-6">
              <img
                src={qrData.qrCode}
                alt="QR Code WhatsApp"
                className="w-64 h-64 rounded-lg border"
              />
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">Escaneie o QR code no WhatsApp</p>
                <p className="text-xs text-muted-foreground">
                  WhatsApp &gt; Dispositivos conectados &gt; Conectar dispositivo
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                A aguardar conexao...
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {channels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Radio className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhum canal configurado</h3>
            <p className="text-muted-foreground mt-1">Configure canais para a Silvia comunicar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {channels.map((channel) => {
            const Icon = channelIcons[channel.type] || Radio;
            const cfg = (channel.config ?? {}) as EvolutionConfig;
            const status = connectionStatus[channel.id];
            const isConnected = status === 'open';
            const isConnecting = connecting === channel.id;

            return (
              <Card key={channel.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{channel.name}</CardTitle>
                        <Badge variant="outline" className="text-[10px] mt-0.5">{channelLabels[channel.type]}</Badge>
                      </div>
                    </div>
                    <Badge variant={channel.isActive ? 'default' : 'secondary'}>
                      {channel.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-4">
                  {/* Persona assignment */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-xs font-medium">
                      <Users className="h-3 w-3" /> Persona:
                    </div>
                    {channel.personas && channel.personas.length > 0 ? (
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          {channel.personas[0].persona.name} {channel.personas[0].isDefault && '(padrao)'}
                        </Badge>
                        <select
                          className="text-xs border rounded px-1.5 py-0.5 ml-2"
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) handleAssignPersona(channel.id, e.target.value);
                          }}
                        >
                          <option value="">Trocar...</option>
                          {personas.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <select
                        className="w-full text-sm border rounded px-2 py-1"
                        onChange={(e) => {
                          if (e.target.value) handleAssignPersona(channel.id, e.target.value);
                        }}
                        defaultValue=""
                      >
                        <option value="">Atribuir persona...</option>
                        {personas.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* WhatsApp connection */}
                  {channel.type === 'WHATSAPP' && (
                    <div className="space-y-3 border-t pt-3">
                      {/* Connection status */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium flex items-center gap-1">
                          {isConnected ? (
                            <Wifi className="h-3 w-3 text-green-600" />
                          ) : (
                            <WifiOff className="h-3 w-3 text-muted-foreground" />
                          )}
                          WhatsApp
                        </span>
                        {isConnected ? (
                          <Badge variant="secondary" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                            Conectado
                          </Badge>
                        ) : cfg.instanceName ? (
                          <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                            Desconectado
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            Por conectar
                          </Badge>
                        )}
                      </div>

                      {/* Connect / Reconnect button */}
                      <Button
                        size="sm"
                        variant={isConnected ? 'outline' : 'default'}
                        className="w-full h-8 text-xs"
                        onClick={() => handleConnect(channel.id)}
                        disabled={isConnecting}
                      >
                        {isConnecting ? (
                          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> A conectar...</>
                        ) : isConnected ? (
                          <><RefreshCw className="h-3.5 w-3.5" /> Reconectar</>
                        ) : (
                          <><QrCode className="h-3.5 w-3.5" /> Conectar WhatsApp</>
                        )}
                      </Button>

                      {/* Instance info */}
                      {cfg.instanceName && (
                        <p className="text-[10px] text-muted-foreground">
                          Instancia: {cfg.instanceName}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="text-xs text-muted-foreground">
                      {channel._count?.conversations ?? 0} conversas
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(channel.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
