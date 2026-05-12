import type { McpServerInstance } from "mcp-use/server";
import { registerAsciiArtSldsTool } from "./ascii-art-slds.js";
import { registerAsciiArtTool } from "./ascii-art.js";
import { registerHelloTool } from "./hello.js";

/** Register all MCP tools for this server. */
export function registerTools(server: McpServerInstance): void {
  registerHelloTool(server);
  registerAsciiArtTool(server);
  registerAsciiArtSldsTool(server);
}
