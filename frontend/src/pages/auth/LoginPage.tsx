import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

export function LoginPage() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    orgName: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isRegister) {
        await register(form);
      } else {
        await login(form.email, form.password);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
      setError(axiosErr.response?.data?.error || axiosErr.message || 'Erro inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      {/* Silvia Hero — Foto grande + titulo */}
      <div className="text-center mb-8">
        <div className="relative mx-auto mb-6">
          {/* Glow ring animado */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 blur-xl opacity-40 animate-pulse" style={{ width: '180px', height: '180px', margin: 'auto', left: 0, right: 0, top: 0 }} />
          {/* Avatar da Silvia */}
          <img
            src="/silvia-avatar.jpg"
            alt="SilvIA"
            className="relative w-40 h-40 rounded-full object-cover border-4 border-white/20 shadow-2xl mx-auto"
          />
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight">
          Silv<span className="text-purple-400">IA</span>
        </h1>
        <p className="text-lg text-purple-200/80 mt-2 font-light tracking-widest uppercase">
          Centro de Comando
        </p>
        <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent mx-auto mt-3" />
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-8">
        <h2 className="text-xl font-semibold text-white text-center mb-6">
          {isRegister ? 'Criar Conta' : 'Acesso ao Sistema'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <div>
                <label className="text-sm font-medium text-purple-200">Nome</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="O seu nome"
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-purple-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-purple-200">Organizacao</label>
                <Input
                  value={form.orgName}
                  onChange={(e) => setForm({ ...form, orgName: e.target.value })}
                  placeholder="Nome da organizacao"
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-purple-400"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-sm font-medium text-purple-200">Email</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@exemplo.pt"
              required
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-purple-400"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-purple-200">Password</label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••"
              required
              minLength={6}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-purple-400"
            />
          </div>

          {error && (
            <div className="text-sm text-red-300 bg-red-500/20 rounded-lg p-3 border border-red-500/30">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold h-11 rounded-xl shadow-lg shadow-purple-500/25"
            disabled={isLoading}
          >
            {isLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> A processar...</>
            ) : isRegister ? (
              'Criar Conta'
            ) : (
              'Entrar'
            )}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
              className="text-sm text-purple-300 hover:text-white transition-colors"
            >
              {isRegister ? 'Ja tem conta? Entrar' : 'Criar nova conta'}
            </button>
          </div>
        </form>
      </div>

      {/* Footer */}
      <p className="text-xs text-white/30 mt-8">
        Plataforma IA Multi-Tenant &bull; Lexcod
      </p>
    </div>
  );
}
