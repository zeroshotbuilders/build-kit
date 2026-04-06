import {
  AgenticWorkflow,
  Agent,
  AgentRunResult,
  AiAgentService,
  AI_AGENT_SERVICE
} from "@zeroshotbuilders/agentic-workflows";
import { Inject, Injectable } from "@nestjs/common";
import { createLogger, transports } from "winston";
import { z } from "zod";

// ── Output Schemas ──────────────────────────────────────────────────────────

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

// ── Agent Pipeline ──────────────────────────────────────────────────────────

@AgenticWorkflow({
  promptsDirectory: `${__dirname}/prompts`
})
@Injectable()
export class SalaryExtractionAgent {
  private readonly logger = createLogger({
    transports: [new transports.Console()]
  });

  constructor(
    @Inject(AI_AGENT_SERVICE)
    private readonly aiAgentService: AiAgentService
  ) {}

  /**
   * Main pipeline entry point: takes an array of document texts and returns
   * the computed annual salary.
   */
  async extractSalary(
    documents: Array<{ filename: string; text: string }>
  ): Promise<SalaryCalculation> {
    this.logger.info(
      `Starting salary extraction pipeline with ${documents.length} documents`
    );

    // Phase 1: Classify all documents
    const classifications = await Promise.all(
      documents.map(async (doc) => {
        const result = await this.classifyDocument(doc.filename, doc.text);
        if (!result.success) {
          this.logger.warn(
            `Classification failed for ${doc.filename}: ${result.error}`
          );
        }
        return { ...doc, classification: result.output };
      })
    );

    this.logger.info(
      "Classifications complete",
      classifications.map((c) => ({
        file: c.filename,
        type: c.classification?.documentType
      }))
    );

    // Phase 2: Extract pay data from each document
    const extractions = await Promise.all(
      classifications.map(async (doc) => {
        const result = await this.extractPayData(
          doc.classification?.documentType ?? "unknown",
          doc.filename,
          doc.text
        );
        if (!result.success) {
          this.logger.warn(
            `Extraction failed for ${doc.filename}: ${result.error}`
          );
        }
        return { filename: doc.filename, extraction: result.output };
      })
    );

    this.logger.info("Extractions complete");

    // Phase 3: Calculate annual salary from all extractions
    const extractionSummary = JSON.stringify(
      extractions.map((e) => ({
        filename: e.filename,
        ...e.extraction
      })),
      null,
      2
    );

    const result = await this.calculateSalary(extractionSummary);
    if (!result.success) {
      throw new Error(`Salary calculation failed: ${result.error}`);
    }

    this.logger.info("Salary calculation complete", {
      annualSalary: result.output.annualSalary,
      confidence: result.output.confidence
    });

    return result.output;
  }

  // ── Agent Methods (intercepted by decorator) ─────────────────────────────

  @Agent<DocumentClassification>({
    outputSchema: DocumentClassificationSchema
  })
  private async classifyDocument(
    filename: string,
    documentText: string
  ): Promise<AgentRunResult<DocumentClassification>> {
    return null as any;
  }

  @Agent<PayDataExtraction>({
    outputSchema: PayDataExtractionSchema
  })
  private async extractPayData(
    documentType: string,
    filename: string,
    documentText: string
  ): Promise<AgentRunResult<PayDataExtraction>> {
    return null as any;
  }

  @Agent<SalaryCalculation>({
    outputSchema: SalaryCalculationSchema
  })
  private async calculateSalary(
    extractedData: string
  ): Promise<AgentRunResult<SalaryCalculation>> {
    return null as any;
  }
}
