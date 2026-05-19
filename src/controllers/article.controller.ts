import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { BaseResponse } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

const articleSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
});

export const createArticle = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, content, status } = articleSchema.parse(req.body);
    const authorId = req.user!.id;

    const article = await prisma.article.create({
      data: { title, content, status: status || 'DRAFT', authorId },
    });

    res.status(201).json(BaseResponse.success(article));
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json(BaseResponse.error('Validation Error', error.issues));
      return;
    }
    res.status(500).json(BaseResponse.error('Internal Server Error', error.message));
  }
};

export const updateArticle = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);
    const { title, content, status } = articleSchema.parse(req.body);
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
      data: { title, content, status },
    });

    res.json(BaseResponse.success(updated));
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json(BaseResponse.error('Validation Error', error.issues));
      return;
    }
    res.status(500).json(BaseResponse.error('Internal Server Error', error.message));
  }
};

export const deleteArticle = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);
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
    res.status(500).json(BaseResponse.error('Internal Server Error', error.message));
  }
};

export const getMyArticles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const authorId = req.user!.id;
    const articles = await prisma.article.findMany({
      where: { authorId, deletedAt: null },
    });
    res.json(BaseResponse.success(articles));
  } catch (error: any) {
    res.status(500).json(BaseResponse.error('Internal Server Error', error.message));
  }
};

export const getPublicArticles = async (req: Request, res: Response): Promise<void> => {
  try {
    const articles = await prisma.article.findMany({
      where: { status: 'PUBLISHED', deletedAt: null },
      include: { author: { select: { id: true, email: true } } },
    });
    res.json(BaseResponse.success(articles));
  } catch (error: any) {
    res.status(500).json(BaseResponse.error('Internal Server Error', error.message));
  }
};

export const getArticleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);
    const article = await prisma.article.findUnique({
      where: { id },
      include: { author: { select: { id: true, email: true } } },
    });

    if (!article || article.deletedAt) {
      res.status(404).json(BaseResponse.error('News article no longer available'));
      return;
    }
    if (article.status !== 'PUBLISHED') {
      res.status(403).json(BaseResponse.error('Forbidden: Article is not published'));
      return;
    }

    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    
    const tenSecondsAgo = new Date(Date.now() - 10 * 1000);
    const recentRead = await prisma.readLog.findFirst({
      where: {
        articleId: id,
        ipAddress,
        readAt: { gte: tenSecondsAgo }
      }
    });

    if (!recentRead) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      prisma.$transaction(async (tx) => {
        await tx.readLog.create({
          data: { articleId: id, ipAddress },
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
    }

    res.json(BaseResponse.success(article));
  } catch (error: any) {
    res.status(500).json(BaseResponse.error('Internal Server Error', error.message));
  }
};

export const getAuthorDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const authorId = req.user!.id;

    const articles = await prisma.article.findMany({
      where: { authorId, deletedAt: null },
      include: {
        dailyAnalytics: true,
      },
    });

    let totalViews = 0;
    const articlesWithStats = articles.map(article => {
      const views = article.dailyAnalytics.reduce((sum, current) => sum + current.viewCount, 0);
      totalViews += views;
      return {
        id: article.id,
        title: article.title,
        status: article.status,
        views,
      };
    });

    res.json(BaseResponse.success({
      totalViews,
      articles: articlesWithStats,
    }));
  } catch (error: any) {
    res.status(500).json(BaseResponse.error('Internal Server Error', error.message));
  }
};
