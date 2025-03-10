import { sendEmail } from "@/lib/email";

export async function sendPasswordResetEmail(email: string, resetLink: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: "Recuperação de Password",
    html: `
      <p>Foi solicitada a recuperação de password para a sua conta.</p>
      <p>Clique no link abaixo para definir uma nova password:</p>
      <a href="${resetLink}">Redefinir Password</a>
      <p>Este link é válido por 24 horas.</p>
      <p>Se você não solicitou esta alteração, ignore este email.</p>
    `
  });
}

export async function sendPrimeiroAcessoEmail(email: string, accessLink: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: "Bem-vindo - Primeiro Acesso",
    html: `
      <p>Bem-vindo ao sistema!</p>
      <p>Clique no link abaixo para definir a sua password:</p>
      <a href="${accessLink}">Definir Password</a>
      <p>Este link é válido por 24 horas.</p>
    `
  });
} 