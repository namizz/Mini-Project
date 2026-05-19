import { Router } from 'express';
import { signup, login } from '../controllers/auth.controller';

const router = Router();

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Create a new user account
 *     description: |
 *       **What is possible:**
 *       - Register a new account by providing an email, name, and password.
 *       - You can choose to be an `AUTHOR` (can create/manage articles) or a `READER` (can only read articles). If omitted, defaults to `READER`.
 *       
 *       **What is NOT possible:**
 *       - Cannot register an email that is already in use (returns 409 Conflict).
 *       - Cannot provide a password shorter than 6 characters (returns 400 Validation Error).
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               name:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [AUTHOR, READER]
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation Error (e.g., invalid email, short password)
 *       409:
 *         description: User already exists
 */
router.post('/signup', signup);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login to an existing account
 *     description: |
 *       **What is possible:**
 *       - Authenticate using your registered email and password.
 *       - Receives a JWT Bearer token used to access protected routes.
 *       
 *       **What is NOT possible:**
 *       - Cannot login if the account does not exist or password is incorrect (returns 401 Unauthorized).
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token
 *       400:
 *         description: Validation Error
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', login);

export default router;
