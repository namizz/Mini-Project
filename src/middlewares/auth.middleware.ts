import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { BaseResponse } from '../utils/response';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json(BaseResponse.error('Unauthorized'));
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = { id: decoded.sub, email: decoded.email, role: decoded.role };
    next();
  } catch (error) {
    res.status(401).json(BaseResponse.error('Invalid token'));
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(BaseResponse.error('Unauthorized'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json(BaseResponse.error('Forbidden: Insufficient permissions'));
      return;
    }
    next();
  };
};
