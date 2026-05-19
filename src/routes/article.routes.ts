import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import {
  createArticle,
  updateArticle,
  deleteArticle,
  getMyArticles,
  getPublicArticles,
  getArticleById,
  getAuthorDashboard,
} from '../controllers/article.controller';

const router = Router();

/**
 * @swagger
 * /articles:
 *   get:
 *     summary: Get all published articles
 *     description: |
 *       **What is possible:**
 *       - Fetch a public feed of all articles that have a `PUBLISHED` status.
 *       - Open to everyone (no authentication required).
 *       
 *       **What is NOT possible:**
 *       - Does not show `DRAFT` articles.
 *       - Does not show articles that have been soft-deleted.
 *     tags: [Articles]
 *     responses:
 *       200:
 *         description: List of articles
 */
router.get('/', getPublicArticles);

/**
 * @swagger
 * /articles/{id}:
 *   get:
 *     summary: Get a specific article and log a read
 *     description: |
 *       **What is possible:**
 *       - Fetch details of a specific `PUBLISHED` article by its ID.
 *       - Automatically logs a "read" for analytics.
 *       
 *       **What is NOT possible:**
 *       - Cannot view an article if its status is `DRAFT` or if it has been deleted (returns 403 or 404).
 *       - Spamming this endpoint will not artificially inflate the view count (rate-limited/debounced to 1 read per 10 seconds per IP).
 *     tags: [Articles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Article details
 *       403:
 *         description: Forbidden (Article is not published)
 *       404:
 *         description: News article no longer available
 */
router.get('/:id', getArticleById);

router.use(authenticate);

/**
 * @swagger
 * /articles/me/list:
 *   get:
 *     summary: Get author's articles
 *     description: |
 *       **What is possible:**
 *       - Fetch a list of all articles authored by the currently logged-in user, including both `DRAFT` and `PUBLISHED` statuses.
 *       
 *       **What is NOT possible:**
 *       - Readers cannot access this (returns 403 Forbidden).
 *       - Cannot see other authors' articles.
 *       - Does not show soft-deleted articles.
 *     tags: [Author]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of author's articles
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/me/list', requireRole(['AUTHOR']), getMyArticles);

/**
 * @swagger
 * /author/dashboard:
 *   get:
 *     summary: Get author's dashboard stats
 *     description: |
 *       **What is possible:**
 *       - Fetch total read view counts across all articles authored by the logged-in user.
 *       - View analytics breakdowns per article.
 *       
 *       **What is NOT possible:**
 *       - Readers cannot access this (returns 403 Forbidden).
 *     tags: [Author]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/me/dashboard', requireRole(['AUTHOR']), getAuthorDashboard);

/**
 * @swagger
 * /articles:
 *   post:
 *     summary: Create a new article
 *     description: |
 *       **What is possible:**
 *       - Create a new article with a title, content, and status.
 *       - Only accessible by users with the `AUTHOR` role.
 *       
 *       **What is NOT possible:**
 *       - Users with the `READER` role cannot create articles (returns 403 Forbidden).
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: The Future of TypeScript
 *               content:
 *                 type: string
 *                 example: TypeScript is evolving rapidly, bringing new features that make building robust applications easier than ever. In this comprehensive guide, we will explore the latest advancements...
 *               category:
 *                 type: string
 *                 example: Technology
 *               status:
 *                 type: string
 *                 enum: [DRAFT, PUBLISHED]
 *                 example: PUBLISHED
 *     responses:
 *       201:
 *         description: Article created
 *       400:
 *         description: Validation Error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/', requireRole(['AUTHOR']), createArticle);

/**
 * @swagger
 * /articles/{id}:
 *   put:
 *     summary: Update an article
 *     description: |
 *       **What is possible:**
 *       - Update an existing article's title, content, or status (e.g., publish a draft).
 *       - Only the original author can edit it.
 *       
 *       **What is NOT possible:**
 *       - Cannot edit another author's article (returns 403 Forbidden).
 *       - Users with the `READER` role cannot edit articles.
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: The Future of TypeScript
 *               content:
 *                 type: string
 *                 example: TypeScript is evolving rapidly, bringing new features that make building robust applications easier than ever. In this comprehensive guide, we will explore the latest advancements...
 *               category:
 *                 type: string
 *                 example: Technology
 *               status:
 *                 type: string
 *                 enum: [DRAFT, PUBLISHED]
 *                 example: PUBLISHED
 *     responses:
 *       200:
 *         description: Article updated
 *       400:
 *         description: Validation Error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Article not found
 */
router.put('/:id', requireRole(['AUTHOR']), updateArticle);

/**
 * @swagger
 * /articles/{id}:
 *   delete:
 *     summary: Soft delete an article
 *     description: |
 *       **What is possible:**
 *       - Soft-delete an article (marks it as deleted so it hides from public feeds but remains in the database).
 *       - Only the original author can do this.
 *       
 *       **What is NOT possible:**
 *       - Cannot delete another author's article (returns 403 Forbidden).
 *       - Cannot permanently destroy the database row (hard delete).
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Article deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Article not found
 */
router.delete('/:id', requireRole(['AUTHOR']), deleteArticle);

export default router;
