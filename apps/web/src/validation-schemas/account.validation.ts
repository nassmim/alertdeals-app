import { z } from 'zod';

export const updateEmailSchema = z.object({
  email: z
    .string()
    .min(1, "L'email doit être renseigné")
    .email("L'email ne semble pas valide"),
});

export type TUpdateEmailFormData = z.infer<typeof updateEmailSchema>;
