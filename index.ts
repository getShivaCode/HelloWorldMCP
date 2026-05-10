import { MCPServer, error, markdown, mix, object } from "mcp-use/server";
import figlet from "figlet";
import { z } from "zod";
import { bumpVisitorCount, ordinalVisitorLabel } from "./visitor-counter.js";

const server = new MCPServer({
  name: "hello-ascii",
  title: "Hello ASCII",
  version: "1.0.0",
  description: "Ask for a name and show ASCII art: Hello {name}",
  // Render (and similar hosts) require binding 0.0.0.0 — localhost is invisible to their health checks.
  host: process.env.HOST || (process.env.RENDER ? "0.0.0.0" : "localhost"),
  baseUrl:
    process.env.MCP_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    "http://localhost:3000",
  favicon: "favicon.ico",
  websiteUrl: "https://mcp-use.com",
  icons: [
    {
      src: "icon.svg",
      mimeType: "image/svg+xml",
      sizes: ["512x512"],
    },
  ],
});

/** Shared by say-hello-to-me and get-name tool arguments. */
const personInputSchema = z.object({
  name: z
    .string()
    .min(1, "Enter your name")
    .max(64, "Max 64 characters")
    .describe("Your name"),
  from: z
    .string()
    .min(1, "Say where you're from")
    .max(128, "Keep it under 128 characters")
    .describe("Where you're from (city, region, or country)"),
  age: z.coerce
    .number({ error: () => ({ message: "Enter a number" }) })
    .int()
    .min(1, "Age must be at least 1")
    .max(120, "Please enter a realistic age")
    .describe("Your age"),
});

const asciiOutputSchema = z.object({
  ascii: z.string(),
  greeting: z.string(),
  name: z.string(),
  from: z.string(),
  age: z.number(),
  visitNumber: z.number().describe("Running total of successful hello calls"),
  visitMessage: z
    .string()
    .describe("Human-readable ordinal, e.g. You are the 4th visitor"),
});

type Person = z.infer<typeof personInputSchema>;

function renderAsciiGreeting(name: string): string {
  const line = `Hello ${name}`;
  return figlet.textSync(line, {
    font: "Standard",
    horizontalLayout: "fitted",
  });
}

/** Friendly copy tuned by age (keep brief and neutral). */
function personalizedWelcome(p: {
  name: string;
  from: string;
  age: number;
}): string {
  const { name, from, age } = p;
  let line: string;
  if (age < 13) {
    line = `Hi **${name}** — awesome that you said hello.`;
  } else if (age < 25) {
    line = `Hi **${name}** — great to connect while you're getting started.`;
  } else if (age < 60) {
    line = `Hi **${name}** — wonderful to meet you.`;
  } else {
    line = `Hi **${name}** — honored you dropped by.`;
  }
  return [
    line,
    "",
    `You're **${age}**, and **${from}** is where you call home.`,
  ].join("\n");
}

function chatMarkdown(
  visitLine: string,
  welcomeBlock: string,
  asciiCaption: string,
  ascii: string,
): string {
  return [
    visitLine,
    "",
    welcomeBlock,
    "",
    `_${asciiCaption}_`,
    "",
    "```",
    ascii,
    "```",
  ].join("\n");
}

function normalizePerson(raw: Person): { name: string; from: string; age: number } | null {
  const name = raw.name.trim();
  const from = raw.from.trim();
  if (!name || !from) return null;
  return { name, from, age: raw.age };
}

function buildResponse(person: { name: string; from: string; age: number }) {
  const visitNumber = bumpVisitorCount();
  const visitMessage = ordinalVisitorLabel(visitNumber);
  const ascii = renderAsciiGreeting(person.name);
  const greeting = `Hello ${person.name}`;
  const welcomeBlock = personalizedWelcome(person);
  const md = chatMarkdown(
    visitMessage,
    welcomeBlock,
    `ASCII — ${greeting}`,
    ascii,
  );

  const structured = object({
    ascii,
    greeting,
    name: person.name,
    from: person.from,
    age: person.age,
    visitNumber,
    visitMessage,
  });

  return mix(markdown(md), structured);
}

async function handlePersonHello(args: Person) {
  const person = normalizePerson(args);
  if (!person) {
    return error("Name and ‘where you're from’ cannot be empty.");
  }
  try {
    return buildResponse(person);
  } catch (e) {
    return error(
      e instanceof Error ? e.message : "Failed to generate ASCII art.",
    );
  }
}

server.tool(
  {
    name: "say-hello-to-me",
    description:
      "Personal greeting with ASCII art. Needs name, where the user is from, and age. Hosts like ChatGPT should ask the user in chat, then call this tool with those fields (MCP elicitation is not required).",
    schema: personInputSchema,
    outputSchema: asciiOutputSchema,
  },
  async (args) => handlePersonHello(args),
);

server.tool(
  {
    name: "get-name",
    description:
      "Same behavior as say-hello-to-me: pass name, from (location), and age.",
    schema: personInputSchema,
    outputSchema: asciiOutputSchema,
  },
  async (args) => handlePersonHello(args),
);

server.listen().then(() => {
  console.error("hello-ascii MCP server listening");
});
