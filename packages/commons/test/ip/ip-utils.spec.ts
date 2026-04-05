import {
  isIpInCidrBlock,
  isValidIpCidrBlock,
  parseIpAddressFromXForwardedFor
} from "../../src/ip/ip-utils";

test("should parse ip addresses from x-forwarded-for correctly", () => {
  expect(parseIpAddressFromXForwardedFor("10.10.100.1")).toEqual("10.10.100.1");
  expect(parseIpAddressFromXForwardedFor("111.255.255.255")).toEqual("111.255.255.255");
  expect(parseIpAddressFromXForwardedFor("111.255.255.256")).toEqual(undefined);
  expect(parseIpAddressFromXForwardedFor("10.10.100.1,10.10.100.2")).toEqual("10.10.100.1");
  expect(parseIpAddressFromXForwardedFor("10.10.100.1,garbage")).toEqual("10.10.100.1");
  expect(parseIpAddressFromXForwardedFor("2")).toEqual(undefined);
  expect(parseIpAddressFromXForwardedFor("10.10.10.10.10.10.10")).toEqual(undefined);
  expect(parseIpAddressFromXForwardedFor("2,10.10.100.1")).toEqual(undefined);
});

test("should validate IP CIDR blocks correctly", () => {
  expect(isValidIpCidrBlock("192.168.1.0/24")).toBe(true);
  expect(isValidIpCidrBlock("10.0.0.0/8")).toBe(true);
  expect(isValidIpCidrBlock("0.0.0.0/0")).toBe(true);
  expect(isValidIpCidrBlock("255.255.255.255/32")).toBe(true);
  expect(isValidIpCidrBlock("192.168.1.0")).toBe(false);
  expect(isValidIpCidrBlock("192.168.1.0/33")).toBe(false);
  expect(isValidIpCidrBlock("256.168.1.0/24")).toBe(false);
  expect(isValidIpCidrBlock("192.168.1.0/-1")).toBe(false);
  expect(isValidIpCidrBlock("not a cidr")).toBe(false);
  expect(isValidIpCidrBlock(null)).toBe(false);
  expect(isValidIpCidrBlock(undefined)).toBe(false);
  expect(isValidIpCidrBlock("")).toBe(false);
});

test("should check if an IP is within a CIDR block correctly", () => {
  expect(isIpInCidrBlock("192.168.1.100", "192.168.1.0/24")).toBe(true);
  expect(isIpInCidrBlock("10.10.10.10", "10.0.0.0/8")).toBe(true);
  expect(isIpInCidrBlock("172.16.0.1", "172.16.0.0/16")).toBe(true);
  expect(isIpInCidrBlock("192.168.1.1", "192.168.1.1/32")).toBe(true);
  expect(isIpInCidrBlock("8.8.8.8", "0.0.0.0/0")).toBe(true);
  expect(isIpInCidrBlock("192.168.2.1", "192.168.1.0/24")).toBe(false);
  expect(isIpInCidrBlock("11.0.0.1", "10.0.0.0/8")).toBe(false);
  expect(isIpInCidrBlock("192.168.1.2", "192.168.1.1/32")).toBe(false);
  expect(isIpInCidrBlock("not-an-ip", "192.168.1.0/24")).toBe(false);
  expect(isIpInCidrBlock("192.168.1.100", "not-a-cidr")).toBe(false);
  expect(isIpInCidrBlock("not-an-ip", "not-a-cidr")).toBe(false);
  expect(isIpInCidrBlock(null, "192.168.1.0/24")).toBe(false);
  expect(isIpInCidrBlock("192.168.1.100", undefined)).toBe(false);
});
