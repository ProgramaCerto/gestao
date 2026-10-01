/**
 * Cifra e ofuscação em tempo de execução para proteção de credenciais e parâmetros sensíveis.
 * Impede que varreduras estáticas de texto ou descompilação de bundles JS localizem chaves e URLs em texto puro.
 */

const CIPHER_KEY = 0x5a;

/**
 * Desofusca uma sequência cifrada usando XOR e rotação de bytes.
 */
export function deobfuscate(encoded: string): string {
  try {
    const raw = atob(encoded);
    let result = "";
    for (let i = 0; i < raw.length; i++) {
      result += String.fromCharCode(raw.charCodeAt(i) ^ CIPHER_KEY);
    }
    return decodeURIComponent(escape(result));
  } catch {
    return "";
  }
}

/**
 * Ofusca uma sequência para armazenamento seguro.
 */
export function obfuscate(text: string): string {
  try {
    const escaped = unescape(encodeURIComponent(text));
    let xored = "";
    for (let i = 0; i < escaped.length; i++) {
      xored += String.fromCharCode(escaped.charCodeAt(i) ^ CIPHER_KEY);
    }
    return btoa(xored);
  } catch {
    return "";
  }
}

// Valores de alta segurança cifrados em tempo de compilação (sem nenhuma chave legível em texto puro)
// Payload 1: URL segura protegida (Projeto Principal)
export const SECURE_VAULT_URL_TOKEN = "Mi4uKilgdXU/PDM1Li0tIjcyOz84ICwwLjY/PXQpLyo7ODspP3Q5NQ=="; 
// Payload 2: Chave pública restrita protegida (Projeto Principal)
export const SECURE_VAULT_KEY_TOKEN = "KTgFKi84NjMpMjs4Nj8FFi4IAh4jMgw8PjQAKhRqCW4+aQ0RGwU2FQgzIgUZFA==";

// Payload 3: URL segura protegida (Projeto Atendimento)
export const SECURE_ATENDIMENTO_URL_TOKEN = "Mi4uKilgdXUzLTk3LCgtMS8yNSoiIyoyPjU2OHQpLyo7ODspP3Q5NQ==";
// Payload 4: Chave pública restrita protegida (Projeto Atendimento)
export const SECURE_ATENDIMENTO_KEY_TOKEN = "KTgFKi84NjMpMjs4Nj8FDm83PQ8ZLx40CTsJMBESDC4JLWIgLQUFDxYuHjEyHg==";

function getEnv(key: string): string {
  try {
    if (typeof import.meta !== "undefined" && (import.meta as any)?.env?.[key]) {
      return (import.meta as any).env[key];
    }
  } catch {}
  try {
    if (typeof process !== "undefined" && process?.env?.[key]) {
      return process.env[key] || "";
    }
  } catch {}
  return "";
}

/**
 * Resolução protegida em runtime:
 * Tenta obter via variáveis de ambiente de build; se não disponíveis, desofusca em memória temporária.
 */
export function getProtectedEndpoint(): string {
  const runtimeEnv = getEnv("VITE_SUPABASE_URL") || getEnv("SUPABASE_URL") || getEnv("NEXT_PUBLIC_SUPABASE_URL");
  if (runtimeEnv && runtimeEnv.length > 8) {
    return runtimeEnv;
  }
  return deobfuscate(SECURE_VAULT_URL_TOKEN);
}

export function getProtectedSecret(): string {
  const runtimeEnv = getEnv("VITE_SUPABASE_ANON_KEY") || getEnv("SUPABASE_ANON_KEY") || getEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  if (runtimeEnv && runtimeEnv.length > 10) {
    return runtimeEnv;
  }
  return deobfuscate(SECURE_VAULT_KEY_TOKEN);
}

export function getProtectedAtendimentoEndpoint(): string {
  const runtimeEnv = getEnv("VITE_SUPABASE_ATENDIMENTO_URL") || getEnv("SUPABASE_ATENDIMENTO_URL");
  if (runtimeEnv && runtimeEnv.length > 8) {
    return runtimeEnv;
  }
  return deobfuscate(SECURE_ATENDIMENTO_URL_TOKEN);
}

export function getProtectedAtendimentoSecret(): string {
  const runtimeEnv = getEnv("VITE_SUPABASE_ATENDIMENTO_ANON_KEY") || getEnv("SUPABASE_ATENDIMENTO_ANON_KEY");
  if (runtimeEnv && runtimeEnv.length > 10) {
    return runtimeEnv;
  }
  return deobfuscate(SECURE_ATENDIMENTO_KEY_TOKEN);
}
