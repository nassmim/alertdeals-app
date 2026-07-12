import { z } from 'zod';

// Forme d'un abonnement Web Push tel que renvoyé par `subscription.toJSON()`
// côté navigateur. Partagé entre le hook client et la server action pour
// valider le payload avant persistance.
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export type TPushSubscriptionData = z.infer<typeof pushSubscriptionSchema>;
