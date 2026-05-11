/**
 * Allowed figlet fonts for **`hello`** / widget. Must match bundled figlet names.
 */
export const HELLO_FONTS = [
  "Slant",
  "Cricket",
  "Doom",
  "Ghost",
  "Standard",
  "USA Flag",
  "Letters",
] as const;

export type HelloFont = (typeof HELLO_FONTS)[number];
