import {z} from "zod";

export const DocumentClassificationSchema = z.object({
  documentType: z.enum([
    "paystub",
    "w2",
    "offer_letter",
    "employment_verification",
    "tax_return",
    "unknown"
  ]),
  employeeName: z.string(),
  employerName: z.string(),
  confidence: z.number().min(0).max(1)
});

export type DocumentClassification = z.infer<
  typeof DocumentClassificationSchema
>;

export const PayDataExtractionSchema = z.object({
  documentType: z.string(),
  employeeName: z.string(),
  employerName: z.string(),
  payPeriod: z.string().nullable(),
  payFrequency: z
    .enum(["weekly", "biweekly", "semi_monthly", "monthly", "annual", "unknown"])
    .nullable(),
  grossPayThisPeriod: z.number().nullable(),
  grossPayYtd: z.number().nullable(),
  annualSalaryStated: z.number().nullable(),
  hourlyRate: z.number().nullable(),
  hoursWorked: z.number().nullable()
});

export type PayDataExtraction = z.infer<typeof PayDataExtractionSchema>;

export const SalaryCalculationSchema = z.object({
  annualSalary: z.number(),
  confidence: z.number().min(0).max(1),
  methodology: z.string(),
  employeeName: z.string(),
  employerName: z.string(),
  documentsAnalyzed: z.number(),
  breakdown: z.array(
    z.object({
      source: z.string(),
      derivedAnnualSalary: z.number().nullable(),
      notes: z.string()
    })
  )
});

export type SalaryCalculation = z.infer<typeof SalaryCalculationSchema>;
