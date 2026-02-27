import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { silviaService } from '@/services/silvia.service';
import { KBCollection, PersonaTool, ToolType } from '@/types';
import { ArrowLeft, Save, Loader2, Send, BookOpen, Plus, X, Wrench, Trash2 } from 'lucide-react';

// ── Tool metadata ─────────────────────────────────────────────────────────────

const TOOL_META: Record<ToolType, { label: string; description: string; hasConfig: boolean }> = {
  STRIPE_CHECK_PAYMENT: {
    label: 'Stripe — Verificar Pagamento',
    description: 'Verifica o estado da subscrição de um aluno pelo email no Stripe.',
    hasConfig: false,
  },
  STRIPE_SEND_PAYMENT_LINK: {
    label: 'Stripe — Enviar Link de Pagamento',
    description: 'Devolve o link de pagamento de um curso ou produto.',
    hasConfig: true,
  },
  TRIBUNAIS_SEARCH: {
    label: 'Pesquisa de Jurisprudência',
    description: 'Pesquisa acórdãos dos tribunais administrativos (STA, TCAN, TCAS, TC) via Lex Corpus.',
    hasConfig: false,
  },
  LEGISLACAO_SEARCH: {
    label: 'Pesquisa de Legislação',
    description: 'Pesquisa legislação portuguesa (CPTA, CPA, CPPT…) via Lex Corpus.',
    hasConfig: false,
  },
};

const ALL_TOOL_TYPES: ToolType[] = [
  'STRIPE_CHECK_PAYMENT',
  'STRIPE_SEND_PAYMENT_LINK',
  'TRIBUNAIS_SEARCH',
  'LEGISLACAO_SEARCH',
];

// ── Component ─────────────────────────────────────────────────────────────────

