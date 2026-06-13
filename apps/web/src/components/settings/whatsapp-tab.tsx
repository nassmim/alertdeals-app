'use client';

import { updateWhatsappSettings } from '@/actions/settings.actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
                  <FormLabel>Numéro / ID WhatsApp</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex. +33612345678 ou ID du groupe"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Renseigne ton numéro personnel. Pour notifier un groupe, ajoute notre
                    numéro WhatsApp à ton groupe : il apparaîtra automatiquement ci-dessous
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="whatsappIsGroup"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-3 space-y-0 rounded-lg border border-border bg-card p-3">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-0.5">
                    <FormLabel className="cursor-pointer">Groupe</FormLabel>
                    <FormDescription>
                      Coche si l'identifiant ci-dessus est celui d'un groupe WhatsApp (sinon,
                      laisse décoché pour un numéro personnel).
                    </FormDescription>
                  </div>
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
