// Função para gerar UUID v4 que funciona tanto no cliente quanto no servidor
export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Função para gerar token que só deve ser usada no servidor
export function generateToken(): string {
  // Verificar se estamos no servidor
  if (typeof window === "undefined") {
    const crypto = require("crypto");
    return crypto.randomBytes(32).toString("hex");
  }
  // Fallback para cliente (não deve ser usado)
  console.warn(
    "generateToken() foi chamado no cliente. Esta função só deve ser usada no servidor."
  );
  return generateUUID();
}
