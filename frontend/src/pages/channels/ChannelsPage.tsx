import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { silviaService } from '@/services/silvia.service';
import { Channel, Persona } from '@/types';
import { Plus, Radio, MessageCircle, Mail, Phone, Trash2, Users, Settings, Copy, Check, Save, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

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

interface ZApiConfig {
  instanceId?: string;
  token?: string;
}

export function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', type: 'WEBCHAT' as string });

  // Z-API config editor state
  const [configEdit, setConfigEdit] = useState<{
    channelId: string;
    instanceId: string;
    zapiToken: string;
  } | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = () => {
    Promise.all([
      silviaService.listChannels(),
      silviaService.listPersonas(),
    ]).then(([chRes, pRes]) => {
      if (chRes.data) setChannels(chRes.data);
      if (pRes.data) setPersonas(pRes.data);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

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

  const openConfigEdit = (channel: Channel) => {
    const cfg = (channel.config ?? {}) as ZApiConfig;
    setConfigEdit({
      channelId: channel.id,
      instanceId: cfg.instanceId ?? '',
      zapiToken: cfg.token ?? '',
    });
  };

  const handleSaveConfig = async () => {
    if (!configEdit) return;
    setSavingConfig(true);
    try {
      await silviaService.updateChannel(configEdit.channelId, {
        config: { instanceId: configEdit.instanceId, token: configEdit.zapiToken },
      });
      setConfigEdit(null);
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingConfig(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const webhookUrl = (channelToken: string) =>
    `${API_URL}/api/webhooks/whatsapp/${channelToken}`;

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
            const isEditingConfig = configEdit?.channelId === channel.id;
            const cfg = (channel.config ?? {}) as ZApiConfig;
            const hasZapiConfig = channel.type === 'WHATSAPP' && !!cfg.instanceId;

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

                  {/* WhatsApp Z-API config */}
                  {channel.type === 'WHATSAPP' && (
                    <div className="space-y-2 border-t pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium flex items-center gap-1">
                          <Settings className="h-3 w-3" /> Z-API
                        </span>
                        {hasZapiConfig ? (
                          <Badge variant="secondary" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                            Configurado
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                            Por configurar
                          </Badge>
                        )}
                      </div>

                      {isEditingConfig ? (
                        <div className="space-y-2">
                          <Input
                            value={configEdit.instanceId}
                            onChange={(e) => setConfigEdit({ ...configEdit, instanceId: e.target.value })}
                            placeholder="Instance ID"
                            className="text-xs h-8"
                          />
                          <Input
                            value={configEdit.zapiToken}
                            onChange={(e) => setConfigEdit({ ...configEdit, zapiToken: e.target.value })}
                            placeholder="Token Z-API"
                            className="text-xs h-8"
                          />
                          <div className="flex gap-1.5">
                            <Button size="sm" className="h-7 text-xs flex-1" onClick={handleSaveConfig} disabled={savingConfig}>
                              {savingConfig ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                              Guardar
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setConfigEdit(null)}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-7 text-xs"
                          onClick={() => openConfigEdit(channel)}
                        >
                          <Settings className="h-3 w-3" />
                          {hasZapiConfig ? 'Editar configuração Z-API' : 'Configurar Z-API'}
                        </Button>
                      )}

                      {/* Webhook URL */}
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">URL do Webhook (configurar no Z-API):</p>
                        <div className="flex items-center gap-1 bg-muted rounded px-2 py-1">
                          <code className="text-[10px] flex-1 truncate text-muted-foreground">
                            {webhookUrl(channel.token)}
                          </code>
                          <button
                            onClick={() => copyToClipboard(webhookUrl(channel.token), channel.id)}
                            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {copied === channel.id ? (
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
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
