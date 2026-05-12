import { MCPServer } from "mcp-use/server";
import { registerTools } from "./tools/index.js";

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
  name: "ascii-art-hello",
  title: "ASCII Art to say hello",
  version: "1.0.1",
  description:
    "Figlet ASCII hellos: **hello** returns a greeting line plus fitted ASCII of the name (omit name for World; pick a font). **ascii-art** opens a Tailwind-styled widget; **ascii-art-slds** opens the same flow with **Salesforce Lightning Design System** (SLDS) styling.",
  host: listenHost(),
  baseUrl: publicBaseUrl(),
});

registerTools(server);

server.listen().then(() => {
  console.error("hello-ascii MCP server listening");
});
