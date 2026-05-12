import {
  error,
  markdown,
  mix,
  object,
  type McpServerInstance,
} from "mcp-use/server";
import { z } from "zod";
import type { HelloFont } from "../hello-options.js";
import { HELLO_FONTS } from "../hello-options.js";
import { asciiHello } from "./ascii-hello.js";

export const helloOutputSchema = z.object({
  line: z
    .string()
    .describe("Plain greeting: `Hello {name}` or `Hello World` when name is omitted."),
  ascii: z
    .string()
    .describe(
      "FIGlet rendering of the **name** only (horizontal fitted); not the full greeting.",
    ),
});

/**
 * Literal union (not cached `enum`) rebuilt each load — `mcp-use` HMR sometimes skipped
 * refreshing **hello** when only `hello-options.ts` changed, leaving stale validators.
 */
const helloFontSchema = z
  .union(
    HELLO_FONTS.map((f) => z.literal(f)) as [
      z.ZodLiteral<HelloFont>,
      z.ZodLiteral<HelloFont>,
      ...z.ZodLiteral<HelloFont>[],
    ],
  )
  .default("Slant")
  .describe("Bundled figlet font (default **Slant**). Allowed: " + HELLO_FONTS.join(", ") + ".");

const helloInputSchema = z.object({
  name: z
    .string()
    .max(64)
    .optional()
    .describe('Optional; shown after "Hello". Omit or leave empty for "Hello World".'),
  font: helloFontSchema,
});

export function registerHelloTool(server: McpServerInstance): void {
  server.tool(
    {
      name: "hello",
      description:
        "**hello** — optional **name**, bundled figlet **font** (default **Slant**). Returns **line** (`Hello {name}`; omit or empty **name** for World) and **ascii** (fitted horizontal figlet of the name). Fonts: " +
        HELLO_FONTS.join(", ") +
        ".",
      schema: helloInputSchema,
      outputSchema: helloOutputSchema,
    },
    async ({ name, font }) => {
      try {
        const { line, ascii } = asciiHello(name, { font });
        const md = ["```", ascii, "```"].join("\n");
        return mix(markdown(md), object({ line, ascii }));
      } catch (e) {
        return error(
          e instanceof Error ? e.message : "Failed to render ASCII art.",
        );
      }
    },
  );
}
