import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

const FIXTURES_DIR = path.join(__dirname, "fixtures");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writePdf(
  filename: string,
  buildFn: (doc: PDFKit.PDFDocument) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 50 });
    const stream = fs.createWriteStream(path.join(FIXTURES_DIR, filename));
    doc.pipe(stream);
    buildFn(doc);
    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

// ── Paystub 1: Biweekly, $95,000/year ──────────────────────────────────────

function generatePaystub1(doc: PDFKit.PDFDocument) {
  doc.fontSize(18).text("ACME CORPORATION", { align: "center" });
  doc.fontSize(10).text("123 Business Ave, Suite 400, San Francisco, CA 94105", {
    align: "center"
  });
  doc.moveDown();
  doc.fontSize(14).text("EARNINGS STATEMENT", { align: "center" });
  doc.moveDown();

  doc.fontSize(10);
  doc.text("Employee: Sarah J. Mitchell");
  doc.text("Employee ID: EMP-20412");
  doc.text("SSN: XXX-XX-4829");
  doc.text("Pay Period: 01/01/2025 - 01/15/2025");
  doc.text("Pay Date: 01/17/2025");
  doc.text("Pay Frequency: Biweekly");
  doc.moveDown();

  doc.fontSize(12).text("EARNINGS", { underline: true });
  doc.fontSize(10);
  doc.text("Regular Hours:       80.00 hrs  x  $45.6731/hr  =  $3,653.85");
  doc.moveDown(0.5);
  doc.text("Gross Pay (This Period):                            $3,653.85");
  doc.text("Gross Pay (YTD):                                   $3,653.85");
  doc.moveDown();

  doc.fontSize(12).text("DEDUCTIONS", { underline: true });
  doc.fontSize(10);
  doc.text("Federal Income Tax:          $548.08");
  doc.text("State Income Tax (CA):       $232.87");
  doc.text("Social Security (OASDI):     $226.54");
  doc.text("Medicare:                     $52.98");
  doc.text("401(k) Employee (6%):        $219.23");
  doc.text("Health Insurance:             $187.50");
  doc.text("Dental Insurance:              $22.00");
  doc.moveDown(0.5);
  doc.text("Total Deductions:                                  $1,489.20");
  doc.moveDown();

  doc.fontSize(12).text("NET PAY", { underline: true });
  doc.fontSize(10);
  doc.text("Net Pay (This Period):                             $2,164.65");
  doc.text("Net Pay (YTD):                                     $2,164.65");
  doc.moveDown();
  doc.text("Direct Deposit: Chase Bank ****7721                $2,164.65");
}

// ── Paystub 2: Monthly, $120,000/year ───────────────────────────────────────

function generatePaystub2(doc: PDFKit.PDFDocument) {
  doc.fontSize(16).text("TechForward Inc.", { align: "center" });
  doc.fontSize(9).text("One Market Street, Floor 22, San Francisco, CA 94111", {
    align: "center"
  });
  doc.moveDown();
  doc.fontSize(13).text("Pay Statement", { align: "center" });
  doc.moveDown();

  doc.fontSize(10);
  doc.text("Name: James R. Chen");
  doc.text("Department: Engineering");
  doc.text("Title: Senior Software Engineer");
  doc.text("Period: March 1, 2025 - March 31, 2025");
  doc.text("Check Date: March 31, 2025");
  doc.text("Pay Schedule: Monthly");
  doc.moveDown();

  doc.fontSize(11).text("Compensation", { underline: true });
  doc.fontSize(10);
  doc.text("Base Salary:                                       $10,000.00");
  doc.moveDown(0.5);
  doc.text("Current Gross:                                     $10,000.00");
  doc.text("YTD Gross:                                         $30,000.00");
  doc.moveDown();

  doc.fontSize(11).text("Withholdings & Deductions", { underline: true });
  doc.fontSize(10);
  doc.text("Federal Tax:                 $1,665.00");
  doc.text("CA State Tax:                  $730.00");
  doc.text("Social Security:               $620.00");
  doc.text("Medicare:                      $145.00");
  doc.text("Medical (PPO):                 $275.00");
  doc.text("Vision:                         $12.50");
  doc.text("401(k) (8%):                   $800.00");
  doc.text("Roth 401(k) (2%):              $200.00");
  doc.moveDown(0.5);
  doc.text("Total Deductions:                                  $4,447.50");
  doc.moveDown();

  doc.fontSize(11).text("Net Pay", { underline: true });
  doc.fontSize(10);
  doc.text("Take-Home Pay:                                     $5,552.50");
}

