import { z } from 'zod';

const emptyToNull = (v: unknown) =>
  v === '' || v === null || v === undefined ? null : v;

export const whatsappSettingsSchema = z.object({
  whatsappPhoneNumber: z.preprocess(
    emptyToNull,
    z.string().trim().min(5).max(64).nullable(),
  ),
  whatsappIsGroup: z.boolean(),
});

export type TWhatsappSettingsData = z.infer<typeof whatsappSettingsSchema>;
