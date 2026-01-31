import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Create Supabase client with the user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user with anon client
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Use service role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Delete user data from all tables (in correct order to respect foreign keys)
    // Note: Some tables have ON DELETE CASCADE, but we'll be explicit

    // Delete celebration events
    await supabaseAdmin.from("celebration_events").delete().eq("user_id", userId);

    // Delete user badges
    await supabaseAdmin.from("user_badges").delete().eq("user_id", userId);

    // Delete user character images
    await supabaseAdmin.from("user_character_images").delete().eq("user_id", userId);

    // Delete goals
    await supabaseAdmin.from("goals").delete().eq("user_id", userId);

    // Delete tasks assigned to or by user
    await supabaseAdmin.from("tasks").delete().eq("assigned_to", userId);
    await supabaseAdmin.from("tasks").delete().eq("assigned_by", userId);

    // Delete task events
    await supabaseAdmin.from("task_events").delete().eq("actor_id", userId);
    await supabaseAdmin.from("task_events").delete().eq("recipient_id", userId);

    // Delete chat messages
    await supabaseAdmin.from("chat_messages").delete().eq("user_id", userId);

    // Delete FCM tokens
    await supabaseAdmin.from("user_fcm_tokens").delete().eq("user_id", userId);

    // Delete device tokens
    await supabaseAdmin.from("device_tokens").delete().eq("user_id", userId);

    // Delete user families memberships
    await supabaseAdmin.from("user_families").delete().eq("user_id", userId);

    // Delete profile
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    // Delete user from auth (this is the final step)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Error deleting auth user:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to delete account" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Account deleted successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in delete-account function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
