/**
 * When `false`, all Pro-only gates are off — treat everyone as having Pro access.
 * Set to `true` when billing is wired (Stripe / PayPal / etc.).
 */
export const PAYWALL_ACTIVE = false;

export function hasPremiumAccess(
  user: { isPremium?: boolean } | null | undefined,
): boolean {
  if (!PAYWALL_ACTIVE) return true;
  return !!user?.isPremium;
}

// --- NLP Provider Configuration ---
export const NLP_PROVIDER: 'deepseek' | 'gemini' | 'local' = 'deepseek';
export const USE_LOCAL_NLP_FALLBACK = true;
