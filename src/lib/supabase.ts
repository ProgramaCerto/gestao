import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getProtectedEndpoint, getProtectedSecret } from "./securityCipher";

// Carregamento protegido e blindado sem credenciais expostas em texto puro no código
let resolvedUrl = getProtectedEndpoint();
let resolvedKey = getProtectedSecret();

// Normalização segura de URLs
if (resolvedUrl) {
  resolvedUrl = resolvedUrl.trim();
  if (resolvedUrl.endsWith("/rest/v1/")) {
    resolvedUrl = resolvedUrl.slice(0, -9);
  } else if (resolvedUrl.endsWith("/rest/v1")) {
    resolvedUrl = resolvedUrl.slice(0, -8);
  }
  if (resolvedUrl.endsWith("/")) {
    resolvedUrl = resolvedUrl.slice(0, -1);
  }
}

export const isSupabaseConfigured = !!(resolvedUrl && resolvedKey);

// Cliente seguro inicializado com parâmetros protegidos
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(resolvedUrl, resolvedKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    })
  : null;
