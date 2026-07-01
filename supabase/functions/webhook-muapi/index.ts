import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

interface MuApiWebhookPayload {
  id?: string;
  requestId?: string;
  request_id?: string;
  status?: string;
  outputs?: string[];
  output?: string[];
  resultImage?: string;
  result_image?: string;
  error?: string;
  error_message?: string;
  errorMessage?: string;
  prompt?: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const payload: MuApiWebhookPayload = await req.json();

    const requestId =
      payload.id ||
      payload.requestId ||
      payload.request_id ||
      "";

    if (!requestId) {
      console.error("Webhook received payload without id or requestId:", payload);
      return new Response(
        JSON.stringify({ error: "Missing request identifier" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Webhook received for requestId: ${String(requestId)}, status: ${String(payload.status ?? "unknown")}`);

    const { data: existingLogo, error: fetchError } = await supabase
      .from("logo_creations")
      .select("*")
      .eq("request_id", String(requestId))
      .maybeSingle();

    if (fetchError) {
      console.error("Logo lookup error:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to lookup logo" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!existingLogo) {
      console.warn(`No logo found for requestId: ${String(requestId)}`);
      return new Response(
        JSON.stringify({ error: "Logo not found", requestId }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const normalizedStatus = String(payload.status ?? "").toLowerCase();

    if (normalizedStatus === "completed") {
      const outputs = payload.outputs ?? payload.output ?? [];
      const resultImage =
        Array.isArray(outputs) && outputs.length > 0
          ? outputs[0]
          : payload.resultImage || payload.result_image || null;

      if (!resultImage) {
        console.warn(`Logo ${existingLogo.id} completed but no output images found`);
      }

      const { error: updateError } = await supabase
        .from("logo_creations")
        .update({
          status: "completed",
          result_image: resultImage,
          completed_at: new Date().toISOString(),
        })
        .eq("id", existingLogo.id);

      if (updateError) {
        console.error("Logo update error:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update logo" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          logoId: existingLogo.id,
          status: "completed",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (
      normalizedStatus === "failed" ||
      normalizedStatus === "error" ||
      normalizedStatus === "cancelled"
    ) {
      const errorMessage =
        payload.error ||
        payload.error_message ||
        payload.errorMessage ||
        "Generation failed";

      const { error: updateError } = await supabase
        .from("logo_creations")
        .update({
          status: "failed",
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq("id", existingLogo.id);

      if (updateError) {
        console.error("Logo update error:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update logo" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          logoId: existingLogo.id,
          status: "failed",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { error: updateError } = await supabase
      .from("logo_creations")
      .update({
        status: normalizedStatus || "processing",
      })
      .eq("id", existingLogo.id);

    if (updateError) {
      console.error("Logo update error:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        logoId: existingLogo.id,
        status: normalizedStatus || "processing",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Webhook endpoint error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
