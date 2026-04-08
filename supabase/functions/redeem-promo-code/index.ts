import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Lifetime promo codes — add any valid codes here
const LIFETIME_CODES = new Set(["FAMILYFREE", "BETATESTER"]);

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Parse body
    const { code, userId } = await req.json();

    if (!code || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing code or userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Ensure the authenticated user matches the userId
    if (user.id !== userId) {
      return new Response(
        JSON.stringify({ error: "User mismatch" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate promo code (case-insensitive)
    const normalised = code.trim().toUpperCase();
    if (!LIFETIME_CODES.has(normalised)) {
      return new Response(
        JSON.stringify({ error: "Invalid promo code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Grant lifetime entitlement via RevenueCat REST API v1
    const rcSecretKey = Deno.env.get("REVENUECAT_SECRET_API_KEY");
    if (!rcSecretKey) {
      console.error("[redeem-promo-code] REVENUECAT_SECRET_API_KEY not set");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // RevenueCat REST API v1 — grant promotional entitlement
    const rcUrl = `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}/entitlements/${encodeURIComponent('Family Huddle Pro')}/promotional`;

    const rcResponse = await fetch(rcUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${rcSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ duration: "lifetime" }),
    });

    if (!rcResponse.ok) {
      const rcError = await rcResponse.text();
      console.error("[redeem-promo-code] RevenueCat error:", rcResponse.status, rcError);
      return new Response(
        JSON.stringify({ error: "Failed to grant entitlement" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[redeem-promo-code] Granted lifetime entitlement to user ${userId} with code ${normalised}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[redeem-promo-code] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