// ── Paystub 3: Weekly, $78,000/year ─────────────────────────────────────────

function generatePaystub3(doc: PDFKit.PDFDocument) {
  doc.fontSize(16).text("GREENLEAF SERVICES LLC", { align: "center" });
  doc.fontSize(9).text("800 Oak Blvd, Portland, OR 97201", { align: "center" });
  doc.moveDown();
  doc.fontSize(12).text("PAYROLL CHECK STUB", { align: "center" });
  doc.moveDown();

  doc.fontSize(10);
  doc.text("Employee Name: Maria L. Torres");
  doc.text("Employee #: GL-0893");
  doc.text("Week Ending: 02/07/2025");
  doc.text("Check #: 44219");
  doc.text("Frequency: Weekly");
  doc.moveDown();

  doc.text("─".repeat(60));
  doc.text("HOURS AND EARNINGS");
  doc.text("Regular     40.00 hrs    $37.50/hr       $1,500.00");
  doc.text("─".repeat(60));
  doc.text("GROSS PAY                                 $1,500.00");
  doc.text("YTD GROSS                                 $9,000.00");
  doc.moveDown();

  doc.text("TAX WITHHOLDINGS");
  doc.text("Federal Income Tax                          $195.00");
  doc.text("OR State Income Tax                         $120.00");
  doc.text("Social Security                              $93.00");
  doc.text("Medicare                                     $21.75");
  doc.moveDown();
  doc.text("OTHER DEDUCTIONS");
  doc.text("Health Insurance                             $92.31");
  doc.text("HSA Contribution                             $50.00");
  doc.text("─".repeat(60));
  doc.text("TOTAL DEDUCTIONS                            $572.06");
  doc.text("NET PAY                                     $927.94");
}

// ── W-2 Form (Acme Corp for Sarah Mitchell, same as paystub 1) ────────────

function generateW2(doc: PDFKit.PDFDocument) {
  doc.fontSize(16).text("Form W-2  Wage and Tax Statement  2024", {
    align: "center"
  });
  doc.moveDown();

  doc.fontSize(10);
  doc.text("a  Employee's social security number: XXX-XX-4829");
  doc.moveDown(0.5);
  doc.text("b  Employer identification number (EIN): 94-3218765");
  doc.moveDown(0.5);
  doc.text("c  Employer's name, address, and ZIP code:");
  doc.text("   ACME CORPORATION");
  doc.text("   123 Business Ave, Suite 400");
  doc.text("   San Francisco, CA 94105");
  doc.moveDown(0.5);
  doc.text("e  Employee's first name and initial:  Sarah J.");
  doc.text("   Last name:  Mitchell");
  doc.text("   Address: 456 Residential Lane, Apt 7B");
  doc.text("            San Francisco, CA 94102");
  doc.moveDown();

  doc.fontSize(11).text("Wage and Tax Data", { underline: true });
  doc.fontSize(10);
  doc.text("1   Wages, tips, other compensation:          $95,000.00");
  doc.text("2   Federal income tax withheld:              $14,250.00");
  doc.text("3   Social security wages:                    $95,000.00");
  doc.text("4   Social security tax withheld:              $5,890.00");
  doc.text("5   Medicare wages and tips:                  $95,000.00");
  doc.text("6   Medicare tax withheld:                     $1,377.50");
  doc.moveDown(0.5);
  doc.text("12a Code D - 401(k):                          $5,700.00");
  doc.text("12b Code DD - Health insurance:                $4,875.00");
  doc.moveDown(0.5);
  doc.text("16  State wages, tips, etc.:                  $95,000.00");
  doc.text("17  State income tax:                          $6,055.00");
  doc.text("18  Local wages, tips, etc.:                  $95,000.00");
}

// ── Offer Letter ($95,000/year for Sarah Mitchell) ─────────────────────────

