import api from './api';
import {
  ApiResponse,
  PaginatedResponse,
  LoginResult,
  Organization,
  OrgStats,
  Persona,
  KBCollection,
  KBDocument,
  Channel,
  Conversation,
  Message,
} from '../types';

export const silviaService = {
  // ── Auth ──

  async login(email: string, password: string): Promise<ApiResponse<LoginResult>> {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },

  async register(data: {
    email: string;
    password: string;
    name: string;
    orgName: string;
  }): Promise<ApiResponse<LoginResult>> {
    const res = await api.post('/auth/register', data);
    return res.data;
  },

  async me(): Promise<ApiResponse<any>> {
    const res = await api.get('/auth/me');
    return res.data;
  },

  // ── Organization ──

  async getOrg(): Promise<ApiResponse<Organization>> {
    const res = await api.get('/org');
    return res.data;
  },

  async updateOrg(data: { name?: string; settings?: any }): Promise<ApiResponse<Organization>> {
    const res = await api.put('/org', data);
    return res.data;
  },

  async getOrgUsers(): Promise<ApiResponse<any[]>> {
    const res = await api.get('/org/users');
    return res.data;
  },

  async inviteUser(data: {
    email: string;
    name: string;
    role: string;
    password: string;
  }): Promise<ApiResponse<any>> {
    const res = await api.post('/org/users/invite', data);
    return res.data;
  },

  async getStats(): Promise<ApiResponse<OrgStats>> {
    const res = await api.get('/org/stats');
    return res.data;
  },

  // ── Personas ──

  async listPersonas(): Promise<ApiResponse<Persona[]>> {
    const res = await api.get('/personas');
    return res.data;
  },

  async getPersona(id: string): Promise<ApiResponse<Persona>> {
    const res = await api.get(`/personas/${id}`);
    return res.data;
  },

  async createPersona(data: Partial<Persona>): Promise<ApiResponse<Persona>> {
    const res = await api.post('/personas', data);
    return res.data;
  },

  async updatePersona(id: string, data: Partial<Persona>): Promise<ApiResponse<Persona>> {
    const res = await api.put(`/personas/${id}`, data);
    return res.data;
  },

  async deletePersona(id: string): Promise<ApiResponse<void>> {
    const res = await api.delete(`/personas/${id}`);
    return res.data;
  },

  async testPersona(id: string, question: string): Promise<ApiResponse<any>> {
    const res = await api.post(`/personas/${id}/test`, { question });
    return res.data;
  },

  async assignCollection(personaId: string, collectionId: string): Promise<ApiResponse<any>> {
    const res = await api.post(`/personas/${personaId}/collections`, { collectionId });
    return res.data;
  },

  async removeCollection(personaId: string, collectionId: string): Promise<ApiResponse<void>> {
    const res = await api.delete(`/personas/${personaId}/collections/${collectionId}`);
    return res.data;
  },

  // ── Knowledge Base ──

  async listCollections(): Promise<ApiResponse<KBCollection[]>> {
    const res = await api.get('/knowledge/collections');
    return res.data;
  },

  async createCollection(data: { name: string; description?: string }): Promise<ApiResponse<KBCollection>> {
    const res = await api.post('/knowledge/collections', data);
    return res.data;
  },

  async deleteCollection(id: string): Promise<ApiResponse<void>> {
    const res = await api.delete(`/knowledge/collections/${id}`);
    return res.data;
  },

  async listDocuments(collectionId: string): Promise<ApiResponse<KBDocument[]>> {
    const res = await api.get(`/knowledge/collections/${collectionId}/documents`);
    return res.data;
  },

  async ingestDocument(
    collectionId: string,
    data: { title: string; content: string; source?: string }
  ): Promise<ApiResponse<{ documentId: string; chunks: number }>> {
    const res = await api.post(`/knowledge/collections/${collectionId}/documents`, data);
    return res.data;
  },

  async deleteDocument(id: string): Promise<ApiResponse<void>> {
    const res = await api.delete(`/knowledge/documents/${id}`);
    return res.data;
  },

  // ── Channels ──

  async listChannels(): Promise<ApiResponse<Channel[]>> {
    const res = await api.get('/channels');
    return res.data;
  },

  async createChannel(data: { type: string; name: string; config?: any }): Promise<ApiResponse<Channel>> {
    const res = await api.post('/channels', data);
    return res.data;
  },

  async updateChannel(id: string, data: Partial<Channel>): Promise<ApiResponse<Channel>> {
    const res = await api.put(`/channels/${id}`, data);
    return res.data;
  },

  async deleteChannel(id: string): Promise<ApiResponse<void>> {
    const res = await api.delete(`/channels/${id}`);
    return res.data;
  },

  async assignPersonaToChannel(
    channelId: string,
    personaId: string,
    isDefault = false
  ): Promise<ApiResponse<any>> {
    const res = await api.post(`/channels/${channelId}/personas`, { personaId, isDefault });
    return res.data;
  },

  // ── Conversations ──

  async listConversations(params?: {
    page?: number;
    limit?: number;
    personaId?: string;
    channelId?: string;
    status?: string;
  }): Promise<ApiResponse<PaginatedResponse<Conversation>>> {
    const res = await api.get('/conversations', { params });
    return res.data;
  },

  async getConversation(id: string): Promise<ApiResponse<Conversation>> {
    const res = await api.get(`/conversations/${id}`);
    return res.data;
  },

  async getMessages(conversationId: string): Promise<ApiResponse<Message[]>> {
    const res = await api.get(`/conversations/${conversationId}/messages`);
    return res.data;
  },

  // ── Voice ──

  async voiceHealth(): Promise<ApiResponse<{ voiceEnabled: boolean }>> {
    const res = await api.get('/voice/health');
    return res.data;
  },
};
