import {djb2Hash, hashString, randomBytes, sha256} from "@zeroshotbuilders/commons";
import * as randomstring from "randomstring";

describe("hashing utils", () => {
  it("should hash a string", async () => {
    const input1 = randomstring.generate(10);
    const input2 = randomstring.generate(10);
    const hash1 = await hashString(input1);
    const hash2 = await hashString(input2);
    expect(hash1).toBeDefined();
    expect(hash2).toBeDefined();
    expect(hash1).not.toEqual(hash2);
  });

  it("should hash a string using djb2", () => {
    const input1 = randomstring.generate(10);
    const input2 = randomstring.generate(10);
    const hash1 = djb2Hash(input1);
    const hash2 = djb2Hash(input2);
    expect(hash1).toBeDefined();
    expect(hash2).toBeDefined();
    expect(hash1).not.toEqual(hash2);
  });

  it("should hash a string using sha256", () => {
    const input = randomstring.generate(10);
    const hash = sha256(input);
    expect(hash).toBeDefined();
    expect(hash.length).toEqual(64);
  });

  it("should properly generate random bytes", () => {
    const bytes1 = randomBytes(32);
    const bytes2 = randomBytes(32);
    expect(bytes1.length).toEqual(64);
    expect(bytes2.length).toEqual(64);
    expect(bytes1).not.toEqual(bytes2);
  });
});
