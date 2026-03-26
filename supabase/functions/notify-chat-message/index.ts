// Edge function: Send push notifications for new chat messages to all family members except sender
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

    const { chatMessageId, familyId, senderId, senderName, content } = await req.json();

    if (!familyId || !senderId) {
      return new Response(JSON.stringify({ error: "familyId and senderId required" }), {
        status: 400, headers: corsHeaders,
      });
    }

    console.log("[notify-chat] Sending push for chat message in family:", familyId);

    // Get all family members except sender
    const { data: members, error: membersError } = await supabase
      .from("user_families")
      .select("user_id")
      .eq("family_id", familyId)
      .neq("user_id", senderId);

    if (membersError) {
      console.error("[notify-chat] Error fetching members:", membersError);
      return new Response(JSON.stringify({ error: "Failed to fetch members" }), {
        status: 500, headers: corsHeaders,
      });
    }

    if (!members || members.length === 0) {
      console.log("[notify-chat] No other members to notify");
      return new Response(JSON.stringify({ ok: true, notified: 0 }), {
        status: 200, headers: corsHeaders,
      });
    }

    const displayName = senderName || "Family member";
    const messagePreview = (content || "").slice(0, 100);
    const title = `${displayName}`;
    const body = messagePreview;

    // Send push to each member via send-push
    const results = await Promise.all(
      members.map(async (m) => {
        try {
          const resp = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              recipientId: m.user_id,
              title,
              body,
              data: {
                type: "chat_message",
                event_type: "chat_message",
                familyId: familyId,
                family_id: familyId,
                chatMessageId: chatMessageId || "",
                senderId: senderId,
                preview: messagePreview,
              },
            }),
          });
          return { userId: m.user_id, ok: resp.ok };
        } catch (e) {
          console.error(`[notify-chat] Failed to send to ${m.user_id}:`, e);
          return { userId: m.user_id, ok: false };
        }
      })
    );

    const sent = results.filter((r) => r.ok).length;
    console.log(`[notify-chat] Sent to ${sent}/${members.length} members`);

    return new Response(JSON.stringify({ ok: true, notified: sent }), {
      status: 200, headers: corsHeaders,
    });
  } catch (e: unknown) {
    console.error("[notify-chat] Error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: corsHeaders,
    });
  }
});
