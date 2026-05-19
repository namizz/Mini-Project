import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { BaseResponse } from '../utils/response';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

const signupSchema = z.object({
  email: z.string().email(),
  name: z.string().regex(/^[a-zA-Z\s]+$/, 'Name can only contain alphabets and spaces'),
  password: z.string()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, 'Password must contain uppercase, lowercase, number, and special character'),
  role: z.enum(['AUTHOR', 'READER']),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name, password, role } = signupSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json(BaseResponse.error('User already exists', ['Email already in use']));
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
      },
    });

    res.status(201).json(BaseResponse.success({ id: user.id, email: user.email, role: user.role }));
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json(BaseResponse.error('Validation Error', error.issues));
      return;
    }
    res.status(500).json(BaseResponse.error('Internal Server Error'));
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json(BaseResponse.error('Invalid credentials'));
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      res.status(401).json(BaseResponse.error('Invalid credentials'));
      return;
    }

    // Generate Access Token (15 minutes)
    const accessToken = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '15m' });

    // Generate Refresh Token (7 days)
    const refreshTokenString = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: refreshTokenString,
        userId: user.id,
        expiresAt,
      },
    });

    res.cookie('refreshToken', refreshTokenString, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json(BaseResponse.success({ accessToken }));
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json(BaseResponse.error('Validation Error', error.issues));
      return;
    }
    res.status(500).json(BaseResponse.error('Internal Server Error'));
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const tokenStr = req.cookies.refreshToken;
    if (!tokenStr) {
      res.status(401).json(BaseResponse.error('No refresh token provided'));
      return;
    }

    const refreshToken = await prisma.refreshToken.findUnique({
      where: { token: tokenStr },
      include: { user: true },
    });

    if (!refreshToken || refreshToken.expiresAt < new Date()) {
      res.status(401).json(BaseResponse.error('Invalid or expired refresh token'));
      return;
    }

    // Issue new pair
    const accessToken = jwt.sign({ sub: refreshToken.user.id, email: refreshToken.user.email, role: refreshToken.user.role }, JWT_SECRET, { expiresIn: '15m' });
    const newRefreshTokenString = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Swap token in DB
    await prisma.refreshToken.delete({ where: { id: refreshToken.id } });
    await prisma.refreshToken.create({
      data: {
        token: newRefreshTokenString,
        userId: refreshToken.user.id,
        expiresAt,
      },
    });

    res.cookie('refreshToken', newRefreshTokenString, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json(BaseResponse.success({ accessToken }));
  } catch (error: any) {
    res.status(500).json(BaseResponse.error('Internal Server Error'));
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const tokenStr = req.cookies.refreshToken;
    if (tokenStr) {
      await prisma.refreshToken.deleteMany({ where: { token: tokenStr } });
    }
    res.clearCookie('refreshToken');
    res.json(BaseResponse.success(null, 'Logged out successfully'));
  } catch (error: any) {
    res.status(500).json(BaseResponse.error('Internal Server Error'));
  }
};
