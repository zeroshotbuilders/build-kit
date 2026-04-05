import { validate } from "class-validator";
import { IsSafeString } from "../../src/decorators/is-safe-string";

class TestClass {
  @IsSafeString()
  text: string;

  constructor(text: string) {
    this.text = text;
  }
}

describe("IsSafeString", () => {
  it("should pass validation for normal strings", async () => {
    const normalStrings = [
      "This is a normal string",
      "This contains the word http but not as a link",
      "This contains the word www but not as a link",
      "This contains square brackets [] but not as a markdown link",
      "This contains parentheses () but not as a markdown link",
      "This contains both [] and () but not together like []() for a markdown link"
    ];
    for (const str of normalStrings) {
      const testObj = new TestClass(str);
      const errors = await validate(testObj);
      expect(errors.length).toBe(0);
    }
  });

  it("should fail validation for strings with malicious links", async () => {
    const maliciousStrings = [
      "Check out http://example.com",
      "Visit https://example.com for more info",
      "Go to www.example.com",
      "Click <a href='http://example.com'>here</a>",
      "This has an HTML tag <a>link</a>",
      "This has an href attribute href='example.com'",
      "This has a markdown link [click here](http://example.com)"
    ];
    for (const str of maliciousStrings) {
      const testObj = new TestClass(str);
      const errors = await validate(testObj);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.["isSafeString"]).toBeDefined();
    }
  });

  it("should pass validation for non-string values", async () => {
    const testObj = new TestClass(null as any);
    const errors = await validate(testObj);
    expect(errors.length).toBe(0);
  });
});
