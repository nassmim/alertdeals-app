import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Onglet "Installation téléphone" du dashboard settings.
export function PhoneInstallTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Installation téléphone</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Tu peux installer AlertDeals sur ton téléphone, comme ça tu peux y accéder plus
          rapidement sans passer par ton navigateur. Tu pourras aussi recevoir des
          notifications mobiles.
        </p>
        <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
          <iframe
            src="https://www.youtube.com/embed/wDgq9aiuL-w"
            title="Tutoriel installation AlertDeals sur téléphone"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
}
