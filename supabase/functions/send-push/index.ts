// deno-lint-ignore-file no-explicit-any
// Supabase Edge Function (Deno) to send FCM v1 notifications without Firebase Blaze plan.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// Build a Google OAuth2 access token using a service account JSON
async function getAccessToken(saJson: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: saJson.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const enc = (obj: unknown) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(obj))))
      .replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");

  const unsigned = `${enc(header)}.${enc(claims)}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    // Convert PEM private key to ArrayBuffer
    (() => {
      const pem = saJson.private_key as string;
      const raw = pem.replace("-----BEGIN PRIVATE KEY-----", "")
                     .replace("-----END PRIVATE KEY-----", "")
                     .replaceAll("\n", "");
      const bytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
      return bytes.buffer;
    })(),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sigBytes = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)),
  );
  const signature = btoa(String.fromCharCode(...sigBytes))
    .replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");

  const assertion = `${unsigned}.${signature}`;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`OAuth token error: ${resp.status} ${txt}`);
    }

  const json = await resp.json();
  return json.access_token as string;
}

function cors(req: Request, resHeaders = new Headers()) {
  resHeaders.set("Access-Control-Allow-Origin", "*");
  resHeaders.set("Access-Control-Allow-Headers", "content-type, x-push-secret");
  resHeaders.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") {
    return new Response("", { status: 204, headers: resHeaders });
  }
  return null;
}

serve(async (req) => {
  const h = new Headers();
  const corsResp = cors(req, h);
  if (corsResp) return corsResp;

  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: h });
    }

    const SECRET = Deno.env.get("PUSH_SHARED_SECRET") || "";
    if (SECRET && req.headers.get("x-push-secret") !== SECRET) {
      return new Response("Unauthorized", { status: 401, headers: h });
    }

    const body = await req.json().catch(() => ({}));
    const { token, title, body: text, data, image } = body || {};
    if (!token || !title || !text) {
      return new Response(JSON.stringify({ error: "token, title, body are required" }), {
        status: 400, headers: h,
      });
    }

    const saJsonRaw = Deno.env.get("FCM_SA_JSON");
    const projectId = Deno.env.get("FCM_PROJECT_ID");
    if (!saJsonRaw || !projectId) {
      return new Response(JSON.stringify({ error: "FCM config missing" }), { status: 500, headers: h });
    }
    const saJson = JSON.parse(saJsonRaw);

    const accessToken = await getAccessToken(saJson);

    // FCM v1 endpoint
    const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    const payload = {
      message: {
        token,
        notification: { title, body: text, image },
        data: data
          ? Object.fromEntries(
              Object.entries(data).map(([k, v]) => [k, String(v)]),
            )
          : undefined,
        android: { priority: "high" },
        apns: { payload: { aps: { sound: "default" } } },
      },
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const out = await resp.text();
    if (!resp.ok) {
      return new Response(JSON.stringify({ ok: false, status: resp.status, error: out }), {
        status: 500, headers: h,
      });
    }

    return new Response(out, { status: 200, headers: h });
  } catch (e) {
    console.error("send-push error:", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: h });
  }
});
