import { text, widget, type McpServerInstance } from "mcp-use/server";
import { z } from "zod";
import { HELLO_FONTS } from "../hello-options.js";

const asciiArtToolInputSchema = z
  .object({})
  .describe(
    "No JSON arguments. Optional **name** and figlet **font** are set in the **hello-name** widget; the widget calls **hello** and shows the same **line** + **ascii** result.",
  );

async function openAsciiNameWidget() {
  return widget({
    props: {},
    output: text(
      "Use the form to enter an optional name, pick a bundled figlet font (default Slant), then submit. You get the same **line** and **ascii** as the **hello** tool: greeting text plus name-only fitted ASCII.",
    ),
  });
}

export function registerAsciiArtTool(server: McpServerInstance): void {
  server.tool(
    {
      name: "ascii-art",
      description:
        "**ascii-art** — use an interactive widget to collect a name, Fonts: " +
        HELLO_FONTS.join(", ") +
        ". To generate ASCII Art",
      schema: asciiArtToolInputSchema,
      widget: {
        name: "hello-name",
        invoking: "Opening hello form…",
        invoked: "Form ready — enter name, optional font, then generate.",
      },
    },
    openAsciiNameWidget,
  );
}
