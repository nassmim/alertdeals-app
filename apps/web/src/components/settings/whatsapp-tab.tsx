'use client';

import { updateWhatsappSettings } from '@/actions/settings.actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { TAccountSettings } from '@/services/settings.service';
import type { TDetectedWhatsappGroup } from '@/services/whatsapp-group.service';
import { getErrorMessage } from '@/utils/error-messages.utils';
import { whatsappSettingsSchema, type TWhatsappSettingsData } from '@/validation-schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

type Props = {
  settings: TAccountSettings;
  detectedGroups: TDetectedWhatsappGroup[];
};

export function WhatsappTab({ settings, detectedGroups }: Props) {
  const form = useForm<TWhatsappSettingsData>({
    resolver: zodResolver(whatsappSettingsSchema),
    defaultValues: {
      whatsappPhoneNumber: settings.whatsappPhoneNumber ?? null,
      whatsappIsGroup: settings.whatsappIsGroup,
    },
  });

  // Cible WhatsApp actuelle (numéro perso ou groupe) — sert à surligner le
  // groupe sélectionné dans la liste des groupes détectés.
  const currentTarget = form.watch('whatsappPhoneNumber');

  const onSubmit = async (data: TWhatsappSettingsData) => {
    const result = await updateWhatsappSettings(data);
    if ('error' in result) {
      toast.error(getErrorMessage(result.error));
      return;
    }
    toast.success('Réglages WhatsApp enregistrés.');
  };

  // Choisit un groupe détecté comme cible des notifications : on remplit le
  // champ avec son identifiant et on coche « Groupe ». L'utilisateur n'a plus
  // qu'à enregistrer — fini le copier-coller manuel du groupId.
  const handleSelectGroup = (group: TDetectedWhatsappGroup) => {
    form.setValue('whatsappPhoneNumber', group.groupId, { shouldValidate: true });
    form.setValue('whatsappIsGroup', true, { shouldDirty: true });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>WhatsApp</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="whatsappPhoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numéro WhatsApp</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex. +33612345678"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(event) => {
                        field.onChange(event);
                        // Saisie manuelle = numéro personnel → on repasse en
                        // mode "non groupe". Le mode groupe ne s'active que via
                        // le bouton « Utiliser » d'un groupe détecté.
                        form.setValue('whatsappIsGroup', false, {
                          shouldDirty: true,
                        });
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Renseigne ton numéro personnel. Pour recevoir les alertes dans un
                    groupe, ajoute notre numéro WhatsApp à ton groupe : il apparaîtra
                    ci-dessous, clique alors sur « Utiliser ».
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Groupes détectés</span>
              </div>

              {detectedGroups.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                  Aucun groupe détecté pour l'instant. Ajoute notre numéro WhatsApp à ton
                  groupe, puis recharge cette page.
                </p>
              ) : (
                <ul className="space-y-2">
                  {detectedGroups.map((group) => {
                    const isSelected = currentTarget === group.groupId;
                    return (
                      <li
                        key={group.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
                      >
                        <span className="min-w-0 truncate text-sm">
                          {group.groupName ?? 'Groupe sans nom'}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant={isSelected ? 'secondary' : 'outline'}
                          onClick={() => handleSelectGroup(group)}
                          disabled={isSelected}
                        >
                          {isSelected ? (
                            <>
                              <Check className="size-4" />
                              Sélectionné
                            </>
                          ) : (
                            'Utiliser'
                          )}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
