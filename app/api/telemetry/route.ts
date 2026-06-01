import { NextRequest, NextResponse } from "next/server";

function safePayload(input: any) {
  return {
    type: String(input?.type || "custom").slice(0, 60),
    name: input?.name ? String(input.name).slice(0, 120) : undefined,
    path: input?.path ? String(input.path).slice(0, 300) : undefined,
    message: input?.message ? String(input.message).slice(0, 500) : undefined,
    stack: input?.stack ? String(input.stack).slice(0, 1800) : undefined,
    value: Number.isFinite(Number(input?.value)) ? Number(input.value) : undefined,
    data: input?.data && typeof input.data === "object" ? input.data : undefined,
    href: input?.href ? String(input.href).slice(0, 500) : undefined,
    ts: input?.ts ? String(input.ts).slice(0, 60) : new Date().toISOString(),
  };
}

async function forwardToSentry(payload: ReturnType<typeof safePayload>) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || !payload.message) return;
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace("/", "");
    const endpoint = `${url.protocol}//${url.host}/api/${projectId}/store/`;
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${url.username}, sentry_client=eatlyte-web/1.0` },
      body: JSON.stringify({ logger: "eatlyte-web", platform: "javascript", level: payload.type === "page_view" ? "info" : "error", message: payload.message || payload.name || payload.type, extra: payload }),
    });
  } catch {}
}

export async function POST(req: NextRequest) {
  let body: any = {};
  try { body = await req.json(); } catch {}
  const payload = safePayload(body);
  if (payload.type !== "page_view") console.log("[Eatlyte telemetry]", JSON.stringify(payload));
  await forwardToSentry(payload);
  return NextResponse.json({ ok: true });
}
