import {
  SalaryExtractionAgent,
  SalaryExtractionModule
} from "@zeroshotbuilders/agent-experiments";
import { NestFactory } from "@nestjs/core";
import { execFileSync } from "child_process";
import path from "path";
import { generateAllFixtures } from "./assets/generate-fixtures";

const FIXTURES_DIR = path.join(__dirname, "assets", "fixtures");
const EXTRACT_SCRIPT = path.join(__dirname, "assets", "extract-pdf-text.mjs");
const APPLICATION_ROOT = path.join(__dirname, "..", "assets");

function readPdf(filePath: string): string {
  return execFileSync("node", [EXTRACT_SCRIPT, filePath], {
    encoding: "utf-8",
    timeout: 15_000
  });
}

function loadDocuments(
  filenames: string[]
): Array<{ filename: string; text: string }> {
  return filenames.map((filename) => ({
    filename,
    text: readPdf(path.join(FIXTURES_DIR, filename))
  }));
}

jest.setTimeout(300_000);

describe("Salary Extraction Pipeline", () => {
  let agent: SalaryExtractionAgent;
  let app: any;

  beforeAll(async () => {
    await generateAllFixtures();

    app = await NestFactory.createApplicationContext(
      SalaryExtractionModule.forApplicationRoot(APPLICATION_ROOT)
    );
    agent = app.get(SalaryExtractionAgent);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it("should extract salary from ACME paystub + W-2 + offer letter", async () => {
    const documents = loadDocuments([
      "paystub-acme-biweekly.pdf",
      "w2-acme-2024.pdf",
      "offer-letter-acme.pdf"
    ]);

    const result = await agent.extractSalary(documents);

    console.log("ACME Result:", JSON.stringify(result, null, 2));

    expect(result.annualSalary).toBeGreaterThan(90_000);
    expect(result.annualSalary).toBeLessThan(100_000);
    expect(result.employeeName).toContain("Mitchell");
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.documentsAnalyzed).toBe(3);
  });

  it("should extract salary from TechForward monthly paystub + verification letter", async () => {
    const documents = loadDocuments([
      "paystub-techforward-monthly.pdf",
      "employment-verification-techforward.pdf"
    ]);

    const result = await agent.extractSalary(documents);

    console.log("TechForward Result:", JSON.stringify(result, null, 2));

    expect(result.annualSalary).toBeGreaterThan(115_000);
    expect(result.annualSalary).toBeLessThan(125_000);
    expect(result.employeeName).toContain("Chen");
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("should extract salary from Greenleaf weekly paystub alone", async () => {
    const documents = loadDocuments(["paystub-greenleaf-weekly.pdf"]);

    const result = await agent.extractSalary(documents);

    console.log("Greenleaf Result:", JSON.stringify(result, null, 2));

    expect(result.annualSalary).toBeGreaterThan(74_000);
    expect(result.annualSalary).toBeLessThan(82_000);
    expect(result.employeeName).toContain("Torres");
  });

  it("should handle all documents together and pick best estimate", async () => {
    const documents = loadDocuments([
      "paystub-acme-biweekly.pdf",
      "w2-acme-2024.pdf",
      "offer-letter-acme.pdf",
      "paystub-techforward-monthly.pdf",
      "employment-verification-techforward.pdf",
      "paystub-greenleaf-weekly.pdf"
    ]);

    const result = await agent.extractSalary(documents);

    console.log("All Documents Result:", JSON.stringify(result, null, 2));

    expect(result.annualSalary).toBeGreaterThan(0);
    expect(result.breakdown.length).toBeGreaterThan(0);
    expect(result.methodology).toBeTruthy();
  });
});
