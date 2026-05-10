import { type FormEvent, useState } from "react";
import {
  McpUseProvider,
  useCallTool,
  useWidget,
  type WidgetMetadata,
} from "mcp-use/react";
import { z } from "zod";

const propsSchema = z.object({});

export const widgetMetadata: WidgetMetadata = {
  description: "Name field and button; calls hello to render ASCII.",
  props: propsSchema,
  exposeAsTool: false,
};

type HelloOut = { line: string; ascii: string };

function readHelloOut(raw: unknown): HelloOut | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.ascii !== "string" || typeof o.line !== "string") return null;
  return { line: o.line, ascii: o.ascii };
}

export default function HelloFormWidget() {
  const { isPending: widgetBoot } = useWidget<Record<string, never>>();
  const { callTool, isPending, isSuccess, data, isError, error } =
    useCallTool("hello");
  const [name, setName] = useState("");

  const result = readHelloOut(data?.structuredContent);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    callTool(n.length ? { name: n } : {});
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
      <div className="w-full max-w-xl space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-lg">
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label className="text-sm font-medium text-slate-200" htmlFor="hello-name">
            Name
          </label>
          <input
            id="hello-name"
            type="text"
            maxLength={64}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Leave empty for Hello World"
            disabled={isPending}
            className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-slate-100 placeholder:text-slate-500 outline-none ring-0 transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Generating…" : "Show ASCII"}
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
            <pre className="overflow-x-auto rounded-lg bg-black/60 p-4 text-xs leading-tight text-emerald-300">
              {result.ascii}
            </pre>
          </div>
        )}
      </div>
    </McpUseProvider>
  );
}
