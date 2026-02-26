import { UserRole } from '@prisma/client';

// ── JWT ──

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  orgId: string;
  orgStatus: string;
}

// ── Express extensions ──

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// ── API Response ──

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── RAG ──

export interface RAGSource {
  documentId: string;
  title: string;
  content: string;
  similarity: number;
}

export interface RAGResult {
  answer: string;
  sources: RAGSource[];
}

// ── Voice ──

export interface TranscriptionResult {
  text: string;
  language: string;
}

export interface SynthesisResult {
  audioBase64: string;
  contentType: string;
}

// ── Knowledge Base ──

export interface ChunkData {
  content: string;
  embedding: number[];
  chunkIndex: number;
}
