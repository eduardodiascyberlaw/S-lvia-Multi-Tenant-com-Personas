import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { PersonaListPage } from '@/pages/personas/PersonaListPage';
import { PersonaFormPage } from '@/pages/personas/PersonaFormPage';
import { KnowledgePage } from '@/pages/knowledge/KnowledgePage';
import { ConversationsPage } from '@/pages/conversations/ConversationsPage';
import { ChannelsPage } from '@/pages/channels/ChannelsPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">A carregar...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <img src="/silvia-avatar.jpg" alt="SilvIA" className="w-20 h-20 rounded-full mx-auto mb-4 border-2 border-purple-400/50 object-cover" />
          <p className="text-purple-200 animate-pulse">A carregar...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/personas" element={<PersonaListPage />} />
        <Route path="/personas/:id" element={<PersonaFormPage />} />
        <Route path="/knowledge" element={<KnowledgePage />} />
        <Route path="/conversations" element={<ConversationsPage />} />
        <Route path="/channels" element={<ChannelsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
