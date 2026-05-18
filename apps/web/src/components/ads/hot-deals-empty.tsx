import { Button } from '@/components/ui/button';
import { pages } from '@/config/routes';
import Link from 'next/link';

type Props = {
  variant: 'no-alerts' | 'no-match';
};

const COPY = {
  'no-alerts': {
    message:
      'Vous devez créer une première alerte pour voir les opportunités matchant vos critères',
    cta: 'Créer ma première alerte',
    href: pages.alerts.new,
  },
  'no-match': {
    message: "Il n'y a aucune opportunité matchant vos critères d'alertes",
    cta: 'Modifier mes alertes',
    href: pages.alerts.list,
  },
} as const;

export function HotDealsEmpty({ variant }: Props) {
  const { message, cta, href } = COPY[variant];

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-12 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button asChild>
        <Link href={href}>{cta}</Link>
      </Button>
    </div>
  );
}
