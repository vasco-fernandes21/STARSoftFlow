import { Resend } from 'resend'
import { env } from '@/env.js'

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

const resend = new Resend(env.RESEND_API_KEY);

export async function sendEmail({ to, subject, html }: EmailParams) {
  // Extrair a URL do convite do HTML
  const urlMatch = html.match(/href="([^"]*)"/) || [];
  const inviteUrl = urlMatch[1] || "URL não encontrada";
  
  // Modo de teste: apenas imprime no console
  if (process.env.NODE_ENV === "development" || process.env.EMAIL_TEST_MODE === "true") {
    console.log("\n==== EMAIL DE TESTE ====");
    console.log(`Para: ${to}`);
    console.log(`Assunto: ${subject}`);
    console.log(`URL de convite: ${inviteUrl}`);
    console.log("=======================\n");
    
    return { messageId: "test-mode", inviteUrl };
  }

  // Enviar email usando Resend
  const info = await resend.emails.send({
    from: `STAR Institute <${env.EMAIL_FROM}>`,
    to: [to],
    subject,
    html,
  });

  return info;
}