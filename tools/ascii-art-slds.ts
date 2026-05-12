import { text, widget, type McpServerInstance } from "mcp-use/server";
import { z } from "zod";
import { HELLO_FONTS } from "../hello-options.js";

const asciiArtSldsInputSchema = z
  .object({})
  .describe(
    "No JSON arguments. Opens **hello-slds**: same flow as **ascii-art** (optional name, figlet font, calls **hello**) with **SLDS-aligned** UI. On success, sends **two** **`sendFollowUpMessage`** calls (greeting, then ASCII) where the host supports it.",
  );

async function openHelloSldsWidget() {
  return widget({
    props: {},
    output: text(
      "SLDS widget: optional name and font, then **hello**. Sends **two** follow-up chat messages where supported (1) greeting, (2) fenced ASCII.",
    ),
  });
}

export function registerAsciiArtSldsTool(server: McpServerInstance): void {
  server.tool(
    {
      name: "ascii-art-slds",
      description:
        "**ascii-art-slds** — like **ascii-art**, but **hello-slds** uses **SLDS-aligned** markup + curated Lightning CSS. After generate, **two** **`sendFollowUpMessage`** calls (greeting, then ASCII) on supported hosts. Same **hello** output. Fonts: " +
        HELLO_FONTS.join(", ") +
        ".",
      schema: asciiArtSldsInputSchema,
      widget: {
        name: "hello-slds",
        invoking: "Opening SLDS hello form…",
        invoked: "Form ready — SLDS Lightning styling.",
      },
    },
    openHelloSldsWidget,
  );
}
