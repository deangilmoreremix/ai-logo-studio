import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
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
    const contentType = req.headers.get("content-type") || "";
    let file: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      file = formData.get("file") as File | null;
      if (!file) {
        return new Response(JSON.stringify({ error: "No file uploaded" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      const body = await req.json().catch(() => ({}));
      const fileUrl = body.file || body.url;
      if (fileUrl) {
        return new Response(JSON.stringify({ url: fileUrl }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!file) {
      return new Response(JSON.stringify({ error: "No file uploaded" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      return new Response(JSON.stringify({ error: "Invalid file type. Only PNG and JPG are allowed." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (file.size > 5 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "File size exceeds 5MB limit" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("MUAPI_API_KEY");

    if (!apiKey || apiKey.includes("your_") || apiKey.trim() === "") {
      const bytes = await file.arrayBuffer();
      const buffer = new Uint8Array(bytes);
      let binary = "";
      for (let i = 0; i < buffer.length; i++) {
        binary += String.fromCharCode(buffer[i]);
      }
      const base64 = btoa(binary);
      const dataUrl = `data:${file.type};base64,${base64}`;
      return new Response(JSON.stringify({ url: dataUrl }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getServiceClient();
    const fileExt = file.name.split(".").pop() || "png";
    const filePath = `sketches/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("sketches")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("[UPLOAD_SKETCH] Storage upload error:", uploadError);
      const fd = new FormData();
      fd.append("file", file);
      const uploadRes = await fetch("https://api.muapi.ai/api/v1/upload_file", {
        method: "POST",
        headers: { "x-api-key": apiKey },
        body: fd,
      });
      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(`MuAPI upload failed: ${uploadRes.status} ${errText}`);
      }
      const result = await uploadRes.json();
      const muUrl = result.url || result.file_url;
      if (!muUrl) throw new Error("No URL returned from MuAPI upload");
      return new Response(JSON.stringify({ url: muUrl }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: publicData } = supabase.storage
      .from("sketches")
      .getPublicUrl(filePath);

    return new Response(JSON.stringify({ url: publicData.publicUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[UPLOAD_SKETCH_ERROR]", err);
    const message = err instanceof Error ? err.message : "Failed to upload sketch";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
