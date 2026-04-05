export function parseIpAddressFromXForwardedFor(
  ipAddressFromXForwardedFor?: string
): string | undefined {
  // Value could be an array of values, comma separated.
  const maybeIpAddress = ipAddressFromXForwardedFor?.split(",")[0].trim();
  return maybeIpAddress && isValidIpAddress(maybeIpAddress)
    ? maybeIpAddress
    : undefined;
}

function isValidIpAddress(ipAddress: string): boolean {
  if (!ipAddress) {
    return false;
  }
  const ipRegex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ipAddress);
}

export function isValidIpCidrBlock(cidrBlock: string): boolean {
  if (!cidrBlock) {
    return false;
  }
  const cidrRegex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/;
  return cidrRegex.test(cidrBlock);
}

function ipToLong(ip: string): number {
  return (
    ip.split(".").reduce((acc, octet) => {
      return (acc << 8) + parseInt(octet, 10);
    }, 0) >>> 0
  );
}

export function isIpInCidrBlock(ipAddress: string, cidrBlock: string): boolean {
  if (!isValidIpAddress(ipAddress) || !isValidIpCidrBlock(cidrBlock)) {
    return false;
  }

  const [cidrIp, prefixStr] = cidrBlock.split("/");
  const prefix = parseInt(prefixStr, 10);

  // A prefix of 0 is a special case that matches all IPs. The bitwise operations
  // below do not work correctly for a prefix of 0 in JS, so we handle it separately.
  if (prefix === 0) {
    return true;
  }

  const ipLong = ipToLong(ipAddress);
  const cidrIpLong = ipToLong(cidrIp);

  // Create a mask of 'prefix' bits
  const mask = (-1 << (32 - prefix)) >>> 0;

  return (ipLong & mask) === (cidrIpLong & mask);
}
