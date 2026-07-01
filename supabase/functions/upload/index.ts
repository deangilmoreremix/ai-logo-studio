import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-session-id, Authorization",
  "Access-Control-Max-Age": "86400",
};

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

    const contentType = req.headers.get("content-type") || "";

    let fileBuffer: ArrayBuffer;
    let fileName: string;
    let mimeType: string;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");

      if (!file || !(file instanceof File)) {
        return new Response(
          JSON.stringify({ error: "No file uploaded" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      fileBuffer = await file.arrayBuffer();
      fileName = file.name;
      mimeType = file.type;
    } else {
      const body = await req.json();
      const fileData = body.file;

      if (!fileData) {
        return new Response(
          JSON.stringify({ error: "No file data provided" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      if (typeof fileData === "string") {
        return new Response(
          JSON.stringify({ url: fileData }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      const base64Data = fileData.data || fileData;
      const base64String = typeof base64Data === "string" ? base64Data : String(base64Data);
      const binaryString = atob(base64String);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      fileBuffer = bytes.buffer;
      fileName = fileData.name || `upload_${Date.now()}.png`;
      mimeType = fileData.type || "image/png";
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!allowedTypes.includes(mimeType)) {
      return new Response(
        JSON.stringify({ error: "Invalid file type. Only PNG and JPG are allowed." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (fileBuffer.byteLength > 5 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "File size exceeds 5MB limit" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const sessionId = req.headers.get("x-session-id") || "anonymous";
    const fileExtension = fileName.split(".").pop() || "png";
    const storageFileName = `${sessionId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExtension}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("generated-images")
      .upload(storageFileName, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      const base64 = btoa(
        new Uint8Array(fileBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );
      const dataUrl = `data:${mimeType};base64,${base64}`;

      return new Response(
        JSON.stringify({ url: dataUrl, fallback: true }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from("generated-images")
      .getPublicUrl(storageFileName);

    const publicUrl = publicUrlData?.publicUrl || "";

    return new Response(
      JSON.stringify({ url: publicUrl, path: storageFileName }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Upload endpoint error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
