'use client';

import { getPriceAnalysis } from '@/actions/price-analysis.actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { TPriceAnalysisView } from '@/services/price-analysis.service';
import { getErrorMessage } from '@/utils/error-messages.utils';
import { Sparkles } from 'lucide-react';
import { useState, useTransition } from 'react';
import { PriceAnalysisBody } from './price-analysis-body';
import {
  PriceAnalysisEmpty,
  PriceAnalysisError,
  PriceAnalysisLoading,
} from './price-analysis-states';

type Props = {
  adId: string;
};

type Status = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

export function PriceAnalysisButton({ adId }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [analysis, setAnalysis] = useState<TPriceAnalysisView | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [, startTransition] = useTransition();

  function load() {
    setStatus('loading');
    startTransition(async () => {
      const result = await getPriceAnalysis(adId);

      if ('error' in result) {
        setErrorMessage(getErrorMessage(result.error));
        setStatus('error');
        return;
      }
      if (result.kind === 'EMPTY') {
        setStatus('empty');
        return;
      }
      setAnalysis(result.analysis);
      setStatus('ready');
    });
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    // Premier affichage : on déclenche le fetch (cache BDD côté serveur, donc une
    // annonce déjà analysée ne repaie pas). Une analyse déjà chargée est conservée.
    if (next && status === 'idle') load();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full">
          <Sparkles className="size-4" />
          Voir l'analyse détaillée
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-[980px]">
        <DialogHeader className="border-b p-6">
          <DialogTitle>Analyse tarifaire avancée</DialogTitle>
          <DialogDescription>
            Positionnement du prix de l'annonce par rapport au marché des véhicules
            similaires.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(90vh-7rem)] overflow-y-auto p-6">
          {status === 'loading' && <PriceAnalysisLoading />}
          {status === 'empty' && <PriceAnalysisEmpty onRetry={load} />}
          {status === 'error' && (
            <PriceAnalysisError message={errorMessage} onRetry={load} />
          )}
          {status === 'ready' && analysis && <PriceAnalysisBody analysis={analysis} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
