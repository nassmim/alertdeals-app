import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Onglet "Installation téléphone" du dashboard settings.
// L'app mobile n'est pas encore dispo : on affiche un simple message d'attente,
// pas de vidéo/tuto tant qu'il n'y a rien à installer.
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
