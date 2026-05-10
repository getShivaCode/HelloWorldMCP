import { MCPServer, error, markdown, mix, object } from "mcp-use/server";
import figlet from "figlet";
import { z } from "zod";
import { bumpVisitorCount, ordinalVisitorLabel } from "./visitor-counter.js";

const server = new MCPServer({
  name: "hello-ascii",
  title: "Hello ASCII",
  version: "1.0.0",
  description: "Ask for a name and show ASCII art: Hello {name}",
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

/** Shared by elicitation form and get-name tool arguments. */
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

/** One field per step — hosts render a single control per elicit round-trip. */
const elicitStepNameSchema = z.object({
  name: z
    .string()
    .min(1, "Enter your name")
    .max(64, "Max 64 characters")
    .describe("Your name"),
});

const elicitStepFromSchema = z.object({
  from: z
    .string()
    .min(1, "Say where you're from")
    .max(128, "Keep it under 128 characters")
    .describe("City, region, or country"),
});

const elicitStepAgeSchema = z.object({
  age: z.coerce
    .number({ error: () => ({ message: "Enter a number" }) })
    .int()
    .min(1, "Age must be at least 1")
    .max(120, "Please enter a realistic age")
    .describe("Age in years"),
});

const MSG_STEP_1 =
  "Step 1 of 3. What's your name? (Your greeting appears in chat after all steps.)";
const MSG_STEP_2 = "Step 2 of 3. Where are you from?";
const MSG_STEP_3 = "Step 3 of 3. How old are you?";

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

server.tool(
  {
    name: "say-hello-to-me",
    description:
      "Three-step form (name → where you're from → age), one question at a time via MCP elicitation. Then posts greeting, ASCII art, and visitor count in chat only.",
    schema: z.object({}),
    outputSchema: asciiOutputSchema,
  },
  async (_params, ctx) => {
    if (!ctx?.client?.can?.("elicitation")) {
      return markdown(
        [
          "**This client did not advertise MCP elicitation**, so there’s no inline form here.",
          "",
          'Ask the assistant to call **`get-name`** with JSON like `{"name":"Ada","from":"Lisbon","age":32}`, or use a host that supports **elicitation**.',
        ].join("\n"),
      );
    }

    const r1 = await ctx.elicit(MSG_STEP_1, elicitStepNameSchema);
    if (r1.action === "decline") return error("You declined the name step.");
    if (r1.action === "cancel") return error("Cancelled before entering your name.");
    if (r1.action !== "accept" || !r1.data?.name?.trim()) {
      return error("No name was provided.");
    }

    const r2 = await ctx.elicit(MSG_STEP_2, elicitStepFromSchema);
    if (r2.action === "decline") return error("You declined the location step.");
    if (r2.action === "cancel") return error("Cancelled before entering where you're from.");
    if (r2.action !== "accept" || !r2.data?.from?.trim()) {
      return error("No location was provided.");
    }

    const r3 = await ctx.elicit(MSG_STEP_3, elicitStepAgeSchema);
    if (r3.action === "decline") return error("You declined the age step.");
    if (r3.action === "cancel") return error("Cancelled before entering your age.");
    if (r3.action !== "accept" || r3.data === undefined) {
      return error("No age was provided.");
    }

    const person = normalizePerson({
      name: r1.data.name,
      from: r2.data.from,
      age: r3.data.age,
    });
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
  },
);

server.tool(
  {
    name: "get-name",
    description:
      "Same greeting as say-hello-to-me without the form: pass name, from (location), and age. Use when elicitation isn’t available.",
    schema: personInputSchema,
    outputSchema: asciiOutputSchema,
  },
  async (args) => {
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
  },
);

server.listen().then(() => {
  console.error("hello-ascii MCP server listening");
});
