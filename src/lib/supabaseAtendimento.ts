import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getProtectedAtendimentoEndpoint, getProtectedAtendimentoSecret } from "./securityCipher";

/**
 * Cliente Supabase DEDICADO e EXCLUSIVO para a Central de Atendimento.
 * 
 * Este cliente é 100% isolado do projeto principal de login, alunos e cursos.
 * As credenciais são carregadas do cofre seguro criptografado em runtime.
 */

let atendimentoUrl = getProtectedAtendimentoEndpoint();
let atendimentoKey = getProtectedAtendimentoSecret();

// Normalização de URL
if (atendimentoUrl) {
  atendimentoUrl = atendimentoUrl.trim();
  if (atendimentoUrl.endsWith("/rest/v1/")) {
    atendimentoUrl = atendimentoUrl.slice(0, -9);
  } else if (atendimentoUrl.endsWith("/rest/v1")) {
    atendimentoUrl = atendimentoUrl.slice(0, -8);
  }
  if (atendimentoUrl.endsWith("/")) {
    atendimentoUrl = atendimentoUrl.slice(0, -1);
  }
}

export const isSupabaseAtendimentoConfigured = !!(atendimentoUrl && atendimentoKey);

export const supabaseAtendimento: SupabaseClient | null = isSupabaseAtendimentoConfigured
  ? createClient(atendimentoUrl, atendimentoKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    })
  : null;

export const getAtendimentoClient = (): SupabaseClient | null => {
  return supabaseAtendimento;
};
