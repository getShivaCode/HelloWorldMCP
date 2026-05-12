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

const propsSchema = z
  .object({})
  .describe(
    "No server-supplied props. The user enters an optional **name** and chooses a bundled figlet **font** in the UI; submitting calls **hello** and displays **line** plus **ascii** (name-only FIGlet, same semantics as the **hello** tool).",
  );

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
    "**hello-name** — compact form for the same behavior as **hello**: optional **name**, bundled figlet **font** (corner control; default **Slant**). On submit, calls **hello** and shows **line** (`Hello {name}` or `Hello World`) and **ascii** (fitted horizontal FIGlet of the **name** only—not the full greeting).",
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

type Theme = "dark" | "light";

function themeClasses(theme: Theme) {
  const L = theme === "light";
  return {
    loadingBox: L
      ? "rounded-lg border border-stone-300/80 bg-stone-200/90 px-4 py-3 text-sm text-stone-700"
      : "rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-400",
    card: L
      ? "group/card relative w-full max-w-xl space-y-4 rounded-xl border border-stone-400/50 bg-stone-200 p-5 pb-6 pt-6 shadow-lg"
      : "group/card relative w-full max-w-xl space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-5 pb-6 pt-6 shadow-lg",
    cornerBtnBase:
      "select-none rounded border px-2 py-1 backdrop-blur-sm transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40",
    cornerBtnDark:
      "border-slate-600/35 bg-slate-950/50 text-slate-400 opacity-[0.14] group-hover/card:opacity-40 hover:opacity-100",
    cornerBtnDarkActive:
      "border-slate-600/35 bg-slate-950/50 text-slate-400 opacity-100 ring-1 ring-cyan-500/35",
    cornerBtnLight:
      "border-stone-400/70 bg-stone-100/95 text-stone-700 opacity-40 group-hover/card:opacity-90 hover:opacity-100",
    cornerBtnLightActive:
      "border-stone-400 bg-stone-100 text-stone-800 opacity-100 ring-1 ring-cyan-600/25",
    popover: L
      ? "min-w-[11rem] rounded-lg border border-stone-400/60 bg-stone-100 p-2 shadow-xl"
      : "min-w-[11rem] rounded-lg border border-slate-600 bg-slate-950 p-2 shadow-xl",
    popoverLabel: L
      ? "mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500"
      : "mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500",
    select: L
      ? "w-full rounded-md border border-stone-400/70 bg-stone-100 px-2 py-1.5 text-xs text-stone-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20 disabled:opacity-50"
      : "w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/25 disabled:opacity-50",
    formLabel: L ? "text-sm font-medium text-stone-900" : "text-sm font-medium text-slate-200",
    input: L
      ? "w-full rounded-lg border border-stone-400/70 bg-stone-100 px-3 py-2.5 text-center text-stone-900 placeholder:text-stone-500 outline-none ring-0 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20 disabled:opacity-50"
      : "w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-center text-slate-100 placeholder:text-slate-500 outline-none ring-0 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 disabled:opacity-50",
    resultLine: L ? "text-sm text-stone-700" : "text-sm text-slate-400",
    asciiBox: L ? "overflow-x-auto rounded-lg bg-stone-300/45 p-4" : "overflow-x-auto rounded-lg bg-black/60 p-4",
    asciiPre: L
      ? "mx-auto w-max max-w-full text-center font-mono text-xs leading-tight whitespace-pre text-emerald-800"
      : "mx-auto w-max max-w-full text-center font-mono text-xs leading-tight whitespace-pre text-emerald-300",
    errorText: L ? "text-sm text-red-600" : "text-sm text-red-400",
  };
}

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
  const [theme, setTheme] = useState<Theme>("dark");
  const fontPanelRef = useRef<HTMLDivElement>(null);
  const tc = themeClasses(theme);

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
        <div className={tc.loadingBox}>Loading…</div>
      </McpUseProvider>
    );
  }

  const cornerAa =
    tc.cornerBtnBase +
    " text-[10px] font-semibold uppercase tracking-wider " +
    (theme === "dark"
      ? fontPanelOpen
        ? tc.cornerBtnDarkActive
        : tc.cornerBtnDark
      : fontPanelOpen
        ? tc.cornerBtnLightActive
        : tc.cornerBtnLight);

  const cornerTheme =
    tc.cornerBtnBase +
    " text-base leading-none " +
    (theme === "dark" ? tc.cornerBtnDark : tc.cornerBtnLight);

  return (
    <McpUseProvider autoSize>
      <div className={tc.card}>
        {/* Theme toggle + font (top-right). */}
        <div
          ref={fontPanelRef}
          className="absolute right-3 top-3 z-30 flex flex-row items-start gap-1"
        >
          <button
            type="button"
            role="switch"
            aria-checked={theme === "light"}
            aria-label="Toggle light or dark theme"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            className={cornerTheme}
          >
            {theme === "dark" ? "☀" : "☽"}
          </button>
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              aria-expanded={fontPanelOpen}
              aria-controls="hello-font-popover"
              aria-label="Figlet font"
              onClick={() => setFontPanelOpen((open) => !open)}
              className={cornerAa}
            >
              Aa
            </button>
            {fontPanelOpen ? (
              <div
                id="hello-font-popover"
                className={tc.popover}
              >
                <label
                  htmlFor="hello-font-select"
                  className={tc.popoverLabel}
                >
                  Font
                </label>
                <select
                  id="hello-font-select"
                  value={font}
                  disabled={isPending}
                  onChange={(e) => setFont(e.target.value as HelloFont)}
                  className={tc.select}
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
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label
            className={tc.formLabel}
            htmlFor="hello-name-field"
          >
            Name
          </label>
          <input
            id="hello-name-field"
            type="text"
            maxLength={64}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tell me your name"
            disabled={isPending}
            className={tc.input}
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
          <p className={tc.errorText} role="alert">
            {error instanceof Error ? error.message : String(error)}
          </p>
        )}
        {isSuccess && result && (
          <div className="space-y-2">
            <p className={tc.resultLine}>{result.line}</p>
            <div className={tc.asciiBox}>
              <pre className={tc.asciiPre}>
                {result.ascii}
              </pre>
            </div>
          </div>
        )}
      </div>
    </McpUseProvider>
  );
}
