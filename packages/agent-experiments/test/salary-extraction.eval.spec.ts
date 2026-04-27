import {
  SalaryExtractionAgent,
  SalaryExtractionModule
} from "@zeroshotbuilders/agent-experiments";
import { Closer } from "@zeroshotbuilders/commons";
import {
  BeforeAllTimeout,
  DoclingContainer
} from "@zeroshotbuilders/commons-testing";
import { DoclingServiceRemote } from "@zeroshotbuilders/docling-utils";
import { NestFactory } from "@nestjs/core";
import fs from "fs";
import path from "path";
import { generateAllFixtures } from "./assets/generate-fixtures";

const FIXTURES_DIR = path.join(__dirname, "assets", "fixtures");
const APPLICATION_ROOT = path.join(__dirname, "..", "assets");

jest.setTimeout(300_000);

describe("Salary Extraction Pipeline", () => {
  let agent: SalaryExtractionAgent;
  let closer: Closer;
  let doclingService: DoclingServiceRemote;
  const docling = new DoclingContainer();

  async function convertPdf(filePath: string): Promise<string> {
    const file = fs.readFileSync(filePath);
    const filename = path.basename(filePath);

    const result = await doclingService.convert({ file, filename });
    return result.content;
  }

  function loadDocuments(
    filenames: string[]
  ): Promise<Array<{ filename: string; text: string }>> {
    return Promise.all(
      filenames.map(async (filename) => ({
        filename,
        text: await convertPdf(path.join(FIXTURES_DIR, filename))
      }))
    );
  }

  beforeAll(async () => {
    await generateAllFixtures();
    await docling.start();

    doclingService = new DoclingServiceRemote({
      baseUrl: docling.getBaseUrl()
    } as any);

    const app = await NestFactory.createApplicationContext(
      SalaryExtractionModule.forApplicationRoot(APPLICATION_ROOT)
    );
    agent = app.get(SalaryExtractionAgent);

    closer = Closer.create(
      {
        resource: app,
        closingFunction: async (a) => await a.close()
      },
      {
        resource: docling,
        closingFunction: async (d) => await d.stop()
      }
    );
  }, BeforeAllTimeout);

  afterAll(async () => {
    if (closer) await closer.close();
  });

  it("should extract salary from ACME paystub + W-2 + offer letter", async () => {
    const documents = await loadDocuments([
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
    const documents = await loadDocuments([
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
    const documents = await loadDocuments(["paystub-greenleaf-weekly.pdf"]);

    const result = await agent.extractSalary(documents);

    console.log("Greenleaf Result:", JSON.stringify(result, null, 2));

    expect(result.annualSalary).toBeGreaterThan(82_000);
    expect(result.annualSalary).toBeLessThan(86_000);
    expect(result.employeeName).toContain("Torres");
  });

  it("should handle all documents together and pick best estimate", async () => {
    const documents = await loadDocuments([
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
