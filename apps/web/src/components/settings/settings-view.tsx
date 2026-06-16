'use client';

import { PhoneInstallTab } from '@/components/settings/phone-install-tab';
import { WhatsappTab } from '@/components/settings/whatsapp-tab';
import type { TAccountSettings } from '@/services/settings.service';
import { cn } from '@/lib/utils';
import { MessageCircle, Smartphone } from 'lucide-react';
import { useState } from 'react';

type Tab = 'whatsapp' | 'phone-install';

type Props = {
  settings: TAccountSettings;
};

const TABS = [
  { id: 'whatsapp' as const, label: 'WhatsApp', icon: MessageCircle },
  { id: 'phone-install' as const, label: 'Installation téléphone', icon: Smartphone },
];

export function SettingsView({ settings }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('whatsapp');

  return (
    <div className="px-4 py-8">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Réglages</h1>
        <p className="text-sm text-muted-foreground">
          Configure tes canaux de notification.
        </p>
      </div>

      <div className="mb-6 border-b border-border">
        <nav className="-mb-px flex gap-6">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors',
                  active
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            );
          })}
        </nav>
      </div>

      <div>
        {activeTab === 'whatsapp' && <WhatsappTab settings={settings} />}
        {activeTab === 'phone-install' && <PhoneInstallTab />}
      </div>
    </div>
  );
}
