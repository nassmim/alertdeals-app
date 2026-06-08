import { SettingsView } from '@/components/settings/settings-view';
import { getAccountSettings } from '@/services/settings.service';

export default async function SettingsPage() {
  const settings = await getAccountSettings();
  return <SettingsView settings={settings} />;
}
