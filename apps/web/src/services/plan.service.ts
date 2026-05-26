import { stripe } from '@/lib/stripe';
import type Stripe from 'stripe';

export type TPlan = {
  productId: string;
  productName: string;
  productDescription: string | null;
  priceId: string;
  unitAmount: number | null;
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year' | null;
};

/**
 * Lists subscription plans live from Stripe.
 *
 * Returned plans are filtered to active recurring prices with active products.
 */
export async function getMainPlans(): Promise<TPlan[]> {
  // Expand `product` so we get name/description in a single round-trip.
  const prices = await stripe.prices.list({
    active: true,
    type: 'recurring',
    expand: ['data.product'],
    limit: 100,
  });

  return prices.data
    .filter((price) => {
      const product = price.product as Stripe.Product | Stripe.DeletedProduct;
      return !('deleted' in product) && product.active;
    })
    .map((price) => {
      const product = price.product as Stripe.Product;
      return {
        productId: product.id,
        productName: product.name,
        productDescription: product.description,
        priceId: price.id,
        unitAmount: price.unit_amount,
        currency: price.currency,
        interval: price.recurring?.interval ?? null,
      };
    });
}
