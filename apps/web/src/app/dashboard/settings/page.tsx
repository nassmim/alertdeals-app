import { SettingsView } from '@/components/settings/settings-view';
import { getAccountSettings } from '@/services/settings.service';
import { getDetectedWhatsappGroups } from '@/services/whatsapp-group.service';

export default async function SettingsPage() {
  const [settings, detectedGroups] = await Promise.all([
    getAccountSettings(),
    getDetectedWhatsappGroups(),
  ]);
  return <SettingsView settings={settings} detectedGroups={detectedGroups} />;
}
