import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-session-id, Authorization",
  "Access-Control-Max-Age": "86400",
};

interface GenerateRequest {
  prompt: string;
  aspectRatio?: string;
  resolution?: string;
  inputImage?: string;
  smartSearch?: boolean;
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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const muapiKey = Deno.env.get("MUAPIAPP_API_KEY");
    const webhookUrl = Deno.env.get("WEBHOOK_URL") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const sessionId = req.headers.get("x-session-id");
    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "Missing x-session-id header" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const body = (await req.json()) as GenerateRequest;
    const { prompt, aspectRatio = "1:1", resolution = "1k", inputImage } = body;

    if (!prompt || !prompt.trim()) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const cost = resolution === "4k" ? 36 : 18;

    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    let muapiRequestId: string | null = null;
    let status = "processing";
    let initialResultImage: string | null = null;

    if (muapiKey && !muapiKey.includes("your_") && muapiKey.trim() !== "") {
      try {
        const modelType = inputImage ? "nano-banana-pro-edit" : "nano-banana-pro";
        const submitUrl = `https://api.muapi.ai/api/v1/${modelType}?webhook=${encodeURIComponent(webhookUrl)}`;

        const inputPayload: Record<string, unknown> = {
          prompt,
          aspect_ratio: aspectRatio,
          resolution,
        };

        if (inputImage) {
          inputPayload.images_list = [inputImage];
        }

        const submitRes = await fetch(submitUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": muapiKey,
          },
          body: JSON.stringify(inputPayload),
        });

        if (submitRes.ok) {
          const resJson = await submitRes.json();
          muapiRequestId = resJson.request_id || resJson.id || resJson.requestId || null;
          if (!muapiRequestId) {
            console.error("MuAPI response missing request_id:", resJson);
            muapiRequestId = requestId;
          }
        } else {
          const errText = await submitRes.text();
          console.error("MuAPI submission failed:", submitRes.status, errText);
          muapiRequestId = requestId;
        }
      } catch (err) {
        console.warn("MuAPI call failed:", err.message);
        muapiRequestId = requestId;
      }
    } else {
      muapiRequestId = requestId;
    }

    const { data: creation, error: createError } = await supabase
      .from("logo_creations")
      .insert({
        session_id: sessionId,
        prompt,
        aspect_ratio: aspectRatio,
        resolution,
        input_image: inputImage,
        result_image: initialResultImage,
        request_id: muapiRequestId,
        status,
        credit_cost: cost,
      })
      .select("*")
      .single();

    if (createError || !creation) {
      console.error("Database insert error:", createError);
      return new Response(
        JSON.stringify({ error: "Failed to create logo record", details: createError?.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return new Response(JSON.stringify(creation), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Generate endpoint error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
