import { AlertForm } from '@/components/alerts/alert-form';
import { getUserAccount } from '@/services/account.service';
import { getBrands, getVehicleModels } from '@/services/ad-reference.service';
import { canCreateAlert } from '@/services/trial.service';

export default async function NewAlertPage() {
  const account = await getUserAccount();

  // hasFullAccess = active subscription OR ongoing trial — drives whether the form
  // shows the paywall CTA instead of the alert fields.
  const [brands, vehicleModels, hasFullAccess] = await Promise.all([
    getBrands(),
    getVehicleModels(),
    canCreateAlert(account.id),
  ]);

  return (
    <div className="px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-white">Créer une alerte</h1>
      <AlertForm
        brands={brands}
        vehicleModels={vehicleModels}
        hasFullAccess={hasFullAccess}
      />
    </div>
  );
}
