/**
 * AccessState mirrors unlock-related columns
 * on the `users` table.
 */
export type AccessState = {
  hasPaidForPlan?: boolean;
  filingClient?: boolean;
};

/**
 * Determines whether a user has full access
 * to paid tax planning features.
 *
 * A user is unlocked if:
 * - They paid for the plan (Drake Pay / invoice), OR
 * - They are a filing client (auto-included)
 */
export function isUnlocked(access: AccessState): boolean {
  return Boolean(
    access?.hasPaidForPlan || access?.filingClient
  );
}
