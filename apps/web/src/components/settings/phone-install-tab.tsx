import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Onglet "Installation téléphone" du dashboard settings.
export function PhoneInstallTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Installation téléphone</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          AlertDeals bientôt en application mobile. Tu seras alerté dès que c'est
          disponible !
        </p>
      </CardContent>
    </Card>
  );
}
