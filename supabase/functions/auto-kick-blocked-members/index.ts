// deno-lint-ignore-file no-explicit-any
// Supabase Edge Function to auto-kick members who have been blocked for 30+ days.
// This should be scheduled to run daily via pg_cron.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function cors(req: Request, resHeaders = new Headers()) {
  resHeaders.set("Access-Control-Allow-Origin", "*");
  resHeaders.set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
  resHeaders.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: resHeaders });
  }
  return null;
}

serve(async (req) => {
  const h = new Headers();
  const corsResp = cors(req, h);
  if (corsResp) return corsResp;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[auto-kick] Missing Supabase config");
      return new Response(JSON.stringify({ error: "Server config missing" }), { status: 500, headers: h });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find users who have been blocked for 30+ days
    const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();

    console.log("[auto-kick] Looking for members blocked since:", thirtyDaysAgo);

    // Get all blocked memberships where blocked_at is older than 30 days
    const { data: blockedMembers, error: fetchError } = await supabase
      .from("user_families")
      .select("id, user_id, family_id, blocked_at, blocked_until, blocked_indefinite")
      .not("blocked_at", "is", null)
      .lte("blocked_at", thirtyDaysAgo);

    if (fetchError) {
      console.error("[auto-kick] Error fetching blocked members:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), { status: 500, headers: h });
    }

    console.log("[auto-kick] Found blocked members:", blockedMembers?.length || 0);

    if (!blockedMembers || blockedMembers.length === 0) {
      return new Response(JSON.stringify({ ok: true, kicked: 0 }), { status: 200, headers: h });
    }

    let kickedCount = 0;

    for (const membership of blockedMembers) {
      // Check if they're still blocked (indefinite OR timed block hasn't expired)
      const isStillBlocked = 
        membership.blocked_indefinite || 
        (membership.blocked_until && new Date(membership.blocked_until) > new Date());

      if (!isStillBlocked) {
        console.log(`[auto-kick] Member ${membership.user_id} block has expired, skipping`);
        continue;
      }

      console.log(`[auto-kick] Auto-kicking user ${membership.user_id} from family ${membership.family_id}`);

      // Get family name for notification
      const { data: familyData } = await supabase
        .from("families")
        .select("name")
        .eq("id", membership.family_id)
        .single();

      const familyName = familyData?.name || "Family";

      // Get the user's display name for notification to other members
      const { data: profileData } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", membership.user_id)
        .single();

      const userName = profileData?.display_name || "A member";

      // Delete the membership (this is the actual kick)
      const { error: deleteError } = await supabase
        .from("user_families")
        .delete()
        .eq("id", membership.id);

      if (deleteError) {
        console.error(`[auto-kick] Failed to delete membership ${membership.id}:`, deleteError);
        continue;
      }

      kickedCount++;

      // Update the kicked user's active family
      const { data: remainingFamilies } = await supabase
        .from("user_families")
        .select("family_id")
        .eq("user_id", membership.user_id);

      if (!remainingFamilies || remainingFamilies.length === 0) {
        // User has no families left - clear their active_family_id
        await supabase
          .from("profiles")
          .update({ active_family_id: null })
          .eq("id", membership.user_id);
      } else {
        // Check if we need to switch their active family
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("active_family_id")
          .eq("id", membership.user_id)
          .single();

        if (userProfile?.active_family_id === membership.family_id) {
          // Their active family was the one they got kicked from - switch to another
          await supabase
            .from("profiles")
            .update({ active_family_id: remainingFamilies[0].family_id })
            .eq("id", membership.user_id);
        }
      }

      // Send notification to kicked user
      try {
        await supabase.functions.invoke("send-push", {
          body: {
            recipientId: membership.user_id,
            title: "Automatically removed from family",
            body: `You were automatically deleted from ${familyName} after being blocked for a month.`,
            data: {
              event_type: "auto_kicked",
              family_id: membership.family_id,
            },
          },
        });
      } catch (pushError) {
        console.error("[auto-kick] Failed to notify kicked user:", pushError);
      }

      // Get remaining family members and notify them
      const { data: familyMembers } = await supabase
        .from("user_families")
        .select("user_id")
        .eq("family_id", membership.family_id);

      if (familyMembers) {
        for (const member of familyMembers) {
          try {
            await supabase.functions.invoke("send-push", {
              body: {
                recipientId: member.user_id,
                title: "Member automatically removed",
                body: `${userName} was automatically deleted from ${familyName} after being blocked for a month.`,
                data: {
                  event_type: "member_auto_kicked",
                  family_id: membership.family_id,
                  kicked_user_id: membership.user_id,
                },
              },
            });
          } catch (pushError) {
            console.error("[auto-kick] Failed to notify family member:", pushError);
          }
        }
      }
    }

    console.log(`[auto-kick] Completed. Kicked ${kickedCount} members.`);
    return new Response(JSON.stringify({ ok: true, kicked: kickedCount }), { status: 200, headers: h });
  } catch (e: unknown) {
    console.error("[auto-kick] error:", e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: h });
  }
});
