/**
 * WhatsApp Controller
 *
 * - connectWhatsAppController : ouvre un socket Baileys, renvoie le QR (base64)
 *   à scanner depuis l'UI admin, et persiste la session encryptée dès le scan.
 *   Remplace le script CLI `pair-whatsapp.ts` pour les non-devs.
 *
 * L'accès est gardé côté web (page admin + server action). Le worker n'étant pas
 * exposé publiquement (réseau privé Railway), l'endpoint n'a pas d'auth propre —
 * cf. TODO auth dans index.ts si le worker devient public.
 */

import { EWhatsAppErrorCode } from '@alertdeals/shared';
import {
  createWhatsAppConnection,
  generateQRCodeDataURL,
  persistWhatsAppCredentials,
  QRConnectionResult,
  StoredAuthState,
} from '@alertdeals/whatsapp';
import { Request, Response } from 'express';
import {
  closeWhatsAppSocket,
  startWhatsAppListener,
} from '../services/whatsapp.service.js';

// Tentative de pairing en cours (singleton — une seule session WhatsApp pour
// toute l'instance AlertDeals). On garde le cleanup pour pouvoir couper un
// pairing précédent resté en attente de scan.
let activeConnection: { cleanup: () => void } | null = null;

/**
 * POST /api/whatsapp/connect
 *
 * Crée un socket Baileys et renvoie le premier QR code (data URL base64). Le
 * socket reste vivant en mémoire jusqu'au scan ou expiration (2 min). Au scan,
 * la session est persistée et le listener permanent est relancé avec elle.
 */
export async function connectWhatsAppController(_req: Request, res: Response) {
  // Coupe une éventuelle tentative de pairing précédente non finalisée.
  if (activeConnection) {
    activeConnection.cleanup();
    activeConnection = null;
  }

  // Le worker garde en permanence un socket ouvert (startWhatsAppListener) pour
  // capter les ajouts de groupes. On le ferme AVANT le pairing : deux sockets
  // sur le même compte WhatsApp entreraient en conflit. Il sera relancé au
  // succès (onConnected) avec la nouvelle session.
  closeWhatsAppSocket();

  let responded = false;

  try {
    // saveStateFn est rempli après le retour de createWhatsAppConnection ; les
    // handlers ferment par closure dessus (events Baileys émis en asynchrone).
    let saveStateFn: (() => StoredAuthState) | null = null;

    const connectionPromise = createWhatsAppConnection(null, {
      onQRCode: async (qrString) => {
        // Premier QR uniquement : on le renvoie en base64 à l'UI. Les QR
        // suivants (rotation Baileys) sont ignorés, le socket reste ouvert.
        if (responded) return;
        responded = true;
        try {
          const qrCode = await generateQRCodeDataURL(qrString);
          res.json({ success: true, qrCode });
        } catch (error) {
          console.error('[whatsapp/connect] QR generation failed', error);
          res.status(500).json({
            success: false,
            error: EWhatsAppErrorCode.QR_GENERATION_FAILED,
          });
        }
      },

      onConnected: async () => {
        try {
          if (!saveStateFn) return;
          await persistWhatsAppCredentials(saveStateFn());
        } catch (error) {
          console.error('[whatsapp/connect] session persist failed', error);
        } finally {
          activeConnection = null;
          // Rouvre l'écoute permanente avec la session fraîchement appairée.
          startWhatsAppListener();
        }
      },

      onDisconnected: () => {
        activeConnection = null;
        if (!responded) {
          responded = true;
          res.status(500).json({
            success: false,
            error: EWhatsAppErrorCode.CONNECTION_FAILED,
          });
        }
      },

      onError: (error) => {
        console.error('[whatsapp/connect] error', error);
        activeConnection = null;
        if (!responded) {
          responded = true;
          res.status(500).json({
            success: false,
            error: EWhatsAppErrorCode.QR_GENERATION_FAILED,
          });
        }
      },
    });

    const result: QRConnectionResult = await connectionPromise;
    saveStateFn = result.saveState;
    activeConnection = { cleanup: result.cleanup };
  } catch (error) {
    console.error('[whatsapp/connect] connection failed', error);
    activeConnection = null;
    if (!responded) {
      responded = true;
      res.status(500).json({
        success: false,
        error: EWhatsAppErrorCode.CONNECTION_FAILED,
      });
    }
  }
}