function generateOfferLetter(doc: PDFKit.PDFDocument) {
  doc.fontSize(16).text("ACME CORPORATION", { align: "center" });
  doc.fontSize(10).text("123 Business Ave, Suite 400, San Francisco, CA 94105", {
    align: "center"
  });
  doc.moveDown(2);

  doc.fontSize(10);
  doc.text("November 15, 2024");
  doc.moveDown();
  doc.text("Sarah J. Mitchell");
  doc.text("456 Residential Lane, Apt 7B");
  doc.text("San Francisco, CA 94102");
  doc.moveDown();

  doc.text("Dear Sarah,");
  doc.moveDown();
  doc.text(
    "We are pleased to offer you the position of Product Manager at ACME Corporation. " +
      "We believe your experience and skills will be a valuable addition to our team.",
    { lineGap: 4 }
  );
  doc.moveDown();

  doc.text("The details of your offer are as follows:", { lineGap: 4 });
  doc.moveDown();
  doc.text("Position: Product Manager");
  doc.text("Department: Product");
  doc.text("Reports To: VP of Product, David Park");
  doc.text("Start Date: January 2, 2025");
  doc.text("Employment Type: Full-time, Exempt");
  doc.moveDown();

  doc.fontSize(11).text("Compensation", { underline: true });
  doc.fontSize(10);
  doc.text(
    "Your annual base salary will be $95,000.00, paid on a biweekly basis " +
      "(26 pay periods per year). Your per-period gross pay will be approximately $3,653.85."
  );
  doc.moveDown();

  doc.text(
    "You will be eligible for an annual performance bonus of up to 10% of your base salary, " +
      "subject to company and individual performance targets."
  );
  doc.moveDown();

  doc.fontSize(11).text("Benefits", { underline: true });
  doc.fontSize(10);
  doc.text("- Medical, dental, and vision insurance (employee contribution applies)");
  doc.text("- 401(k) retirement plan with 4% company match");
  doc.text("- 15 days PTO + 10 company holidays");
  doc.text("- $1,500 annual professional development stipend");
  doc.moveDown(2);

  doc.text("Sincerely,");
  doc.moveDown();
  doc.text("Jennifer Wu");
  doc.text("Director of People Operations");
  doc.text("ACME CORPORATION");
}

// ── Employment Verification Letter (TechForward for James Chen) ────────────

function generateEmploymentVerification(doc: PDFKit.PDFDocument) {
  doc.fontSize(16).text("TechForward Inc.", { align: "center" });
  doc.fontSize(9).text("One Market Street, Floor 22, San Francisco, CA 94111", {
    align: "center"
  });
  doc.moveDown(2);

  doc.fontSize(10);
  doc.text("February 20, 2025");
  doc.moveDown();
  doc.text("To Whom It May Concern,");
  doc.moveDown();
  doc.text(
    "This letter is to confirm that James R. Chen is currently employed at TechForward Inc. " +
      "as a Senior Software Engineer in the Engineering department.",
    { lineGap: 4 }
  );
  doc.moveDown();
  doc.text("Employment details are as follows:");
  doc.moveDown();
  doc.text("Employee Name: James R. Chen");
  doc.text("Title: Senior Software Engineer");
  doc.text("Department: Engineering");
  doc.text("Date of Hire: June 15, 2022");
  doc.text("Employment Status: Full-time");
  doc.text("Current Annual Salary: $120,000.00");
  doc.moveDown();
  doc.text(
    "If you require any additional information, please do not hesitate to contact our " +
      "Human Resources department at hr@techforward.com or (415) 555-0192.",
    { lineGap: 4 }
  );
  doc.moveDown(2);
  doc.text("Best regards,");
  doc.moveDown();
  doc.text("Amanda Liu");
  doc.text("HR Business Partner");
  doc.text("TechForward Inc.");
}

export async function generateAllFixtures(): Promise<string[]> {
  ensureDir(FIXTURES_DIR);

  const files = [
    { name: "paystub-acme-biweekly.pdf", fn: generatePaystub1 },
    { name: "paystub-techforward-monthly.pdf", fn: generatePaystub2 },
    { name: "paystub-greenleaf-weekly.pdf", fn: generatePaystub3 },
    { name: "w2-acme-2024.pdf", fn: generateW2 },
    { name: "offer-letter-acme.pdf", fn: generateOfferLetter },
    { name: "employment-verification-techforward.pdf", fn: generateEmploymentVerification }
  ];

  for (const file of files) {
    await writePdf(file.name, file.fn);
  }

  return files.map((f) => path.join(FIXTURES_DIR, f.name));
}

// Allow running standalone
if (require.main === module) {
  generateAllFixtures().then((files) => {
    console.log("Generated fixtures:");
    files.forEach((f) => console.log(`  ${f}`));
  });
}
