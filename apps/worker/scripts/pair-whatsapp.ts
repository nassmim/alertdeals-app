/**
 * One-shot pairing CLI : à lancer UNE FOIS pour appairer le numéro central
 * AlertDeals à WhatsApp. Affiche un QR dans le terminal, le boss scanne
 * depuis WhatsApp → Paramètres → Appareils connectés → Lier un appareil, et
 * la session encryptée est sauvée dans `whatsapp_sessions`.
 *
 * Usage : pnpm pair-whatsapp
 * À ré-exécuter uniquement si la session est révoquée (loggedOut, etc.).
 */

import {
  createWhatsAppConnection,
  persistWhatsAppCredentials,
  QRConnectionResult,
  WhatsAppEventHandlers,
} from "@alertdeals/whatsapp";
import qrcodeTerminal from "qrcode-terminal";

async function main() {
  // Référence remplie après le retour de createWhatsAppConnection. Les
  // handlers ferment par closure dessus, et ne se déclenchent qu'après
  // (les events Baileys sont émis de manière asynchrone).
  let connection: QRConnectionResult | null = null;

  const handlers: WhatsAppEventHandlers = {
    onQRCode: (qr) => {
      qrcodeTerminal.generate(qr, { small: true });
    },
    onConnected: async () => {
      if (!connection) {
        console.error(
          "[pair] onConnected déclenché avant que la connexion soit prête",
        );
        process.exit(1);
      }
      try {
        // saveState() encrypte l'état courant — on l'appelle ICI (post-connect)
        // pour capter les `creds.update` émis pendant la finalisation du
        // pairing, et pas un état trop précoce.
        const state = connection.saveState();
        await persistWhatsAppCredentials(state);
        connection.cleanup();
        process.exit(0);
      } catch (error) {
        console.error(
          "[pair] Échec sauvegarde session :",
          error instanceof Error ? error.message : error,
        );
        process.exit(1);
      }
    },
    onDisconnected: (reason) => {
      console.error("[pair] Déconnecté :", reason);
      process.exit(1);
    },
    onError: (error) => {
      console.error("[pair] Erreur :", error);
      process.exit(1);
    },
  };

  // Pair from scratch (storedState=null) — un éventuel state existant en DB
  // est ignoré, la nouvelle session écrasera l'ancienne via upsert dans
  // persistWhatsAppCredentials.
  connection = await createWhatsAppConnection(null, handlers);
}

main().catch((error) => {
  console.error(
    "[pair] Fatal :",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
