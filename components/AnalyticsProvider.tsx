"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

type TelemetryPayload = {
  type: "page_view" | "web_vital" | "client_error" | "unhandled_rejection" | "custom";
  name?: string;
  path?: string;
  message?: string;
  stack?: string;
  value?: number;
  data?: Record<string, unknown>;
};

function sendTelemetry(payload: TelemetryPayload) {
  if (typeof navigator === "undefined") return;
  const body = JSON.stringify({ ...payload, ts: new Date().toISOString(), href: location.href });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/telemetry", new Blob([body], { type: "application/json" }));
      return;
    }
  } catch {}
  fetch("/api/telemetry", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
}

export function trackEvent(name: string, data?: Record<string, unknown>) {
  sendTelemetry({ type: "custom", name, data });
}

export default function AnalyticsProvider() {
  const pathname = usePathname();
  useEffect(() => {
    const search = typeof window !== "undefined" ? window.location.search : "";
    sendTelemetry({ type: "page_view", path: pathname + search });
  }, [pathname]);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      sendTelemetry({ type: "client_error", message: event.message, stack: event.error?.stack, data: { filename: event.filename, lineno: event.lineno, colno: event.colno } });
    };
    const onReject = (event: PromiseRejectionEvent) => {
      sendTelemetry({ type: "unhandled_rejection", message: String(event.reason?.message || event.reason), stack: event.reason?.stack });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onReject);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onReject);
    };
  }, []);

  return null;
}
