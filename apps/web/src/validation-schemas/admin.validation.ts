import { z } from 'zod';

export const inviteUserSchema = z.object({
  email: z
    .string()
    .min(1, "L'email doit être renseigné")
    .email("L'email ne semble pas valide"),
});

export type TInviteUserFormData = z.infer<typeof inviteUserSchema>;
