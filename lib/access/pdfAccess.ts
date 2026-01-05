import { AccessState, isUnlocked } from "./accessState";

/**
 * Determines whether the user can download
 * advanced (paid) PDFs without watermarks.
 *
 * Used for:
 * - Full tax summary PDF
 * - Quarterly payment plan PDF
 * - Safe harbor analysis PDF
 */
export function canDownloadAdvancedPdf(
  access: AccessState
): boolean {
  return isUnlocked(access);
}

/**
 * Determines whether preview PDFs
 * should include watermarks.
 *
 * Used by PDF export helpers.
 */
export function shouldWatermarkPdf(
  access: AccessState
): boolean {
  return !isUnlocked(access);
}
