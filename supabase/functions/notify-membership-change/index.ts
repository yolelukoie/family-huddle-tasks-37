// Edge function: Send push notifications when a member is kicked/removed from a family
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { type, targetUserId, familyId, actorId, familyName } = await req.json();

    if (!type || !targetUserId || !familyId) {
      return new Response(JSON.stringify({ error: "type, targetUserId, familyId required" }), {
        status: 400, headers: corsHeaders,
      });
    }

    console.log(`[notify-membership] ${type} for user ${targetUserId} in family ${familyId}`);

    let title = "Family Huddle";
    let body = "";

    if (type === "kicked") {
      title = "Removed from family";
      body = familyName
        ? `You have been removed from "${familyName}".`
        : "You have been removed from a family.";
    } else if (type === "left") {
      title = "Member left";
      body = "A member has left the family.";
    }

    // Send push to the target user
    const resp = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        recipientId: targetUserId,
        title,
        body,
        data: {
          type: "kicked",
          event_type: type === "kicked" ? "kicked" : "member_left",
          familyId: familyId,
          family_id: familyId,
          actorId: actorId || "",
        },
      }),
    });

    const result = await resp.json();
    console.log(`[notify-membership] Push result:`, result);

    return new Response(JSON.stringify({ ok: true, result }), {
      status: 200, headers: corsHeaders,
    });
  } catch (e: unknown) {
    console.error("[notify-membership] Error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: corsHeaders,
    });
  }
});
