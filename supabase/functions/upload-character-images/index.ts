import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Upload all character images from public folder
    const imageFiles = [
      'male_stage_000.png', 'male_stage_050.png', 'male_stage_200.png', 'male_stage_350.png',
      'male_stage_500.png', 'male_stage_600.png', 'male_stage_700.png', 'male_stage_800.png',
      'female_stage_000.png', 'female_stage_050.png', 'female_stage_200.png', 'female_stage_350.png',
      'female_stage_500.png', 'female_stage_600.png', 'female_stage_700.png', 'female_stage_800.png'
    ]

    const results = []
    for (const fileName of imageFiles) {
      const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/storage/v1/object/character-images/${fileName}`)
      if (response.ok) {
        const imageData = await response.blob()
        const { error } = await supabaseClient.storage
          .from('character-images')
          .upload(fileName, imageData, { upsert: true })
        
        results.push({ fileName, success: !error, error })
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})