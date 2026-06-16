'use server';

import { getCurrentAccountId } from '@/services/account.service';
import {
  getOrCreatePriceAnalysis,
  type TPriceAnalysisResult,
} from '@/services/price-analysis.service';
import {
  EAccountErrorCode,
  EGeneralErrorCode,
  EPriceAnalysisErrorCode,
  type TErrorCode,
} from '@alertdeals/shared';
import { z } from 'zod';

// Codes connus re-émis tels quels à travers la frontière action → client.
const KNOWN_ERROR_CODES = new Set<string>([
  ...Object.values(EGeneralErrorCode),
  ...Object.values(EAccountErrorCode),
  ...Object.values(EPriceAnalysisErrorCode),
]);

function toActionError(error: unknown): { error: TErrorCode } {
  if (error instanceof Error && KNOWN_ERROR_CODES.has(error.message)) {
    return { error: error.message as TErrorCode };
  }
  return { error: EGeneralErrorCode.UNKNOWN_ERROR };
}

const adIdSchema = z.string().uuid();

export type TGetPriceAnalysisResult = TPriceAnalysisResult | { error: TErrorCode };

export async function getPriceAnalysis(
  adId: string,
): Promise<TGetPriceAnalysisResult> {
  try {
    // Garde d'authentification : la feature est réservée aux comptes connectés.
    await getCurrentAccountId();

    const parsed = adIdSchema.safeParse(adId);
    if (!parsed.success) {
      return { error: EGeneralErrorCode.VALIDATION_FAILED };
    }

    return await getOrCreatePriceAnalysis(parsed.data);
  } catch (error) {
    return toActionError(error);
  }
}
