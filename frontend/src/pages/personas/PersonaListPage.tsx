import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { silviaService } from '@/services/silvia.service';
import { Persona } from '@/types';
import { Plus, Bot, MessageSquare, BookOpen, Radio, Pencil, Trash2 } from 'lucide-react';

export function PersonaListPage() {
  const navigate = useNavigate();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    silviaService
      .listPersonas()
      .then((res) => { if (res.data) setPersonas(res.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem a certeza que quer eliminar esta persona?')) return;
    await silviaService.deletePersona(id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Personas</h1>
          <p className="text-muted-foreground mt-1">Gerir as personalidades da Silvia</p>
        </div>
        <Button onClick={() => navigate('/personas/new')}>
          <Plus className="h-4 w-4" /> Nova Persona
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">A carregar...</div>
      ) : personas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhuma persona criada</h3>
            <p className="text-muted-foreground mt-1">Crie a primeira persona para a Silvia</p>
            <Button className="mt-4" onClick={() => navigate('/personas/new')}>
              <Plus className="h-4 w-4" /> Criar Persona
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {personas.map((persona) => (
            <Card key={persona.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/personas/${persona.id}`)}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{persona.name}</h3>
                      <p className="text-xs text-muted-foreground">{persona.model}</p>
                    </div>
                  </div>
                  <Badge variant={persona.isActive ? 'default' : 'secondary'}>
                    {persona.isActive ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>

                {persona.description && (
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                    {persona.description}
                  </p>
                )}

                <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {persona._count?.conversations ?? 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    {persona._count?.kbCollections ?? 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Radio className="h-3 w-3" />
                    {persona._count?.channels ?? 0}
                  </span>
                </div>

                <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/personas/${persona.id}`)}>
                    <Pencil className="h-3 w-3" /> Editar
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(persona.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
