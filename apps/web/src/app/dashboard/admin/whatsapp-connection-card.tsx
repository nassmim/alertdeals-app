'use client';

import {
  checkWhatsAppConnected,
  initiateWhatsAppConnection,
} from '@/actions/whatsapp.actions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getErrorMessage } from '@/utils/error-messages.utils';
import type { TErrorCode } from '@alertdeals/shared';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

type Props = {
  initialIsConnected: boolean;
  initialIsDisconnected: boolean;
};

// 2 minutes — aligné sur le timeout du socket Baileys côté worker (QR_TIMEOUT_MS).
const QR_TIMEOUT_SECONDS = 120;

/**
 * Carte de connexion WhatsApp (page admin).
 *
 * Appaire le numéro central AlertDeals : un clic ouvre un socket côté worker qui
 * renvoie un QR, l'admin le scanne depuis WhatsApp, et le front poll le statut
 * jusqu'à détecter la connexion. Pas de gestion de numéro ici (singleton géré
 * par le worker), juste connexion + état.
 */
export function WhatsAppConnectionCard({
  initialIsConnected,
  initialIsDisconnected,
}: Props) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connected, setConnected] = useState(initialIsConnected);
  const [isDisconnected, setIsDisconnected] = useState(initialIsDisconnected);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const stopAll = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  // Tant qu'un QR est affiché : poll le statut de connexion + décompte
  // l'expiration du socket worker.
  useEffect(() => {
    if (!qrCode) return;

    // Poll toutes les 3s : dès que le worker a persisté la session (scan
    // réussi), isConnected passe à true.
    pollingRef.current = setInterval(async () => {
      const isConnectedNow = await checkWhatsAppConnected();
      if (isConnectedNow) {
        setConnected(true);
        setIsDisconnected(false);
        setQrCode(null);
        stopAll();
        toast.success('WhatsApp connecté');
      }
    }, 3000);

    // Décompte : à 0, le socket worker a expiré → on retire le QR pour
    // réafficher le bouton « Connecter ».
    setCountdown(QR_TIMEOUT_SECONDS);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setQrCode(null);
          stopAll();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return stopAll;
  }, [qrCode, stopAll]);

  const handleConnect = async () => {
    setLoading(true);
    setQrCode(null);

    const result = await initiateWhatsAppConnection();

    if (result.success && result.qrCode) {
      setQrCode(result.qrCode);
    } else {
      toast.error(
        result.errorCode
          ? getErrorMessage(result.errorCode as TErrorCode)
          : 'Erreur de connexion WhatsApp',
      );
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>WhatsApp</CardTitle>
        <CardDescription>
          Connecte le numéro WhatsApp central utilisé pour envoyer les alertes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statut courant */}
        {connected && !isDisconnected ? (
          <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2 text-sm font-medium text-green-500">
            <span className="size-2 rounded-full bg-green-500" />
            WhatsApp connecté
          </div>
        ) : isDisconnected ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-400">
            La session WhatsApp a été déconnectée. Reconnecte-toi en scannant un
            nouveau QR code.
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-400">
            <span className="size-2 rounded-full bg-slate-600" />
            Non connecté
          </div>
        )}

        {/* Flow QR */}
        {qrCode ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-slate-300">
              Scanne ce code avec WhatsApp sur ton téléphone
            </p>
            <div className="inline-block rounded-lg border-2 border-green-500 bg-white p-3">
              <Image
                src={qrCode}
                alt="QR Code WhatsApp"
                width={200}
                height={200}
                className="size-48"
              />
            </div>
            <p className="text-xs text-slate-400">
              WhatsApp → Paramètres → Appareils connectés → Lier un appareil
            </p>
            {countdown > 0 && (
              <p className="text-sm font-medium text-slate-300">
                Expiration dans {Math.floor(countdown / 60)}:
                {String(countdown % 60).padStart(2, '0')}
              </p>
            )}
          </div>
        ) : (
          <Button onClick={handleConnect} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Génération du QR…
              </>
            ) : connected && !isDisconnected ? (
              'Reconnecter WhatsApp'
            ) : (
              'Connecter WhatsApp'
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
