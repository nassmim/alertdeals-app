import { AlertForm } from '@/components/alerts/alert-form';
import { getUserAccount } from '@/services/account.service';
import { getAlertById } from '@/services/alert.service';
import { getBrands, getVehicleModels } from '@/services/ad-reference.service';
import { canCreateAlert } from '@/services/trial.service';
import { notFound } from 'next/navigation';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditAlertPage({ params }: Props) {
  const { id } = await params;

  const account = await getUserAccount();

  // hasFullAccess = active subscription OR ongoing trial — drives whether the form
  // shows the paywall CTA instead of the alert fields.
  const [alert, brands, vehicleModels, hasFullAccess] = await Promise.all([
    getAlertById(id).catch(() => null),
    getBrands(),
    getVehicleModels(),
    canCreateAlert(account.id),
  ]);

  if (!alert) notFound();

  return (
    <div className="px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-white">Modifier l'alerte</h1>
      <AlertForm
        brands={brands}
        vehicleModels={vehicleModels}
        hasFullAccess={hasFullAccess}
        alert={alert}
      />
    </div>
  );
}
