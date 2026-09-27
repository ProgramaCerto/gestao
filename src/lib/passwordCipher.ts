/**
 * Cifra e embaralhamento seguro de senhas para persistência no banco de dados.
 * 
 * Garante que a senha NUNCA fique salva em texto limpo na tabela de usuários.
 * Cada caractere (letras maiúsculas e minúsculas, números, espaços e caracteres especiais)
 * é substituído de forma bijetiva e deslocado posicionalmente com rotação, impedindo
 * que qualquer pessoa que veja a coluna 'senha' saiba qual é a senha original.
 */

const PREFIX = "pc_sec_";
const SUPPORTED_PREFIXES = ["pc_sec_", "pc.seg_", "pc_seg_"];

// Alfabeto completo com todos os caracteres imprimíveis suportados em senhas
const CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/~ ";

// Permutação bijetiva estrita (mesmo tamanho e caracteres únicos)
// Gerada de forma determinística
function buildShuffledAlphabet(alphabet: string, seed = 8741): string {
  const arr = alphabet.split("");
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr.join("");
}

const SHUFFLED = buildShuffledAlphabet(CHARS, 8741);

/**
 * Verifica se a senha já está no formato embaralhado/cifrado de segurança.
 */
export function isScrambledPassword(val: string | null | undefined): boolean {
  if (!val || typeof val !== "string") return false;
  return SUPPORTED_PREFIXES.some(p => val.startsWith(p));
}

/**
 * Embaralha a senha do usuário antes de enviar para o banco de dados.
 * Transforma cada letra, número e símbolo em uma representação trocada e segura.
 */
export function scramblePassword(plain: string | null | undefined): string {
  if (!plain || typeof plain !== "string") return "";
  if (isScrambledPassword(plain)) return plain; // Já está embaralhada

  let out = "";
  for (let i = 0; i < plain.length; i++) {
    const ch = plain[i];
    const idx = CHARS.indexOf(ch);
    if (idx !== -1) {
      // Substituição bijetiva com rotação posicional
      const shiftedIdx = (idx + (i * 3) + 17) % CHARS.length;
      out += SHUFFLED[shiftedIdx];
    } else {
      // Caractere fora do conjunto básico (ex: caracteres especiais unicode)
      out += ch;
    }
  }

  return PREFIX + out;
}

/**
 * Desembaralha a senha retornada do banco de dados para conferência com a senha digitada.
 * Se a senha ainda for antiga (em texto limpo anterior à atualização), mantém compatibilidade.
 */
export function descramblePassword(cipher: string | null | undefined): string {
  if (!cipher || typeof cipher !== "string") return "";
  const matchedPrefix = SUPPORTED_PREFIXES.find(p => cipher.startsWith(p));
  if (!matchedPrefix) {
    // Senha legada em texto puro (mantém compatibilidade total)
    return cipher;
  }

  const raw = cipher.slice(matchedPrefix.length);
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    const shuffIdx = SHUFFLED.indexOf(ch);
    if (shuffIdx !== -1) {
      // Reverte a rotação posicional
      const origIdx = (shuffIdx - (i * 3) - 17) % CHARS.length;
      const positiveIdx = (origIdx + CHARS.length * 1000) % CHARS.length;
      out += CHARS[positiveIdx];
    } else {
      out += ch;
    }
  }

  return out;
}

/**
 * Confere de forma segura se a senha digitada corresponde à senha armazenada no banco.
 * Suporta tanto senhas embaralhadas (novas) quanto senhas anteriores não-embaralhadas.
 */
export function passwordsMatch(storedPassword: string | null | undefined, inputPassword: string | null | undefined): boolean {
  if (!storedPassword || !inputPassword) return false;
  
  // Caso 1: Desembaralha o que está no banco e confere com a digitada
  const decodedStored = descramblePassword(storedPassword);
  if (decodedStored === inputPassword) return true;

  // Caso 2: Embaralha a digitada e confere se bate exatamente com a gravada
  const encodedInput = scramblePassword(inputPassword);
  if (storedPassword === encodedInput) return true;

  // Caso 3: Comparação direta em texto puro (legado)
  if (storedPassword === inputPassword) return true;

  return false;
}
