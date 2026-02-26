import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { silviaService } from '@/services/silvia.service';
import { KBCollection, KBDocument } from '@/types';
import { Plus, BookOpen, FileText, Trash2, Loader2, ArrowLeft, Upload } from 'lucide-react';

export function KnowledgePage() {
  const [collections, setCollections] = useState<KBCollection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [documents, setDocuments] = useState<KBDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Create collection form
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');

  // Ingest document form
  const [showIngest, setShowIngest] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [ingestForm, setIngestForm] = useState({ title: '', content: '', source: '' });

  const loadCollections = () => {
    silviaService.listCollections().then((res) => {
      if (res.data) setCollections(res.data);
    }).finally(() => setLoading(false));
  };

  const loadDocuments = (colId: string) => {
    setLoadingDocs(true);
    silviaService.listDocuments(colId).then((res) => {
      if (res.data) setDocuments(res.data);
    }).finally(() => setLoadingDocs(false));
  };

  useEffect(loadCollections, []);

  useEffect(() => {
    if (selectedCollection) loadDocuments(selectedCollection);
  }, [selectedCollection]);

  const handleCreateCollection = async () => {
    if (!newColName.trim()) return;
    await silviaService.createCollection({ name: newColName, description: newColDesc });
    setNewColName('');
    setNewColDesc('');
    setShowNewCollection(false);
    loadCollections();
  };

  const handleDeleteCollection = async (id: string) => {
    if (!confirm('Tem a certeza? Todos os documentos serao eliminados.')) return;
    await silviaService.deleteCollection(id);
    if (selectedCollection === id) setSelectedCollection(null);
    loadCollections();
  };

  const handleIngest = async () => {
    if (!selectedCollection || !ingestForm.title || !ingestForm.content) return;
    setIngesting(true);
    try {
      await silviaService.ingestDocument(selectedCollection, ingestForm);
      setIngestForm({ title: '', content: '', source: '' });
      setShowIngest(false);
      loadDocuments(selectedCollection);
    } catch (err) {
      console.error(err);
    } finally {
      setIngesting(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (!confirm('Eliminar documento?')) return;
    await silviaService.deleteDocument(id);
    if (selectedCollection) loadDocuments(selectedCollection);
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">A carregar...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Base de Conhecimento</h1>
          <p className="text-muted-foreground mt-1">Gerir colecoes e documentos para RAG</p>
        </div>
        <Button onClick={() => setShowNewCollection(true)}>
          <Plus className="h-4 w-4" /> Nova Colecao
        </Button>
      </div>

      {/* Create collection dialog */}
      {showNewCollection && (
        <Card className="mb-6">
          <CardContent className="p-4 space-y-3">
            <Input value={newColName} onChange={(e) => setNewColName(e.target.value)} placeholder="Nome da colecao" />
            <Input value={newColDesc} onChange={(e) => setNewColDesc(e.target.value)} placeholder="Descricao (opcional)" />
            <div className="flex gap-2">
              <Button onClick={handleCreateCollection} disabled={!newColName.trim()}>Criar</Button>
              <Button variant="outline" onClick={() => setShowNewCollection(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Collections List */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Colecoes</h2>
          {collections.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma colecao</p>
              </CardContent>
            </Card>
          ) : (
            collections.map((col) => (
              <Card
                key={col.id}
                className={`cursor-pointer transition-colors ${selectedCollection === col.id ? 'border-primary bg-primary/5' : 'hover:border-primary/30'}`}
                onClick={() => setSelectedCollection(col.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{col.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {col._count?.documents ?? 0} documentos
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); handleDeleteCollection(col.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Documents */}
        <div className="lg:col-span-2">
          {!selectedCollection ? (
            <div className="text-center py-12 text-muted-foreground">
              Selecione uma colecao para ver os documentos
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Documentos
                </h2>
                <Button size="sm" onClick={() => setShowIngest(true)}>
                  <Upload className="h-3.5 w-3.5" /> Adicionar Documento
                </Button>
              </div>

              {/* Ingest form */}
              {showIngest && (
                <Card className="mb-4">
                  <CardContent className="p-4 space-y-3">
                    <Input
                      value={ingestForm.title}
                      onChange={(e) => setIngestForm({ ...ingestForm, title: e.target.value })}
                      placeholder="Titulo do documento"
                    />
                    <Input
                      value={ingestForm.source}
                      onChange={(e) => setIngestForm({ ...ingestForm, source: e.target.value })}
                      placeholder="Fonte (URL, ficheiro, etc.) - opcional"
                    />
                    <Textarea
                      value={ingestForm.content}
                      onChange={(e) => setIngestForm({ ...ingestForm, content: e.target.value })}
                      placeholder="Cole o conteudo do documento aqui..."
                      rows={10}
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleIngest} disabled={ingesting || !ingestForm.title || !ingestForm.content}>
                        {ingesting ? <><Loader2 className="h-4 w-4 animate-spin" /> A processar...</> : 'Ingerir Documento'}
                      </Button>
                      <Button variant="outline" onClick={() => setShowIngest(false)}>Cancelar</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {loadingDocs ? (
                <div className="text-center py-8 text-muted-foreground">A carregar...</div>
              ) : documents.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhum documento nesta colecao</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <Card key={doc.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-sm">{doc.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-[10px]">
                              {doc._count?.chunks ?? 0} chunks
                            </Badge>
                            {doc.source && (
                              <span className="text-xs text-muted-foreground">{doc.source}</span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteDoc(doc.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
