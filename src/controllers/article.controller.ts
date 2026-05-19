import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { BaseResponse, PaginatedResponse } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

const articleSchema = z.object({
  title: z.string().min(1).max(150),
  content: z.string().min(50),
  category: z.string().min(1),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
});

export const createArticle = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, content, category, status } = articleSchema.parse(req.body);
    const authorId = req.user!.id;

    const article = await prisma.article.create({
      data: { title, content, category, status: status || 'DRAFT', authorId },
    });

    res.status(201).json(BaseResponse.success(article));
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json(BaseResponse.error('Validation Error', error.issues));
      return;
    }
    res.status(500).json(BaseResponse.error('Internal Server Error'));
  }
};

export const updateArticle = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { title, content, category, status } = articleSchema.parse(req.body);
    const authorId = req.user!.id;

    const article = await prisma.article.findUnique({ where: { id } });
    if (!article) {
      res.status(404).json(BaseResponse.error('Article not found'));
      return;
    }
    if (article.authorId !== authorId) {
      res.status(403).json(BaseResponse.error('Forbidden'));
      return;
    }

    const updated = await prisma.article.update({
      where: { id },
      data: { title, content, category, status },
    });

    res.json(BaseResponse.success(updated));
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json(BaseResponse.error('Validation Error', error.issues));
      return;
    }
    res.status(500).json(BaseResponse.error('Internal Server Error'));
  }
};

export const deleteArticle = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const authorId = req.user!.id;

    const article = await prisma.article.findUnique({ where: { id } });
    if (!article) {
      res.status(404).json(BaseResponse.error('Article not found'));
      return;
    }
    if (article.authorId !== authorId) {
      res.status(403).json(BaseResponse.error('Forbidden'));
      return;
    }

    const deleted = await prisma.article.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.json(BaseResponse.success(deleted, 'Article deleted'));
  } catch (error: any) {
    res.status(500).json(BaseResponse.error('Internal Server Error'));
  }
};

export const getMyArticles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const authorId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.size as string) || 10;
    const skip = (page - 1) * limit;

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where: { authorId, deletedAt: null },
        skip,
        take: limit,
      }),
      prisma.article.count({ where: { authorId, deletedAt: null } })
    ]);

    res.json(PaginatedResponse.paginatedSuccess(articles, page, limit, total));
  } catch (error: any) {
    res.status(500).json(BaseResponse.error('Internal Server Error'));
  }
};

export const getPublicArticles = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.size as string) || 10;
    const skip = (page - 1) * limit;

    const { category, author, q } = req.query;

    const whereClause: any = { status: 'PUBLISHED', deletedAt: null };
    
    if (category) {
      whereClause.category = category as string;
    }
    if (author) {
      whereClause.author = { name: { contains: author as string, mode: 'insensitive' } };
    }
    if (q) {
      whereClause.title = { contains: q as string, mode: 'insensitive' };
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where: whereClause,
        include: { author: { select: { id: true, name: true, email: true } } },
        skip,
        take: limit,
      }),
      prisma.article.count({ where: whereClause })
    ]);

    res.json(PaginatedResponse.paginatedSuccess(articles, page, limit, total));
  } catch (error: any) {
    res.status(500).json(BaseResponse.error('Internal Server Error'));
  }
};

export const getArticleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const article = await prisma.article.findUnique({
      where: { id },
      include: { author: { select: { id: true, name: true, email: true } } },
    });

    if (!article || article.deletedAt) {
      res.status(404).json(BaseResponse.error('News article no longer available'));
      return;
    }
    if (article.status !== 'PUBLISHED') {
      res.status(403).json(BaseResponse.error('Forbidden: Article is not published'));
      return;
    }

    let readerId = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET) as any;
        readerId = decoded.sub;
      } catch (e) {}
    }

    // Fire and forget background job directly in Node to avoid blocking response
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    prisma.$transaction(async (tx) => {
      await tx.readLog.create({
        data: { articleId: id, readerId },
      });

      const existing = await tx.dailyAnalytics.findUnique({
        where: { articleId_date: { articleId: id, date: today } },
      });

      if (existing) {
        await tx.dailyAnalytics.update({
          where: { id: existing.id },
          data: { viewCount: existing.viewCount + 1 },
        });
      } else {
        await tx.dailyAnalytics.create({
          data: { articleId: id, date: today, viewCount: 1 },
        });
      }
    }).catch(err => console.error('Failed to log read:', err));

    res.json(BaseResponse.success(article));
  } catch (error: any) {
    res.status(500).json(BaseResponse.error('Internal Server Error'));
  }
};

export const getAuthorDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const authorId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.size as string) || 10;
    const skip = (page - 1) * limit;

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where: { authorId, deletedAt: null },
        include: { dailyAnalytics: true },
        skip,
        take: limit,
      }),
      prisma.article.count({ where: { authorId, deletedAt: null } })
    ]);

    const articlesWithStats = articles.map(article => {
      const totalViews = article.dailyAnalytics.reduce((sum, current) => sum + current.viewCount, 0);
      return {
        id: article.id,
        title: article.title,
        createdAt: article.createdAt,
        totalViews,
      };
    });

    res.json(PaginatedResponse.paginatedSuccess(articlesWithStats, page, limit, total));
  } catch (error: any) {
    res.status(500).json(BaseResponse.error('Internal Server Error'));
  }
};
