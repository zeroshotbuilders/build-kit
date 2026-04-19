import {
  Agent,
  AgenticWorkflow,
  AgentRunResult,
  AI_AGENT_SERVICE,
  AiAgentService
} from "@zeroshotbuilders/agentic-workflows";
import { Inject, Injectable } from "@nestjs/common";
import { createLogger, transports } from "winston";
import {
  DocumentClassification,
  DocumentClassificationSchema,
  PayDataExtraction,
  PayDataExtractionSchema,
  SalaryCalculation
} from "./salary-extraction-schemas";

const PERIODS_PER_YEAR: Record<string, number> = {
  weekly: 52,
  biweekly: 26,
  semi_monthly: 24,
  monthly: 12,
  annual: 1
};

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

  async extractSalary(
    documents: Array<{ filename: string; text: string }>
  ): Promise<SalaryCalculation> {
    // Phase 1: Classify all documents
    const classifications = await Promise.all(
      documents.map(async (doc) => {
        const result = await this.classifyDocument(doc.filename, doc.text);
        return { ...doc, classification: result.output };
      })
    );

    // Phase 2: Extract pay data from each document
    const extractions = await Promise.all(
      classifications.map(async (doc) => {
        const result = await this.extractPayData(
          doc.classification?.documentType ?? "unknown",
          doc.filename,
          doc.text
        );
        return { filename: doc.filename, extraction: result.output };
      })
    );

    // Phase 3: Calculate annual salary deterministically
    return this.calculateSalary(extractions);
  }

  private calculateSalary(
    extractions: Array<{ filename: string; extraction: PayDataExtraction }>
  ): SalaryCalculation {
    const breakdown: SalaryCalculation["breakdown"] = [];
    let bestSalary: number | null = null;
    let bestConfidence = 0;
    let methodology = "";
    let employeeName = "";
    let employerName = "";

    for (const { filename, extraction } of extractions) {
      if (!employeeName && extraction.employeeName) {
        employeeName = extraction.employeeName;
      }
      if (!employerName && extraction.employerName) {
        employerName = extraction.employerName;
      }

      let derived: number | null = null;
      let notes = "";

      // Priority 1: Directly stated annual salary (pick the highest across docs)
      if (extraction.annualSalaryStated != null) {
        derived = extraction.annualSalaryStated;
        notes = `Directly stated annual salary: $${derived.toLocaleString()}`;
        if (bestConfidence < 1 || derived > (bestSalary ?? 0)) {
          bestSalary = derived;
          bestConfidence = 1;
          methodology = `Directly stated in ${filename}`;
        }
      }

      // Priority 2: Gross pay * periods per year
      if (
        derived == null &&
        extraction.grossPayThisPeriod != null &&
        extraction.payFrequency != null &&
        PERIODS_PER_YEAR[extraction.payFrequency] != null
      ) {
        const periods = PERIODS_PER_YEAR[extraction.payFrequency];
        derived = extraction.grossPayThisPeriod * periods;
        notes =
          `$${extraction.grossPayThisPeriod.toLocaleString()} × ` +
          `${periods} (${extraction.payFrequency}) = $${derived.toLocaleString()}`;
        if (bestConfidence < 0.9) {
          bestSalary = derived;
          bestConfidence = 0.9;
          methodology = `Period-to-annual from ${filename}: ${notes}`;
        }
      }

      // Priority 3: Hourly rate * hours * periods
      if (
        derived == null &&
        extraction.hourlyRate != null &&
        extraction.hoursWorked != null &&
        extraction.payFrequency != null &&
        PERIODS_PER_YEAR[extraction.payFrequency] != null
      ) {
        const periods = PERIODS_PER_YEAR[extraction.payFrequency];
        derived = extraction.hourlyRate * extraction.hoursWorked * periods;
        notes =
          `$${extraction.hourlyRate}/hr × ${extraction.hoursWorked}hrs × ` +
          `${periods} periods = $${derived.toLocaleString()}`;
        if (bestConfidence < 0.8) {
          bestSalary = derived;
          bestConfidence = 0.8;
          methodology = `Hourly calculation from ${filename}: ${notes}`;
        }
      }

      if (derived == null) {
        notes = "Could not derive annual salary from this document";
      }

      breakdown.push({ source: filename, derivedAnnualSalary: derived, notes });
    }

    this.logger.info("Salary calculation complete", {
      annualSalary: bestSalary,
      confidence: bestConfidence
    });

    return {
      annualSalary: bestSalary ?? 0,
      confidence: bestConfidence,
      methodology,
      employeeName,
      employerName,
      documentsAnalyzed: extractions.length,
      breakdown
    };
  }

  @Agent<DocumentClassification>({
    outputSchema: DocumentClassificationSchema
  })
  private async classifyDocument(
    filename: string,
    documentText: string
  ): Promise<AgentRunResult<DocumentClassification>> {
    return null;
  }

  @Agent<PayDataExtraction>({
    outputSchema: PayDataExtractionSchema
  })
  private async extractPayData(
    documentType: string,
    filename: string,
    documentText: string
  ): Promise<AgentRunResult<PayDataExtraction>> {
    return null;
  }
}
