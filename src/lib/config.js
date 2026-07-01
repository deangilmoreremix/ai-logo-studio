const config = {
  appName: "AI Logo Studio",
  ai: {
    apiKey: process.env.MUAPIAPP_API_KEY,
  },
  webhookUrl: process.env.WEBHOOK_URL || "https://bzxohkrxcwodllketcpz.supabase.co/functions/v1/webhook-muapi",
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bzxohkrxcwodllketcpz.supabase.co",
  },
};

export default config;
