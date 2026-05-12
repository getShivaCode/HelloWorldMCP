import figlet from "figlet";
import type { HelloFont } from "../hello-options.js";

const HELLO_HORIZONTAL_LAYOUT = "fitted" as const;

/** `line` = spoken greeting; `ascii` = figlet of **name only** (`World` if omitted). */
export function asciiHello(
  name?: string | undefined,
  opts?: { font?: HelloFont | undefined },
): { line: string; ascii: string } {
  const trimmed = (name?.trim() ?? "") || "";
  const label = trimmed.length > 0 ? trimmed : "World";
  const line = `Hello ${label}`;
  const ascii = figlet.textSync(label, {
    font: opts?.font ?? "Slant",
    horizontalLayout: HELLO_HORIZONTAL_LAYOUT,
  });
  return { line, ascii };
}
