import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { silviaService } from '../services/silvia.service';
import { AuthUser } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; orgName: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('silvia_user');
    const token = localStorage.getItem('silvia_token');

    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('silvia_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await silviaService.login(email, password);
    if (res.success && res.data) {
      localStorage.setItem('silvia_token', res.data.accessToken);
      localStorage.setItem('silvia_refresh', res.data.refreshToken);
      localStorage.setItem('silvia_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
    } else {
      throw new Error(res.error || 'Erro no login');
    }
  };

  const register = async (data: { email: string; password: string; name: string; orgName: string }) => {
    const res = await silviaService.register(data);
    if (res.success && res.data) {
      localStorage.setItem('silvia_token', res.data.accessToken);
      localStorage.setItem('silvia_refresh', res.data.refreshToken);
      localStorage.setItem('silvia_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
    } else {
      throw new Error(res.error || 'Erro no registo');
    }
  };

  const logout = () => {
    localStorage.removeItem('silvia_token');
    localStorage.removeItem('silvia_refresh');
    localStorage.removeItem('silvia_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
