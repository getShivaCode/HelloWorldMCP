import { type SubmitEvent, useEffect, useRef, useState } from "react";
import {
  McpUseProvider,
  useCallTool,
  useWidget,
  type WidgetMetadata,
} from "mcp-use/react";
import {
  HELLO_FONTS,
  type HelloFont,
} from "../hello-options";
import { z } from "zod";

const propsSchema = z.object({});

function stripOrigin(raw: string | undefined): string | undefined {
  const v = raw?.trim().replace(/\/$/, "") ?? "";
  return v === "" ? undefined : v;
}

/**
 * ChatGPT: `openai/widgetDomain` + CSP `connectDomains`.
 * - **Dev** (`mcp-use dev`): allow local MCP so `useCallTool` works in Inspector.
 * - **Prod build**: set **`VITE_WIDGET_ORIGIN`** (public `https://…` base, no trailing slash).
 */
const isDevBundle =
  typeof import.meta !== "undefined" &&
  Boolean(import.meta.env.DEV ?? import.meta.env.MODE === "development");

const fromEnv = stripOrigin(import.meta.env.VITE_WIDGET_ORIGIN);

/** Production widget domain; env preferred, default matches current Render URL. */
const productionOrigin =
  fromEnv ?? "https://helloworldmcp.onrender.com";

const devOriginsDefault = ["http://localhost:3000", "http://127.0.0.1:3000"];
const devOrigins =
  fromEnv && isDevBundle ? [fromEnv] : devOriginsDefault;

export const widgetMetadata: WidgetMetadata = {
  description:
    "Name field—optional niche font menu (corner). hello uses figlet fitted + font (default Slant).",
  props: propsSchema,
  exposeAsTool: false,
  metadata: isDevBundle
    ? {
        domain: devOrigins[0],
        csp: { connectDomains: devOrigins },
      }
    : {
        domain: productionOrigin,
        csp: { connectDomains: [productionOrigin] },
      },
};

type HelloOut = { line: string; ascii: string };

function readHelloOut(raw: unknown): HelloOut | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.ascii !== "string" || typeof o.line !== "string") return null;
  return { line: o.line, ascii: o.ascii };
}

export default function HelloNameWidget() {
  const { isPending: widgetBoot } = useWidget<Record<string, never>>();
  const { callTool, isPending, isSuccess, data, isError, error } =
    useCallTool("hello");
  const [name, setName] = useState("");
  const [font, setFont] = useState<HelloFont>("Slant");
  const [fontPanelOpen, setFontPanelOpen] = useState(false);
  const fontPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fontPanelOpen) return;
    function onDocDown(e: MouseEvent) {
      if (fontPanelRef.current?.contains(e.target as Node)) return;
      setFontPanelOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [fontPanelOpen]);

  const result = readHelloOut(data?.structuredContent);

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const n = name.trim();
    callTool({
      ...(n.length ? { name: n } : {}),
      font,
    });
  };

  if (widgetBoot) {
    return (
      <McpUseProvider autoSize>
        <div className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-400">
          Loading…
        </div>
      </McpUseProvider>
    );
  }

  return (
    <McpUseProvider autoSize>
      <div className="group/card relative w-full max-w-xl space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-5 pb-6 pt-6 shadow-lg">
        {/* Niche font: nearly hidden until hover / open (top-right). */}
        <div
          ref={fontPanelRef}
          className="absolute right-3 top-3 z-30 flex flex-col items-end gap-1"
        >
          <button
            type="button"
            aria-expanded={fontPanelOpen}
            aria-controls="hello-font-popover"
            aria-label="Figlet font"
            onClick={() => setFontPanelOpen((open) => !open)}
            className={
              "select-none rounded border border-slate-600/35 bg-slate-950/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 backdrop-blur-sm transition-opacity " +
              (fontPanelOpen
                ? "opacity-100 ring-1 ring-cyan-500/35"
                : "opacity-[0.14] group-hover/card:opacity-40 hover:opacity-100 focus-visible:opacity-100")
            }
          >
            Aa
          </button>
          {fontPanelOpen ? (
            <div
              id="hello-font-popover"
              className="min-w-[11rem] rounded-lg border border-slate-600 bg-slate-950 p-2 shadow-xl"
            >
              <label
                htmlFor="hello-font-select"
                className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500"
              >
                Font
              </label>
              <select
                id="hello-font-select"
                value={font}
                disabled={isPending}
                onChange={(e) => setFont(e.target.value as HelloFont)}
                className="w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/25 disabled:opacity-50"
              >
                {HELLO_FONTS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label
            className="text-sm font-medium text-slate-200"
            htmlFor="hello-name-field"
          >
            Name
          </label>
          <input
            id="hello-name-field"
            type="text"
            maxLength={10}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tell me your name"
            disabled={isPending}
            className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-center text-slate-100 placeholder:text-slate-500 outline-none ring-0 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isPending}
            className="w-3/4 self-center rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Generating…" : "Build ASCII Art"}
          </button>
        </form>
        {isError && (
          <p className="text-sm text-red-400" role="alert">
            {error instanceof Error ? error.message : String(error)}
          </p>
        )}
        {isSuccess && result && (
          <div className="space-y-2">
            <p className="text-sm text-slate-400">{result.line}</p>
            <div className="overflow-x-auto rounded-lg bg-black/60 p-4">
              <pre className="mx-auto w-max max-w-full text-center font-mono text-xs leading-tight whitespace-pre text-emerald-300">
                {result.ascii}
              </pre>
            </div>
          </div>
        )}
      </div>
    </McpUseProvider>
  );
}
