/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public HTTPS MCP origin for widget CSP + ChatGPT domain (no trailing slash). */
  readonly VITE_WIDGET_ORIGIN?: string;
}
