import { MCPServer, error, markdown, mix, object } from "mcp-use/server";
import figlet from "figlet";
import { z } from "zod";

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

const helloInputSchema = z.object({
  name: z
    .string()
    .max(64)
    .optional()
    .describe('Optional; shown after "Hello". Omit or leave empty for "Hello World".'),
});

const helloOutputSchema = z.object({
  line: z.string(),
  ascii: z.string(),
});

server.tool(
  {
    name: "hello",
    description:
      'ASCII art for "Hello {name}". Pass **name** for a custom greeting; omit it for **Hello World**.',
    schema: helloInputSchema,
    outputSchema: helloOutputSchema,
  },
  async ({ name }) => {
    const trimmed = name?.trim() || "World";
    const label = trimmed && trimmed.length > 0 ? trimmed : "World";
    const line = `Hello ${label}`;
    let ascii: string;
    try {
      ascii = figlet.textSync(trimmed, {
        font: "Slant",
        horizontalLayout: "fitted",
      });
    } catch (e) {
      return error(
        e instanceof Error ? e.message : "Failed to render ASCII art.",
      );
    }

    const md = ["```", ascii, "```"].join("\n");
    return mix(markdown(md), object({ line, ascii }));
  },
);

server.listen().then(() => {
  console.error("hello-ascii MCP server listening");
});
