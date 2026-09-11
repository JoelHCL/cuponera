import { z } from "zod";

export const setupSchema = z.object({
  spaceName: z.string().min(1, "Pon un nombre al espacio").max(60),
  memberA: z.object({
    displayName: z.string().min(1, "Falta el nombre").max(40),
    pin: z.string().min(4, "PIN de al menos 4 caracteres").max(64),
  }),
  memberB: z.object({
    displayName: z.string().min(1, "Falta el nombre").max(40),
    pin: z.string().min(4, "PIN de al menos 4 caracteres").max(64),
  }),
});

export const loginSchema = z.object({
  memberId: z.string().min(1),
  pin: z.string().min(1).max(64),
});

export const couponCreateSchema = z.object({
  title: z.string().min(1, "El cupón necesita un título").max(120),
  description: z.string().max(2000).optional().or(z.literal("")),
  expiresAt: z.string().optional().or(z.literal("")),
});

export const requestSchema = z.object({
  note: z.string().max(500).optional().or(z.literal("")),
});

export type SetupInput = z.infer<typeof setupSchema>;
export type CouponCreateInput = z.infer<typeof couponCreateSchema>;

export const despensaCreateSchema = z.object({
  nombre: z.string().min(1, "El artículo necesita un nombre").max(120),
});

export type DespensaCreateInput = z.infer<typeof despensaCreateSchema>;
