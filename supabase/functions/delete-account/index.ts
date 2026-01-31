import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Helper function to delete a family and all its related data
async function deleteFamilyCompletely(supabaseAdmin: ReturnType<typeof createClient>, familyId: string) {
  console.log(`Deleting family ${familyId} and all related data...`);
  
  // Delete in order respecting foreign keys
  await supabaseAdmin.from("task_events").delete().eq("family_id", familyId);
  await supabaseAdmin.from("tasks").delete().eq("family_id", familyId);
  await supabaseAdmin.from("task_templates").delete().eq("family_id", familyId);
  await supabaseAdmin.from("task_categories").delete().eq("family_id", familyId);
  await supabaseAdmin.from("chat_messages").delete().eq("family_id", familyId);
  await supabaseAdmin.from("goals").delete().eq("family_id", familyId);
  await supabaseAdmin.from("user_badges").delete().eq("family_id", familyId);
  await supabaseAdmin.from("celebration_events").delete().eq("family_id", familyId);
  await supabaseAdmin.from("device_tokens").delete().eq("family_id", familyId);
  await supabaseAdmin.from("family_sync_events").delete().eq("family_id", familyId);
  await supabaseAdmin.from("user_families").delete().eq("family_id", familyId);
  
  // Clear active_family_id references in profiles
  await supabaseAdmin
    .from("profiles")
    .update({ active_family_id: null })
    .eq("active_family_id", familyId);
  
  // Finally delete the family itself
  await supabaseAdmin.from("families").delete().eq("id", familyId);
  
  console.log(`Family ${familyId} deleted successfully`);
}

Deno.serve(async (req) => {
  // Log request details for debugging
  console.log("[delete-account] Request:", req.method, "Origin:", req.headers.get("Origin"), "Preflight-Headers:", req.headers.get("Access-Control-Request-Headers"));

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
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
    console.log(`Starting account deletion for user: ${userId}`);

    // Use service role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // =============================================
    // STEP 1: Handle families where user is a member
    // Delete family if user is the LAST member, otherwise just leave
    // =============================================
    
    // Get all families where user is a member
    const { data: memberFamilies, error: memberFamiliesError } = await supabaseAdmin
      .from("user_families")
      .select("family_id")
      .eq("user_id", userId);

    if (memberFamiliesError) {
      console.error("Error fetching user families:", memberFamiliesError);
    }

    if (memberFamilies && memberFamilies.length > 0) {
      console.log(`User is a member of ${memberFamilies.length} families`);
      
      for (const membership of memberFamilies) {
        const familyId = membership.family_id;
        
        // Count remaining members (excluding current user)
        const { count, error: countError } = await supabaseAdmin
          .from("user_families")
          .select("*", { count: "exact", head: true })
          .eq("family_id", familyId)
          .neq("user_id", userId);

        if (countError) {
          console.error(`Error counting members for family ${familyId}:`, countError);
          continue;
        }

        if (count === 0) {
          // User is the last member - delete entire family
          console.log(`Family ${familyId} has no other members - deleting completely`);
          await deleteFamilyCompletely(supabaseAdmin, familyId);
        } else {
          console.log(`Family ${familyId} has ${count} other members - family will continue`);
          // Family continues to exist, user's membership will be deleted in Step 2
        }
      }
    }

    // =============================================
    // STEP 2: Delete user's personal data from all tables
    // =============================================
    console.log("Deleting user's personal data...");

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

    // =============================================
    // STEP 3: Delete user from auth (final step)
    // =============================================
    console.log("Deleting auth user...");
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Error deleting auth user:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to delete account" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Account deletion completed successfully for user: ${userId}`);
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
