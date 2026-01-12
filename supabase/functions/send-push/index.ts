// deno-lint-ignore-file no-explicit-any
// Supabase Edge Function (Deno) to send FCM v1 notifications.
// Accepts either a direct FCM token OR a recipientId to look up the token.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
  resHeaders.set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type, x-push-secret");
  resHeaders.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") {
    // 204 No Content must have null body, not empty string
    return new Response(null, { status: 204, headers: resHeaders });
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
    const { token, recipientId, title, body: text, data, image } = body || {};
    
    console.log("[send-push] Request received:", { recipientId, title, hasToken: !!token });

    if (!title || !text) {
      console.error("[send-push] Missing title or body");
      return new Response(JSON.stringify({ error: "title and body are required" }), {
        status: 400, headers: h,
      });
    }

    // Either token or recipientId must be provided
    if (!token && !recipientId) {
      console.error("[send-push] Missing token and recipientId");
      return new Response(JSON.stringify({ error: "token or recipientId is required" }), {
        status: 400, headers: h,
      });
    }

    let fcmToken = token;

    // If recipientId provided, look up FCM token from database
    if (!fcmToken && recipientId) {
      console.log("[send-push] Looking up FCM token for user:", recipientId);
      
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      
      if (!supabaseUrl || !serviceRoleKey) {
        console.error("[send-push] Missing Supabase config");
        return new Response(JSON.stringify({ error: "Server config missing" }), { status: 500, headers: h });
      }

      const supabase = createClient(supabaseUrl, serviceRoleKey);
      
      // Get the most recently updated token for this user
      const { data: tokenData, error: tokenError } = await supabase
        .from("user_fcm_tokens")
        .select("token")
        .eq("user_id", recipientId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (tokenError || !tokenData?.token) {
        console.log("[send-push] No FCM token found for user:", recipientId, tokenError?.message);
        return new Response(JSON.stringify({ ok: false, reason: "no_token", message: "User has no FCM token registered" }), {
          status: 200, headers: h, // Return 200 so client doesn't retry
        });
      }

      fcmToken = tokenData.token;
      console.log("[send-push] Found FCM token for user");
    }

    const saJsonRaw = Deno.env.get("FCM_SA_JSON");
    const projectId = Deno.env.get("FCM_PROJECT_ID");
    if (!saJsonRaw || !projectId) {
      console.error("[send-push] Missing FCM config (FCM_SA_JSON or FCM_PROJECT_ID)");
      return new Response(JSON.stringify({ error: "FCM config missing" }), { status: 500, headers: h });
    }
    const saJson = JSON.parse(saJsonRaw);

    console.log("[send-push] Getting access token...");
    const accessToken = await getAccessToken(saJson);

    // FCM v1 endpoint
    const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    // Ensure all data values are strings for FCM
    const stringifiedData = data
      ? Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)]),
        )
      : undefined;
    
    console.log("[send-push] Payload data:", stringifiedData);
    
    const payload = {
      message: {
        token: fcmToken,
        notification: { title, body: text, image },
        data: stringifiedData,
        android: { priority: "high" },
        apns: { payload: { aps: { sound: "default" } } },
      },
    };

    console.log("[send-push] Sending to FCM...");
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const out = await resp.text();
    console.log("[send-push] FCM response:", resp.status, out);
    
    if (!resp.ok) {
      // Check if token is invalid/expired
      if (out.includes("UNREGISTERED") || out.includes("INVALID_ARGUMENT")) {
        console.log("[send-push] Token invalid, should be cleaned up");
      }
      return new Response(JSON.stringify({ ok: false, status: resp.status, error: out }), {
        status: 500, headers: h,
      });
    }

    return new Response(JSON.stringify({ ok: true, response: out }), { status: 200, headers: h });
  } catch (e) {
    console.error("[send-push] error:", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: h });
  }
});
