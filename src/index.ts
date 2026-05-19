import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './utils/swagger';
import authRoutes from './routes/auth.routes';
import articleRoutes from './routes/article.routes';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/auth', authRoutes);
app.use('/articles', articleRoutes);
// For get author dashboard, the path is /author/dashboard in the plan, but in my route it's /articles/me/dashboard.
// Let's create an author route or just map it.
app.use('/author', (req, res, next) => {
  // Alias for /author/dashboard
  if (req.path === '/dashboard') {
    req.url = '/me/dashboard';
    return articleRoutes(req, res, next);
  }
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
