import {
  billingCustomers,
  eq,
  getDBAdminClient,
  subscriptions,
} from '@alertdeals/db';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import { stripe } from '@/lib/stripe';

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error('STRIPE_WEBHOOK_SECRET is not set');
}
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// In Stripe SDK v18+, `current_period_end` lives on subscription items, not on the
// subscription object. Fallback to "now" only if Stripe sent us something incomplete —
// in practice this should never happen for an active subscription.
function getCurrentPeriodEnd(subscription: Stripe.Subscription): Date {
  const periodEndUnix =
    subscription.items.data[0]?.current_period_end ?? Math.floor(Date.now() / 1000);
  return new Date(periodEndUnix * 1000);
}

/**
 * Stripe webhook. Idempotent by design — every handler upserts on the unique
 * `stripeSubscriptionId`, so Stripe's retries never produce duplicates.
 *
 * Events handled:
 *  - checkout.session.completed   → link Stripe customer to account, insert subscription row
 *  - customer.subscription.updated → keep status + period end in sync (renewals, past_due, etc.)
 *  - customer.subscription.deleted → mark as canceled
 *
 * Any other event is acknowledged but ignored — we don't want Stripe to retry events
 * we don't care about (would clog the queue and slow down legitimate ones).
 */
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    // Invalid signature = either a misconfigured webhook secret, or someone forging
    // a request. Either way, refuse silently — never leak details.
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const db = getDBAdminClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const accountId = session.metadata?.accountId;

      // Defensive: a missing accountId means the checkout was created outside our
      // server actions — skip rather than crash, and let an operator investigate.
      if (!accountId || !session.subscription || !session.customer) break;

      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription.id;

      const customerId =
        typeof session.customer === 'string' ? session.customer : session.customer.id;

      // Pull the full subscription to grab status + period end + the actual priceId
      // (the checkout session's `line_items` aren't returned here by default).
      const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = stripeSubscription.items.data[0]?.price.id;
      if (!priceId) break;

      // Link the Stripe customer to the account so future checkouts reuse it
      // (and so getStripeCustomerId() finds it).
      await db
        .insert(billingCustomers)
        .values({ accountId, stripeCustomerId: customerId })
        .onConflictDoNothing();

      // Upsert on stripeSubscriptionId — protects against Stripe retrying the event.
      await db
        .insert(subscriptions)
        .values({
          accountId,
          stripeSubscriptionId: subscriptionId,
          stripePriceId: priceId,
          status: stripeSubscription.status,
          currentPeriodEnd: getCurrentPeriodEnd(stripeSubscription),
        })
        .onConflictDoUpdate({
          target: subscriptions.stripeSubscriptionId,
          set: {
            stripePriceId: priceId,
            status: stripeSubscription.status,
            currentPeriodEnd: getCurrentPeriodEnd(stripeSubscription),
          },
        });
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const priceId = subscription.items.data[0]?.price.id;

      await db
        .update(subscriptions)
        .set({
          status: subscription.status,
          currentPeriodEnd: getCurrentPeriodEnd(subscription),
          // Update the priceId too: a plan change (upgrade/downgrade in Customer
          // Portal) keeps the same subscription ID but swaps the price.
          ...(priceId ? { stripePriceId: priceId } : {}),
        })
        .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;

      await db
        .update(subscriptions)
        .set({ status: 'canceled' })
        .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
      break;
    }
  }

  return NextResponse.json({ received: true });
}
