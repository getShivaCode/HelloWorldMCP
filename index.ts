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
    "Figlet ASCII hellos: **hello** returns a spoken greeting plus fitted ASCII of the name (omit the name for World; pick a bundled font). **ascii-art** opens a small widget for the same result without tool arguments.",
  host: listenHost(),
  baseUrl: publicBaseUrl(),
});

registerTools(server);

server.listen().then(() => {
  console.error("hello-ascii MCP server listening");
});
