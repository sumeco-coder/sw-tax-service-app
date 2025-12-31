import { z } from "zod";

export const IncomeDocumentationSchema = z.record(z.any()); // accept any keys, still forces "object"
export type IncomeDocumentationInput = z.infer<typeof IncomeDocumentationSchema>;
