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
  resHeaders.set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type, x-push-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version");
  resHeaders.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: resHeaders });
  }
  return null;
}

/** Send a single FCM message and return success/failure info */
async function sendToToken(
  fcmToken: string,
  title: string,
  text: string,
  stringifiedData: Record<string, string> | undefined,
  image: string | undefined,
  accessToken: string,
  projectId: string,
): Promise<{ token: string; ok: boolean; unregistered: boolean; error?: string }> {
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const payload = {
    message: {
      token: fcmToken,
      notification: { title, body: text, image },
      data: stringifiedData,
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
    const unregistered = out.includes("UNREGISTERED") || out.includes("INVALID_ARGUMENT");
    return { token: fcmToken, ok: false, unregistered, error: out };
  }

  return { token: fcmToken, ok: true, unregistered: false };
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

    if (!token && !recipientId) {
      console.error("[send-push] Missing token and recipientId");
      return new Response(JSON.stringify({ error: "token or recipientId is required" }), {
        status: 400, headers: h,
      });
    }

    // Ensure all data values are strings for FCM
    const stringifiedData = data
      ? Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)]),
        )
      : undefined;

    const saJsonRaw = Deno.env.get("FCM_SA_JSON");
    const projectId = Deno.env.get("FCM_PROJECT_ID");
    if (!saJsonRaw || !projectId) {
      console.error("[send-push] Missing FCM config (FCM_SA_JSON or FCM_PROJECT_ID)");
      return new Response(JSON.stringify({ error: "FCM config missing" }), { status: 500, headers: h });
    }
    const saJson = JSON.parse(saJsonRaw);
    const accessToken = await getAccessToken(saJson);

    // --- Direct token mode (single device) ---
    if (token) {
      console.log("[send-push] Sending to direct token...");
      const result = await sendToToken(token, title, text, stringifiedData, image, accessToken, projectId);
      console.log("[send-push] Result:", result.ok ? "success" : result.error);
      if (!result.ok) {
        return new Response(JSON.stringify({ ok: false, error: result.error }), { status: 500, headers: h });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: h });
    }

    // --- Recipient mode: send to ALL tokens for this user ---
    console.log("[send-push] Looking up ALL FCM tokens for user:", recipientId);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[send-push] Missing Supabase config");
      return new Response(JSON.stringify({ error: "Server config missing" }), { status: 500, headers: h });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    const { data: tokenRows, error: tokenError } = await supabase
      .from("user_fcm_tokens")
      .select("id, token")
      .eq("user_id", recipientId);

    if (tokenError) {
      console.error("[send-push] Token lookup error:", tokenError.message);
      return new Response(JSON.stringify({ ok: false, reason: "token_lookup_error" }), { status: 200, headers: h });
    }

    if (!tokenRows || tokenRows.length === 0) {
      console.log("[send-push] No FCM tokens found for user:", recipientId);
      return new Response(JSON.stringify({ ok: false, reason: "no_token", message: "User has no FCM token registered" }), {
        status: 200, headers: h,
      });
    }

    console.log(`[send-push] Found ${tokenRows.length} token(s) for user, sending to all...`);

    // Send to every registered token in parallel
    const results = await Promise.all(
      tokenRows.map((row) =>
        sendToToken(row.token, title, text, stringifiedData, image, accessToken, projectId)
      )
    );

    // Clean up invalid/unregistered tokens
    const tokensToDelete = results
      .filter((r) => r.unregistered)
      .map((r) => r.token);

    if (tokensToDelete.length > 0) {
      console.log(`[send-push] Cleaning up ${tokensToDelete.length} invalid token(s)`);
      await supabase
        .from("user_fcm_tokens")
        .delete()
        .eq("user_id", recipientId)
        .in("token", tokensToDelete);
    }

    const successCount = results.filter((r) => r.ok).length;
    console.log(`[send-push] Delivered to ${successCount}/${tokenRows.length} device(s)`);

    return new Response(
      JSON.stringify({ ok: successCount > 0, delivered: successCount, total: tokenRows.length }),
      { status: 200, headers: h }
    );
  } catch (e: unknown) {
    console.error("[send-push] error:", e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: h });
  }
});
