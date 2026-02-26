import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { silviaService } from '@/services/silvia.service';
import { OrgStats } from '@/types';
import { Users, MessageSquare, Radio, BookOpen, TrendingUp, Activity } from 'lucide-react';

export function DashboardPage() {
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    silviaService
      .getStats()
      .then((res) => { if (res.data) setStats(res.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">A carregar...</div>
      </div>
    );
  }

  const cards = [
    {
      title: 'Personas',
      value: stats?.personas.active ?? 0,
      subtitle: `${stats?.personas.total ?? 0} total`,
      icon: Users,
      color: 'text-purple-500',
      bg: 'bg-purple-50',
    },
    {
      title: 'Conversas Ativas',
      value: stats?.conversations.active ?? 0,
      subtitle: `${stats?.conversations.today ?? 0} hoje`,
      icon: MessageSquare,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
    },
    {
      title: 'Mensagens',
      value: stats?.messages.total ?? 0,
      subtitle: `${stats?.messages.today ?? 0} hoje`,
      icon: Activity,
      color: 'text-green-500',
      bg: 'bg-green-50',
    },
    {
      title: 'Canais Ativos',
      value: stats?.channels.active ?? 0,
      subtitle: `${stats?.channels.total ?? 0} total`,
      icon: Radio,
      color: 'text-orange-500',
      bg: 'bg-orange-50',
    },
    {
      title: 'Documentos KB',
      value: stats?.documents.total ?? 0,
      subtitle: 'na base de conhecimento',
      icon: BookOpen,
      color: 'text-pink-500',
      bg: 'bg-pink-50',
    },
    {
      title: 'Total Conversas',
      value: stats?.conversations.total ?? 0,
      subtitle: 'desde o inicio',
      icon: TrendingUp,
      color: 'text-indigo-500',
      bg: 'bg-indigo-50',
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visao geral da plataforma Silvia</p>
        </div>
        <Badge variant="secondary" className="text-sm">
          <span className="h-2 w-2 rounded-full bg-green-500 mr-2" />
          Silvia Online
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`h-8 w-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
