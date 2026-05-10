import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Stored next to package.json / cwd when the server runs (project root). */
const FILENAME = "hello-visitor-count.json";

export function ordinalVisitorLabel(n: number): string {
  if (n <= 0) return "You are visitor #0 (welcome!).";
  const j = n % 10;
  const k = n % 100;
  let suffix = "th";
  if (k < 11 || k > 13) {
    if (j === 1) suffix = "st";
    else if (j === 2) suffix = "nd";
    else if (j === 3) suffix = "rd";
  }
  return `You are the ${n}${suffix} visitor — welcome!`;
}

/** Increments the persisted counter and returns the new total hello count. */
export function bumpVisitorCount(): number {
  const path = join(process.cwd(), FILENAME);
  let count = 0;
  if (existsSync(path)) {
    try {
      const raw = JSON.parse(readFileSync(path, "utf8")) as { count?: unknown };
      if (typeof raw.count === "number" && Number.isFinite(raw.count)) {
        count = Math.max(0, Math.floor(raw.count));
      }
    } catch {
      /* keep count at 0 */
    }
  }
  count += 1;
  writeFileSync(path, JSON.stringify({ count }, null, 2), "utf8");
  return count;
}
