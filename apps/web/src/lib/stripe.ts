import Stripe from 'stripe';

// Fail fast at boot: a missing STRIPE_SECRET_KEY is always a misconfiguration,
// never a recoverable runtime condition.
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
