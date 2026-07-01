import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, serviceKey);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const data = await req.json();
    const requestId = data.id || data.request_id;

    if (!requestId) {
      return new Response(JSON.stringify({ error: "Missing request id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getServiceClient();

    const { data: logo, error: findError } = await supabase
      .from("logo_creations")
      .select("*")
      .eq("request_id", requestId)
      .maybeSingle();

    if (findError || !logo) {
      return new Response(JSON.stringify({ error: "Logo not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (data.error && data.error !== "") {
      await supabase
        .from("logo_creations")
        .update({ status: "failed" })
        .eq("id", logo.id);
    } else {
      const outputs = data.outputs || [];
      const imageUrl = outputs.length > 0 ? outputs[0] : (typeof data.output === "string" ? data.output : data.output?.image || data.output?.urls?.get);

      if (imageUrl) {
        await supabase
          .from("logo_creations")
          .update({ status: "completed", result_image: imageUrl })
          .eq("id", logo.id);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[MUAPI_WEBHOOK_ERROR]", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
