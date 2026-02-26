// ── API ──

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: { field: string; message: string }[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Auth ──

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  orgId: string;
  orgName: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

// ── Organization ──

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  settings: any;
  createdAt: string;
  _count?: {
    users: number;
    personas: number;
    channels: number;
    conversations: number;
  };
}

export interface OrgStats {
  personas: { total: number; active: number };
  channels: { total: number; active: number };
  conversations: { total: number; active: number; today: number };
  messages: { total: number; today: number };
  documents: { total: number };
}

// ── Persona ──

export interface Persona {
  id: string;
  name: string;
  description?: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  voiceEnabled: boolean;
  voiceUuid?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    conversations: number;
    channels: number;
    kbCollections: number;
  };
  kbCollections?: {
    collection: { id: string; name: string; description?: string };
  }[];
  channels?: {
    channel: { id: string; name: string; type: string };
    isDefault: boolean;
  }[];
}

// ── Knowledge Base ──

export interface KBCollection {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  _count?: {
    documents: number;
    personas: number;
  };
}

export interface KBDocument {
  id: string;
  title: string;
  source?: string;
  metadata?: any;
  createdAt: string;
  _count?: {
    chunks: number;
  };
}

// ── Channel ──

export interface Channel {
  id: string;
  type: 'WHATSAPP' | 'WEBCHAT' | 'EMAIL';
  name: string;
  token: string;
  config?: any;
  isActive: boolean;
  createdAt: string;
  personas?: {
    persona: { id: string; name: string; avatar?: string };
    isDefault: boolean;
  }[];
  _count?: {
    conversations: number;
  };
}

// ── Conversation ──

export interface Conversation {
  id: string;
  personaId: string;
  channelId?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  persona?: { id: string; name: string; avatar?: string };
  channel?: { id: string; name: string; type: string };
  contact?: { id: string; name?: string; phone?: string; email?: string };
  messages?: Message[];
  _count?: { messages: number };
}

export interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  sources?: any[];
  metadata?: any;
  createdAt: string;
}
