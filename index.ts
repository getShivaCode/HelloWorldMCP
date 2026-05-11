import {
  MCPServer,
  error,
  markdown,
  mix,
  object,
  text,
  widget,
} from "mcp-use/server";
import figlet from "figlet";
import type { HelloFont } from "./hello-options.js";
import { HELLO_FONTS } from "./hello-options.js";
import { z } from "zod";

const HELLO_HORIZONTAL_LAYOUT = "fitted" as const;

/** `line` = spoken greeting; `ascii` = figlet of **name only** (`World` if omitted). */
function asciiHello(
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

/** Render probes 0.0.0.0:$PORT — binding localhost makes the service look “down”. */
function listenHost(): string {
  if (process.env.HOST) return process.env.HOST;
  if (process.env.RENDER ?? process.env.RENDER_EXTERNAL_URL) return "0.0.0.0";
  return "localhost";
}

function publicBaseUrl(): string {
  if (process.env.MCP_URL) return process.env.MCP_URL;
  if (process.env.RENDER_EXTERNAL_URL) return process.env.RENDER_EXTERNAL_URL;
  const port = process.env.PORT ?? "3000";
  return `http://localhost:${port}`;
}

const server = new MCPServer({
  name: "hello-ascii",
  title: "Hello ASCII",
  version: "1.0.0",
  description: 'One tool **hello**: ASCII art for "Hello {name}" or "Hello World" if name is omitted.',
  host: listenHost(),
  baseUrl: publicBaseUrl(),
});

const helloOutputSchema = z.object({
  line: z.string(),
  ascii: z.string(),
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

server.tool(
  {
    name: "hello",
    description:
      "Structured **line** is `Hello {name}`; ASCII art is the **name** alone (figlet horizontal **fitted**). Omit **name** for `World`. Fonts: " +
      HELLO_FONTS.join(", ") +
      ". Default **Slant**.",
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

server.tool(
  {
    name: "hello-widget",
    description:
      "Open a compact form (name → ASCII). Same output as **hello**, without typed tool args.",
    schema: z.object({}),
    widget: { name: "hello-form", invoking: "Opening form…", invoked: "Ready" },
  },
  async () =>
    widget({
      props: {},
      output: text("Enter a name in the widget, then generate ASCII."),
    }),
);

server.listen().then(() => {
  console.error("hello-ascii MCP server listening");
});
