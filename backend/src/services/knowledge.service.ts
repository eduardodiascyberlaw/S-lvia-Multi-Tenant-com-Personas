import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { RAGService } from './rag.service';

export class KnowledgeService {
  // ── List Collections ──

  static async listCollections(orgId: string) {
    return prisma.kBCollection.findMany({
      where: { orgId },
      include: {
        _count: {
          select: { documents: true, personas: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Create Collection ──

  static async createCollection(orgId: string, name: string, description?: string) {
    return prisma.kBCollection.create({
      data: { orgId, name, description },
    });
  }

  // ── Delete Collection ──

  static async deleteCollection(id: string, orgId: string) {
    const collection = await prisma.kBCollection.findFirst({ where: { id, orgId } });
    if (!collection) throw new AppError('Colecao nao encontrada', 404);

    await prisma.kBCollection.delete({ where: { id } });
  }

  // ── List Documents ──

  static async listDocuments(collectionId: string, orgId: string) {
    // Verify collection ownership
    const collection = await prisma.kBCollection.findFirst({
      where: { id: collectionId, orgId },
    });
    if (!collection) throw new AppError('Colecao nao encontrada', 404);

    return prisma.kBDocument.findMany({
      where: { collectionId },
      select: {
        id: true,
        title: true,
        source: true,
        metadata: true,
        createdAt: true,
        _count: {
          select: { chunks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Ingest Document ──

  static async ingestDocument(
    collectionId: string,
    orgId: string,
    data: {
      title: string;
      content: string;
      source?: string;
      metadata?: Prisma.InputJsonValue;
    }
  ) {
    // Verify collection ownership
    const collection = await prisma.kBCollection.findFirst({
      where: { id: collectionId, orgId },
    });
    if (!collection) throw new AppError('Colecao nao encontrada', 404);

    return RAGService.ingestDocument(
      collectionId,
      data.title,
      data.content,
      data.source,
      data.metadata
    );
  }

  // ── Delete Document ──

  static async deleteDocument(id: string, orgId: string) {
    const doc = await prisma.kBDocument.findFirst({
      where: { id },
      include: { collection: true },
    });

    if (!doc || doc.collection.orgId !== orgId) {
      throw new AppError('Documento nao encontrado', 404);
    }

    await prisma.kBDocument.delete({ where: { id } });
  }
}
