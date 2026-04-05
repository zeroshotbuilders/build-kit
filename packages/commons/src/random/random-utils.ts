export function randomInt(min?: number, max?: number): number {
  min = Math.ceil(min || 0);
  max = Math.floor(max || Number.MAX_SAFE_INTEGER);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
