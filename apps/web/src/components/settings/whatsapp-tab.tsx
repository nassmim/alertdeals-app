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
import { getErrorMessage } from '@/utils/error-messages.utils';
import { whatsappSettingsSchema, type TWhatsappSettingsData } from '@/validation-schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

type Props = {
  settings: TAccountSettings;
};

export function WhatsappTab({ settings }: Props) {
  const form = useForm<TWhatsappSettingsData>({
    resolver: zodResolver(whatsappSettingsSchema),
    defaultValues: {
      whatsappPhoneNumber: settings.whatsappPhoneNumber ?? null,
      whatsappIsGroup: settings.whatsappIsGroup,
    },
  });

  const onSubmit = async (data: TWhatsappSettingsData) => {
    const result = await updateWhatsappSettings(data);
    if ('error' in result) {
      toast.error(getErrorMessage(result.error));
      return;
    }
    toast.success('Réglages WhatsApp enregistrés.');
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
                    Si tu choisis « Groupe », ajoute d'abord notre numéro WhatsApp à ton
                    groupe, puis colle ici l'identifiant du groupe.
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

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
