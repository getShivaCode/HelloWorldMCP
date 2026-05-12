import "./hello-slds-theme.css";
import { type SubmitEvent, useState } from "react";
import {
  McpUseProvider,
  useCallTool,
  useWidget,
  type MessageContentBlock,
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
    "No server-supplied props. Same behavior as **hello-name**: optional **name**, figlet **font**, then **hello** for **line** + **ascii**. UI uses SLDS-aligned CSS (`slds-*` patterns and Lightning tokens; curated subset, not the full SLDS npm bundle).",
  );

function stripOrigin(raw: string | undefined): string | undefined {
  const v = raw?.trim().replace(/\/$/, "") ?? "";
  return v === "" ? undefined : v;
}

const isDevBundle =
  typeof import.meta !== "undefined" &&
  Boolean(import.meta.env.DEV ?? import.meta.env.MODE === "development");

const fromEnv = stripOrigin(import.meta.env.VITE_WIDGET_ORIGIN);

const productionOrigin =
  fromEnv ?? "https://helloworldmcp.onrender.com";

const devOriginsDefault = ["http://localhost:3000", "http://127.0.0.1:3000"];
const devOrigins =
  fromEnv && isDevBundle ? [fromEnv] : devOriginsDefault;

export const widgetMetadata: WidgetMetadata = {
  description:
    "**hello-slds** — same flow as **hello-name** with **SLDS-aligned** UI (`slds-card`, stacked form, `slds-button_brand`, shaded ASCII box). After **hello** succeeds, sends **two** **`sendFollowUpMessage`** calls (greeting first, then fenced ASCII) on hosts that support follow-ups. Curated Lightning-like CSS (full SLDS npm bundle not vendored).",
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

/** Two chat follow-ups after **hello**: (1) greeting line, (2) fenced ASCII. Hosts must support `sendFollowUpMessage` twice. */
async function sendHelloFollowUps(
  sendFollowUpMessage: (
    content: string | MessageContentBlock[],
  ) => Promise<void>,
  out: HelloOut,
  font: HelloFont,
): Promise<void> {
  await sendFollowUpMessage(
    [
      "From **ascii-art-slds** → **hello** — **greeting**:",
      "",
      out.line,
    ].join("\n"),
  );
  await sendFollowUpMessage(
    [
      "From **ascii-art-slds** → **hello** — **ASCII art** (figlet, font **" +
        font +
        "**):",
      "",
      "```",
      out.ascii,
      "```",
    ].join("\n"),
  );
}

export default function HelloSldsWidget() {
  const { isPending: widgetBoot, sendFollowUpMessage } =
    useWidget<Record<string, never>>();
  const { callTool, isPending, isSuccess, data, isError, error } =
    useCallTool("hello");
  const [name, setName] = useState("");
  const [font, setFont] = useState<HelloFont>("Slant");

  const result = readHelloOut(data?.structuredContent);

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const n = name.trim();
    callTool(
      {
        ...(n.length ? { name: n } : {}),
        font,
      },
      {
        onSuccess: (response, args) => {
          const out = readHelloOut(response.structuredContent);
          if (!out) return;
          const fontArg =
            args &&
            typeof args === "object" &&
            "font" in args &&
            typeof (args as { font?: unknown }).font === "string"
              ? ((args as { font: string }).font as HelloFont)
              : font;
          void (async () => {
            try {
              await sendHelloFollowUps(
                sendFollowUpMessage,
                out,
                fontArg,
              );
            } catch {
              /* Inspector / hosts without follow-up API — widget still shows result */
            }
          })();
        },
      },
    );
  };

  if (widgetBoot) {
    return (
      <McpUseProvider autoSize>
        <div className="slds-scope slds-p-around_medium">
          <p className="slds-text-body_regular slds-text-color_weak">Loading…</p>
        </div>
      </McpUseProvider>
    );
  }

  return (
    <McpUseProvider autoSize>
      <div className="slds-scope" style={{ maxWidth: "28rem" }}>
        <article className="slds-card">
          <div className="slds-card__header slds-grid">
            <header className="slds-has-flexi-truncate">
              <h2 className="slds-card__header-title">
                <span>Hello ASCII</span>
              </h2>
              <p className="slds-text-body_small slds-text-color_weak slds-truncate">
                Salesforce Lightning Design System (SLDS)
              </p>
            </header>
          </div>
          <div className="slds-card__body slds-card__body_inner">
            <form className="slds-form slds-form_stacked" onSubmit={onSubmit}>
              <div className="slds-form-element slds-m-bottom_small">
                <label
                  className="slds-form-element__label"
                  htmlFor="hello-slds-name"
                >
                  Name
                </label>
                <div className="slds-form-element__control">
                  <input
                    id="hello-slds-name"
                    type="text"
                    maxLength={64}
                    autoComplete="name"
                    className="slds-input"
                    placeholder="Optional — leave blank for Hello World"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isPending}
                  />
                </div>
              </div>
              <div className="slds-form-element slds-m-bottom_medium">
                <label
                  className="slds-form-element__label"
                  htmlFor="hello-slds-font"
                >
                  Figlet font
                </label>
                <div className="slds-form-element__control">
                  <div className="slds-select_container">
                    <select
                      id="hello-slds-font"
                      className="slds-select"
                      value={font}
                      disabled={isPending}
                      onChange={(e) =>
                        setFont(e.target.value as HelloFont)
                      }
                    >
                      {HELLO_FONTS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="slds-align_absolute-center slds-m-top_small">
                <button
                  type="submit"
                  className="slds-button slds-button_brand"
                  disabled={isPending}
                >
                  {isPending ? "Generating…" : "Build ASCII Art"}
                </button>
              </div>
            </form>

            {isError ? (
              <div
                className="slds-notify slds-notify_alert slds-alert_error slds-m-top_medium"
                role="alert"
              >
                <span className="slds-assistive-text">Error</span>
                <h2 className="slds-text-heading_small">
                  {error instanceof Error ? error.message : String(error)}
                </h2>
              </div>
            ) : null}

            {isSuccess && result ? (
              <div className="slds-m-top_medium">
                <p className="slds-text-body_regular slds-m-bottom_x-small">
                  {result.line}
                </p>
                <div className="slds-box slds-theme_shade slds-scrollable_x">
                  <pre
                    className="slds-text-body_small slds-text-font_monospace"
                    style={{
                      margin: 0,
                      whiteSpace: "pre",
                      textAlign: "center",
                    }}
                  >
                    {result.ascii}
                  </pre>
                </div>
              </div>
            ) : null}
          </div>
        </article>
      </div>
    </McpUseProvider>
  );
}
