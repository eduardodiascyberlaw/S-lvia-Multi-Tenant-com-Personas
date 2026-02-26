import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { silviaService } from '@/services/silvia.service';
import { Persona, KBCollection } from '@/types';
import { ArrowLeft, Save, Loader2, Send, BookOpen, Plus, X } from 'lucide-react';

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
      silviaService.getPersona(id).then((res) => {
        if (res.data) {
          const p = res.data;
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

  if (loading) return <div className="text-center py-12 text-muted-foreground">A carregar...</div>;

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
