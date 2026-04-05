import { DateTime } from "luxon";

export function getDayOfMonth(date: number): number {
  return DateTime.fromMillis(date).get("day");
}
export function toIsoString(date: number): string {
  return new Date(date).toISOString();
}

export function fromIsoString(isoString: string): number {
  return new Date(isoString).getTime();
}
