import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { silviaService } from '@/services/silvia.service';
import { Organization, OrgUser } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Save, Loader2, Users, Plus } from 'lucide-react';

export function SettingsPage() {
  const { user } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [voiceHealth, setVoiceHealth] = useState<boolean | null>(null);

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', role: 'MEMBER', password: '' });

  useEffect(() => {
    Promise.all([
      silviaService.getOrg(),
      silviaService.getOrgUsers(),
      silviaService.voiceHealth(),
    ]).then(([orgRes, usersRes, voiceRes]) => {
      if (orgRes.data) { setOrg(orgRes.data); setOrgName(orgRes.data.name); }
      if (usersRes.data) setOrgUsers(usersRes.data);
      if (voiceRes.data) setVoiceHealth(voiceRes.data.voiceEnabled);
    }).finally(() => setLoading(false));
  }, []);

  const handleSaveOrg = async () => {
    setSaving(true);
    try {
      await silviaService.updateOrg({ name: orgName });
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteForm.email || !inviteForm.name || !inviteForm.password) return;
    await silviaService.inviteUser(inviteForm);
    setShowInvite(false);
    setInviteForm({ email: '', name: '', role: 'MEMBER', password: '' });
    silviaService.getOrgUsers().then((res) => { if (res.data) setOrgUsers(res.data); });
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">A carregar...</div>;

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Definicoes</h1>
        <p className="text-muted-foreground mt-1">Configurar a organizacao e utilizadores</p>
      </div>

      <div className="space-y-6">
        {/* Organization */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Organizacao</CardTitle>
            <CardDescription>Informacao da organizacao</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Nome</label>
                <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Plano</label>
                <div className="mt-2">
                  <Badge>{org?.plan}</Badge>
                </div>
              </div>
            </div>
            <Button onClick={handleSaveOrg} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar
            </Button>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estado do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge variant={voiceHealth ? 'default' : 'secondary'}>
                Voz: {voiceHealth ? 'Ativa' : 'Inativa'}
              </Badge>
              <Badge variant="default">
                OpenAI: Configurado
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Utilizadores</CardTitle>
              <CardDescription>{orgUsers.length} utilizadores</CardDescription>
            </div>
            {(user?.role === 'OWNER' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
              <Button size="sm" onClick={() => setShowInvite(true)}>
                <Plus className="h-3.5 w-3.5" /> Convidar
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {showInvite && (
              <div className="mb-4 p-4 border rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input value={inviteForm.name} onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })} placeholder="Nome" />
                  <Input value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="Email" />
                  <Input type="password" value={inviteForm.password} onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })} placeholder="Password" />
                  <select className="border rounded px-2 py-1 text-sm" value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}>
                    <option value="MEMBER">Membro</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleInvite}>Convidar</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowInvite(false)}>Cancelar</Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {orgUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <Badge variant={u.isActive ? 'outline' : 'secondary'}>{u.role}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
