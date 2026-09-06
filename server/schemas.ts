import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

export const LoginSchema = z.object({
  username: z.string().min(1, 'Имя пользователя не может быть пустым').max(50),
  password: z.string().min(1, 'Пароль не может быть пустым').max(128)
});

export const CubixLoginSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1).max(128)
});

export const ChangePasswordSchema = z.object({
  username: z.string().min(1).max(50),
  oldPassword: z.string().min(1).max(128),
  newPassword: z.string().min(4, 'Новый пароль должен содержать не менее 4 символов').max(128)
});

export const GuideBlockSchema = z.object({
  id: z.string(),
  type: z.string(),
  content: z.any()
});

export const SaveGuideSchema = z.object({
  meta: z.object({
    id: z.string().optional(),
    title: z.string().min(1, 'Название гайда обязательно').max(200, 'Слишком длинное название'),
    category: z.string().min(1, 'Категория обязательна'),
    author: z.string().min(1),
    coAuthors: z.array(z.string()).optional(),
    difficulty: z.enum(['easy', 'medium', 'hard', 'expert', 'easy-medium', 'medium-hard']),
    summary: z.string().max(1000).optional(),
    server: z.string().optional(),
    coverUrl: z.string().optional(),
    coverGradient: z.string().optional(),
    published: z.boolean().optional(),
    isVisible: z.boolean().optional()
  }),
  blocks: z.array(GuideBlockSchema).default([])
});

export const CreateCommentSchema = z.object({
  author: z.string().min(1, 'Автор не указан'),
  authorRole: z.string().optional(),
  content: z.string().min(1, 'Текст комментария не может быть пустым').max(3000, 'Комментарий слишком длинный'),
  parentId: z.string().nullable().optional()
});

export const CommentReactionSchema = z.object({
  username: z.string().min(1),
  reactionType: z.enum(['good', 'neutral', 'bad'])
});

export const UpdateProfileSchema = z.object({
  bio: z.string().max(1000).optional(),
  avatar_url: z.string().max(500).optional(),
  discord: z.string().max(100).optional(),
  vk: z.string().max(100).optional(),
  telegram: z.string().max(100).optional()
});

/**
 * Express middleware helper to validate request body against a Zod schema
 */
export function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const formattedErrors = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      return res.status(400).json({
        error: `Ошибка валидации данных: ${formattedErrors}`,
        details: result.error.flatten()
      });
    }
    req.body = result.data;
    next();
  };
}
