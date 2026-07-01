const config = {
  appName: "AI Logo Studio",
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  ai: {
    apiKey: process.env.MUAPI_API_KEY,
    baseUrl: "https://api.muapi.ai/api/v1",
  },
};

export default config;
