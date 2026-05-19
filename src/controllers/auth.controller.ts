import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { BaseResponse } from '../utils/response';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

const signupSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
  role: z.enum(['AUTHOR', 'READER']).optional(),
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
      res.status(409).json(BaseResponse.error('User already exists'));
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: role || 'READER',
      },
    });

    res.status(201).json(BaseResponse.success({ id: user.id, email: user.email, role: user.role }));
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json(BaseResponse.error('Validation Error', error.issues));
      return;
    }
    res.status(500).json(BaseResponse.error('Internal Server Error', error.message));
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

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1d' });

    res.json(BaseResponse.success({ token }));
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json(BaseResponse.error('Validation Error', error.issues));
      return;
    }
    res.status(500).json(BaseResponse.error('Internal Server Error', error.message));
  }
};
