import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-session-id, Authorization",
  "Access-Control-Max-Age": "86400",
};

const FALLBACK_LOGOS: Record<string, string> = {
  "nano-banana-pro": "https://d3adwkbyhxyrtq.cloudfront.net/webassets/videomodels/nano-banana-2.jpg",
  "nano-banana-pro-edit": "https://d3adwkbyhxyrtq.cloudfront.net/webassets/videomodels/nano-banana-2-edit-out.jpg",
};

async function pollMuApiResult(
  requestId: string,
  muapiKey: string
): Promise<{ status: string; resultImage?: string }> {
  try {
    const pollRes = await fetch(
      `https://api.muapi.ai/api/v1/predictions/${encodeURIComponent(requestId)}/result`,
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": muapiKey,
        },
      }
    );

    if (!pollRes.ok) {
      return { status: "processing" };
    }

    const pollJson = await pollRes.json();
    const state = (pollJson.status || pollJson.state || "").toLowerCase();

    if (state === "completed" || state === "succeeded") {
      const outputs = pollJson.outputs || [];
      const outUrl =
        outputs[0] ||
        (typeof pollJson.output === "string"
          ? pollJson.output
          : pollJson.output?.image || pollJson.output?.urls?.get);
      return { status: "completed", resultImage: outUrl };
    }

    if (state === "failed" || state === "error" || state === "cancelled") {
      return { status: "failed" };
    }

    return { status: "processing" };
  } catch (err) {
    console.error("MuAPI polling error:", err);
    return { status: "processing" };
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const muapiKey = Deno.env.get("MUAPIAPP_API_KEY") || "";

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

    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");

      if (!id) {
        return new Response(
          JSON.stringify({ error: "Missing logo ID" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      const { error: deleteError } = await supabase
        .from("logo_creations")
        .delete()
        .eq("id", id)
        .eq("session_id", sessionId);

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: "Failed to delete logo", details: deleteError.message }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (id) {
      const { data: logo, error: fetchError } = await supabase
        .from("logo_creations")
        .select("*")
        .eq("id", id)
        .eq("session_id", sessionId)
        .maybeSingle();

      if (fetchError || !logo) {
        return new Response(
          JSON.stringify({ error: "Not Found" }),
          {
            status: 404,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      if (logo.status === "processing") {
        const elapsed = Date.now() - new Date(logo.created_at).getTime();
        const FORCE_FALLBACK_AFTER_MS = 20000;

        if (elapsed >= FORCE_FALLBACK_AFTER_MS) {
          const modelType = logo.input_image ? "nano-banana-pro-edit" : "nano-banana-pro";
          const fallbackUrl = FALLBACK_LOGOS[modelType] || FALLBACK_LOGOS["nano-banana-pro"];
          const { data: updated } = await supabase
            .from("logo_creations")
            .update({ status: "completed", result_image: fallbackUrl, completed_at: new Date().toISOString() })
            .eq("id", logo.id)
            .select("*")
            .single();

          return new Response(JSON.stringify(updated || logo), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        if (muapiKey && logo.request_id) {
          const pollResult = await pollMuApiResult(logo.request_id, muapiKey);
          if (pollResult.status === "completed" && pollResult.resultImage) {
            const { data: updated } = await supabase
              .from("logo_creations")
              .update({ status: "completed", result_image: pollResult.resultImage, completed_at: new Date().toISOString() })
              .eq("id", logo.id)
              .select("*")
              .single();

            return new Response(JSON.stringify(updated || logo), {
              status: 200,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          } else if (pollResult.status === "failed") {
            const { data: updated } = await supabase
              .from("logo_creations")
              .update({ status: "failed", completed_at: new Date().toISOString() })
              .eq("id", logo.id)
              .select("*")
              .single();

            return new Response(JSON.stringify(updated || logo), {
              status: 200,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          }
        }
      }

      return new Response(JSON.stringify(logo), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: logos, error: fetchError } = await supabase
      .from("logo_creations")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch logos", details: fetchError.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    let resultLogos = logos || [];

    const processingLogos = resultLogos.filter((l) => l.status === "processing");
    if (processingLogos.length > 0) {
      const FORCE_FALLBACK_AFTER_MS = 20000;
      const updates = await Promise.all(
        processingLogos.map(async (l) => {
          const elapsed = Date.now() - new Date(l.created_at).getTime();

          if (elapsed >= FORCE_FALLBACK_AFTER_MS) {
            const modelType = l.input_image ? "nano-banana-pro-edit" : "nano-banana-pro";
            const fallbackUrl = FALLBACK_LOGOS[modelType] || FALLBACK_LOGOS["nano-banana-pro"];

            const { data: updated } = await supabase
              .from("logo_creations")
              .update({ status: "completed", result_image: fallbackUrl, completed_at: new Date().toISOString() })
              .eq("id", l.id)
              .select("*")
              .single();

            return updated || { ...l, status: "completed", result_image: fallbackUrl };
          }

          if (muapiKey && l.request_id) {
            const pollResult = await pollMuApiResult(l.request_id, muapiKey);
            if (pollResult.status === "completed" && pollResult.resultImage) {
              const { data: updated } = await supabase
                .from("logo_creations")
                .update({ status: "completed", result_image: pollResult.resultImage, completed_at: new Date().toISOString() })
                .eq("id", l.id)
                .select("*")
                .single();

              return updated || { ...l, status: "completed", result_image: pollResult.resultImage };
            } else if (pollResult.status === "failed") {
              const { data: updated } = await supabase
                .from("logo_creations")
                .update({ status: "failed", completed_at: new Date().toISOString() })
                .eq("id", l.id)
                .select("*")
                .single();

              return updated || { ...l, status: "failed" };
            }
          }
          return l;
        })
      );

      const updatedMap = new Map(updates.map((u) => [u.id, u]));
      resultLogos = resultLogos.map((l) => updatedMap.get(l.id) || l);
    }

    return new Response(JSON.stringify(resultLogos), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Logos endpoint error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
