import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { silviaService } from '@/services/silvia.service';
import { Conversation, Message } from '@/types';
import { MessageSquare, User, Bot, Clock } from 'lucide-react';

export function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    silviaService
      .listConversations({ limit: 50 })
      .then((res) => {
        if (res.data) setConversations(res.data.items);
      })
      .finally(() => setLoading(false));
  }, []);

  const selectConversation = async (conv: Conversation) => {
    setSelectedConv(conv);
    setLoadingMessages(true);
    try {
      const res = await silviaService.getConversation(conv.id);
      if (res.data?.messages) setMessages(res.data.messages);
    } finally {
      setLoadingMessages(false);
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">A carregar...</div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Conversas</h1>
        <p className="text-muted-foreground mt-1">Historico de conversas com a Silvia</p>
      </div>

      {conversations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhuma conversa</h3>
            <p className="text-muted-foreground mt-1">As conversas aparecerao aqui</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversation List */}
          <div className="space-y-2 max-h-[70vh] overflow-y-auto">
            {conversations.map((conv) => (
              <Card
                key={conv.id}
                className={`cursor-pointer transition-colors ${selectedConv?.id === conv.id ? 'border-primary bg-primary/5' : 'hover:border-primary/30'}`}
                onClick={() => selectConversation(conv)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{conv.persona?.name || 'Persona'}</span>
                    </div>
                    <Badge variant={conv.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-[10px]">
                      {conv.status}
                    </Badge>
                  </div>
                  {conv.contact && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {conv.contact.name || conv.contact.phone || conv.contact.email}
                    </p>
                  )}
                  {conv.channel && (
                    <Badge variant="outline" className="mt-1 text-[10px]">{conv.channel.type}</Badge>
                  )}
                  <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDate(conv.updatedAt)}
                    <span className="ml-auto">{conv._count?.messages ?? 0} msgs</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Messages */}
          <div className="lg:col-span-2">
            {!selectedConv ? (
              <div className="text-center py-12 text-muted-foreground">
                Selecione uma conversa para ver as mensagens
              </div>
            ) : loadingMessages ? (
              <div className="text-center py-8 text-muted-foreground">A carregar...</div>
            ) : (
              <Card>
                <CardContent className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.role === 'USER' ? 'flex-row-reverse' : ''}`}
                    >
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        msg.role === 'USER' ? 'bg-blue-100' : 'bg-primary/10'
                      }`}>
                        {msg.role === 'USER' ? (
                          <User className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Bot className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.role === 'USER'
                          ? 'bg-blue-500 text-white'
                          : 'bg-muted'
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <span className={`text-[10px] mt-1 block ${
                          msg.role === 'USER' ? 'text-blue-100' : 'text-muted-foreground'
                        }`}>
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
