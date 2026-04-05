import { notEmpty } from "@zeroshotbuilders/commons";

enum LolEnum {
  UNKNOWN_LOL = "unknown_lol",
  BIG_LOL = "big_lol"
}

describe("notEmpty", () => {
  it("should return true if value is set", () => {
    const stringValue = "lol";
    expect(notEmpty(stringValue)).toBeTruthy();
    const enumValue = LolEnum.BIG_LOL;
    expect(notEmpty(enumValue)).toBeTruthy();
    const numberValue = 3;
    expect(notEmpty(numberValue)).toBeTruthy();
  });

  it("should return false if value is not set", () => {
    expect(notEmpty("")).toBeFalsy();
    expect(notEmpty(0)).toBeFalsy();
    expect(notEmpty(undefined)).toBeFalsy();
    expect(notEmpty(null)).toBeFalsy();
    expect(notEmpty(LolEnum.UNKNOWN_LOL)).toBeFalsy();
  });
});
