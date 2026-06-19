import { getUser } from '@/actions/auth.actions';
import { SettingsView } from '@/components/settings/settings-view';
import { getAccountSettings } from '@/services/settings.service';
import { getDetectedWhatsappGroups } from '@/services/whatsapp-group.service';

export default async function SettingsPage() {
  const [settings, detectedGroups, user] = await Promise.all([
    getAccountSettings(),
    getDetectedWhatsappGroups(),
    getUser(),
  ]);
  return (
    <SettingsView
      settings={settings}
      detectedGroups={detectedGroups}
      currentEmail={user?.email ?? ''}
    />
  );
}
