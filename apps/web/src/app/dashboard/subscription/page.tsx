import { SubscriptionView } from '@/components/subscription/subscription-view';
import { getCurrentAccountId } from '@/services/account.service';
import { getMainPlans } from '@/services/plan.service';
import { getAccountSubscription } from '@/services/subscription.service';

// Server Component — fetches plans (from Stripe) and the user's current subscription in
const SubscriptionPage = async () => {
  const accountId = await getCurrentAccountId();

  const [plans, subscription] = await Promise.all([
    getMainPlans(),
    getAccountSubscription(accountId),
  ]);

  return <SubscriptionView plans={plans} subscription={subscription} />;
};

export default SubscriptionPage;
