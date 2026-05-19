import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient().$extends({
  query: {
    article: {
      async findMany({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async findUnique({ args, query }) {
        const result = await query(args);
        if (result?.deletedAt) return null;
        return result;
      },
      async findFirst({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async count({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      }
    }
  }
});