export function PersonaFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testQuestion, setTestQuestion] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [collections, setCollections] = useState<KBCollection[]>([]);
  const [personaCollections, setPersonaCollections] = useState<string[]>([]);

  // Tools state
  const [tools, setTools] = useState<PersonaTool[]>([]);
  const [paymentLinks, setPaymentLinks] = useState<{ product: string; url: string }[]>([]);
  const [savingLinks, setSavingLinks] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    systemPrompt: 'Es a Silvia, uma assistente IA profissional. Responde de forma clara e util em portugues de Portugal.',
    model: 'gpt-4o-mini',
    temperature: 0.3,
    voiceEnabled: true,
    voiceUuid: '',
  });

  useEffect(() => {
    silviaService.listCollections().then((res) => {
      if (res.data) setCollections(res.data);
    });

    if (!isNew && id) {
      Promise.all([
        silviaService.getPersona(id),
        silviaService.listTools(id),
      ]).then(([personaRes, toolsRes]) => {
        if (personaRes.data) {
          const p = personaRes.data;
          setForm({
            name: p.name,
            description: p.description || '',
            systemPrompt: p.systemPrompt,
            model: p.model,
            temperature: p.temperature,
            voiceEnabled: p.voiceEnabled,
            voiceUuid: p.voiceUuid || '',
          });
          setPersonaCollections(p.kbCollections?.map((c) => c.collection.id) || []);
        }
        if (toolsRes.data) {
          setTools(toolsRes.data);
          const linkTool = toolsRes.data.find((t) => t.toolType === 'STRIPE_SEND_PAYMENT_LINK');
          if (linkTool?.config?.paymentLinks) {
            setPaymentLinks(
              Object.entries(linkTool.config.paymentLinks).map(([product, url]) => ({ product, url }))
            );
          }
        }
      }).finally(() => setLoading(false));
    }
  }, [id, isNew]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isNew) {
        const res = await silviaService.createPersona(form);
        if (res.data) navigate(`/personas/${res.data.id}`);
      } else if (id) {
        await silviaService.updatePersona(id, form);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testQuestion.trim() || !id || isNew) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await silviaService.testPersona(id, testQuestion);
      if (res.data) setTestResult(res.data.answer);
    } catch (err) {
      setTestResult('Erro ao testar persona');
    } finally {
      setTesting(false);
    }
  };

  const handleToggleCollection = async (collectionId: string) => {
    if (!id || isNew) return;
    const hasIt = personaCollections.includes(collectionId);
    try {
      if (hasIt) {
        await silviaService.removeCollection(id, collectionId);
        setPersonaCollections((prev) => prev.filter((c) => c !== collectionId));
      } else {
        await silviaService.assignCollection(id, collectionId);
        setPersonaCollections((prev) => [...prev, collectionId]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTool = async (toolType: ToolType) => {
    if (!id || isNew) return;
    const existing = tools.find((t) => t.toolType === toolType);
    try {
      if (existing) {
        await silviaService.removeTool(id, existing.id);
        setTools((prev) => prev.filter((t) => t.toolType !== toolType));
        if (toolType === 'STRIPE_SEND_PAYMENT_LINK') setPaymentLinks([]);
      } else {
        const res = await silviaService.addTool(id, { toolType, isEnabled: true });
        if (res.data) setTools((prev) => [...prev, res.data!]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSavePaymentLinks = async () => {
    if (!id) return;
    const linkTool = tools.find((t) => t.toolType === 'STRIPE_SEND_PAYMENT_LINK');
    if (!linkTool) return;
    setSavingLinks(true);
    try {
      const paymentLinksMap = paymentLinks.reduce<Record<string, string>>((acc, { product, url }) => {
        if (product.trim() && url.trim()) acc[product.trim()] = url.trim();
        return acc;
      }, {});
      await silviaService.updateTool(id, linkTool.id, { config: { paymentLinks: paymentLinksMap } });
    } catch (err) {
      console.error(err);
    } finally {
      setSavingLinks(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">A carregar...</div>;

  const activeToolTypes = new Set(tools.map((t) => t.toolType));

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/personas')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{isNew ? 'Nova Persona' : form.name}</h1>
          <p className="text-muted-foreground mt-1">
            {isNew ? 'Criar nova personalidade' : 'Editar personalidade'}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informacao Basica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Nome</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="ex: Silvia Juridica"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Modelo</label>
                <Input
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  placeholder="gpt-4o-mini"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Descricao</label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descricao breve da persona"
              />
            </div>
            <div>
              <label className="text-sm font-medium">System Prompt</label>
              <Textarea
                value={form.systemPrompt}
                onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                placeholder="Instrucoes de personalidade..."
                rows={8}
                className="font-mono text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Temperatura ({form.temperature})</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={form.temperature}
                  onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                  className="w-full mt-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Voice UUID (Resemble)</label>
                <Input
                  value={form.voiceUuid}
                  onChange={(e) => setForm({ ...form, voiceUuid: e.target.value })}
                  placeholder="UUID da voz (opcional)"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Knowledge Base Collections */}
        {!isNew && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5" /> Colecoes de Conhecimento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {collections.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma colecao disponivel. Crie uma na pagina de Base de Conhecimento.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {collections.map((col) => {
                    const isAssigned = personaCollections.includes(col.id);
                    return (
                      <button
                        key={col.id}
                        onClick={() => handleToggleCollection(col.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                          isAssigned
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-foreground border-border hover:border-primary/50'
                        }`}
                      >
                        {isAssigned ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                        {col.name}
                        {col._count && (
                          <Badge variant="secondary" className="ml-1 text-[10px]">
                            {col._count.documents} docs
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Ferramentas de IA */}
        {!isNew && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wrench className="h-5 w-5" /> Ferramentas de IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ALL_TOOL_TYPES.map((toolType) => {
                const meta = TOOL_META[toolType];
                const isActive = activeToolTypes.has(toolType);
                return (
                  <div key={toolType} className="space-y-3">
                    <div
                      className={`flex items-start justify-between p-4 rounded-lg border transition-colors ${
                        isActive ? 'border-primary/50 bg-primary/5' : 'border-border bg-muted/30'
                      }`}
                    >
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{meta.label}</span>
                          {isActive && (
                            <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                              Activa
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{meta.description}</p>
                      </div>
                      <Button
                        size="sm"
                        variant={isActive ? 'destructive' : 'outline'}
                        onClick={() => handleToggleTool(toolType)}
                        className="shrink-0"
                      >
                        {isActive ? <X className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                        {isActive ? 'Remover' : 'Adicionar'}
                      </Button>
                    </div>

                    {/* Payment links config */}
                    {isActive && meta.hasConfig && (
                      <div className="ml-4 pl-4 border-l-2 border-primary/20 space-y-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Links de Pagamento
                        </p>
                        {paymentLinks.map((link, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <Input
                              value={link.product}
                              onChange={(e) => {
                                const updated = [...paymentLinks];
                                updated[idx] = { ...updated[idx], product: e.target.value };
                                setPaymentLinks(updated);
                              }}
                              placeholder="Nome do produto (ex: curso_basico)"
                              className="text-sm"
                            />
                            <Input
                              value={link.url}
                              onChange={(e) => {
                                const updated = [...paymentLinks];
                                updated[idx] = { ...updated[idx], url: e.target.value };
                                setPaymentLinks(updated);
                              }}
                              placeholder="URL do link de pagamento"
                              className="text-sm"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setPaymentLinks((prev) => prev.filter((_, i) => i !== idx))}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPaymentLinks((prev) => [...prev, { product: '', url: '' }])}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Link
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSavePaymentLinks}
                            disabled={savingLinks}
                          >
                            {savingLinks ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            ) : (
                              <Save className="h-3.5 w-3.5 mr-1" />
                            )}
                            Guardar Links
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Test Persona */}
        {!isNew && id && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Testar Persona</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={testQuestion}
                  onChange={(e) => setTestQuestion(e.target.value)}
                  placeholder="Faca uma pergunta de teste..."
                  onKeyDown={(e) => e.key === 'Enter' && handleTest()}
                />
                <Button onClick={handleTest} disabled={testing || !testQuestion.trim()}>
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              {testResult && (
                <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap">
                  {testResult}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || !form.name || !form.systemPrompt}>
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> A guardar...</>
            ) : (
              <><Save className="h-4 w-4" /> {isNew ? 'Criar Persona' : 'Guardar Alteracoes'}</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
