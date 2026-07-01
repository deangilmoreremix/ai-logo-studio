import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-igin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-anonymous-session-id",
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
    const body = await req.json();
    const { prompt, aspectRatio, resolution, inputImage, sessionId } = body;

    if (!prompt || !sessionId) {
      return new Response(JSON.stringify({ error: "Missing prompt or sessionId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("MUAPI_API_KEY");
    const modelType = inputImage ? "nano-banana-pro-edit" : "nano-banana-pro";
    const cost = resolution === "4k" ? 36 : 18;

    const supabase = getServiceClient();

    const { data: creation, error: insertError } = await supabase
      .from("logo_creations")
      .insert({
        session_id: sessionId,
        prompt,
        aspect_ratio: aspectRatio || "1:1",
        resolution: resolution || "1k",
        input_image: inputImage || null,
        status: "processing",
        credit_cost: cost,
      })
      .select()
      .single();

    if (insertError || !creation) {
      console.error("[GENERATE_LOGO] Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let requestId = `mock_${Date.now()}`;

    if (apiKey && !apiKey.includes("your_") && apiKey.trim() !== "") {
      try {
        const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/muapi-webhook`;
        const submitUrl = `https://api.muapi.ai/api/v1/${modelType}?webhook=${encodeURIComponent(webhookUrl)}`;

        const inputPayload: any = {
          prompt,
          aspect_ratio: aspectRatio || "1:1",
          resolution: resolution || "1k",
        };
        if (inputImage) {
          inputPayload.images_list = [inputImage];
        }

        const submitRes = await fetch(submitUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
          },
          body: JSON.stringify(inputPayload),
        });

        if (submitRes.ok) {
          const resJson = await submitRes.json();
          const reqId = resJson.request_id || resJson.id;
          if (reqId) {
            requestId = reqId;
            await supabase
              .from("logo_creations")
              .update({ request_id: requestId })
              .eq("id", creation.id);
          }
        } else {
          console.warn("[GENERATE_LOGO] MuAPI submission failed:", submitRes.status);
        }
      } catch (err) {
        console.warn("[GENERATE_LOGO] MuAPI call failed, using mock:", err.message);
      }
    }

    const { data: updated } = await supabase
      .from("logo_creations")
      .update({ request_id: requestId })
      .eq("id", creation.id)
      .select()
      .single();

    return new Response(JSON.stringify(updated || creation), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[GENERATE_LOGO_ERROR]", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
