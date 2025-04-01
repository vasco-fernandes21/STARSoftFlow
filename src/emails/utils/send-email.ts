import { Resend } from "resend";
import fs from "fs/promises";
import path from "path";
import Handlebars from "handlebars";
import { env } from "@/env";

// Mapa de templates disponíveis
const EMAIL_TEMPLATES = {
  welcome: {
    subject: "Bem-vindo ao STARSoftFlow",
    template: "welcome.html",
  },
  resetPassword: {
    subject: "Redefinir palavra-passe",
    template: "reset-password.html",
  },
  inviteUser: {
    subject: "Convite para o STARSoftFlow",
    template: "invite-user.html",
  },
  notification: {
    subject: "Notificação do STARSoftFlow",
    template: "notification.html",
  },
} as const;

type EmailType = keyof typeof EMAIL_TEMPLATES;

interface SendEmailOptions {
  to: string;
  type: EmailType;
  variables: Record<string, any>;
}

// Função para carregar e compilar o template
async function loadTemplate(templateName: string) {
  const templatePath = path.join(process.cwd(), "src/emails/templates", templateName);
  const template = await fs.readFile(templatePath, "utf-8");
  return Handlebars.compile(template);
}

// Função para debug do email em ambiente de desenvolvimento/teste
function debugEmail(to: string, subject: string, html: string) {
  // Extrair todos os links do HTML (completos e relativos)
  const linkRegex = /href=["']([^"']+)["']/g;
  const links: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html)) !== null) {
    if (match[1]) {
      links.push(match[1]);
    }
  }

  // Procurar também por URLs completos no texto
  const urlRegex = /(https?:\/\/[^\s"'<>]+)/g;
  let urlMatch: RegExpExecArray | null;

  while ((urlMatch = urlRegex.exec(html)) !== null) {
    if (urlMatch[1] && !links.includes(urlMatch[1])) {
      links.push(urlMatch[1]);
    }
  }

  console.log("\n");
  console.log("╔═════════════════════════════════════════════════════╗");
  console.log("║                  EMAIL DE TESTE                     ║");
  console.log("╚═════════════════════════════════════════════════════╝");
  console.log(`📧 PARA: ${to}`);
  console.log(`📑 ASSUNTO: ${subject}`);
  console.log("📄 CONTEÚDO HTML:");
  console.log(html);

  // Destacar links encontrados
  if (links.length > 0) {
    console.log("\n🔗 LINKS ENCONTRADOS NO EMAIL:");
    links.forEach((link, _index) => {
      // Verificar se é um link da aplicação
      const isAppLink = link.includes(env.NEXT_PUBLIC_APP_URL) || link.startsWith("/");

      if (isAppLink) {
        console.log(`🌐 Link da aplicação ${_index + 1}: \x1b[36m${link}\x1b[0m`);
      } else {
        console.log(`🔗 Link externo ${_index + 1}: ${link}`);
      }
    });
  }

  // Procurar e destacar tokens de autenticação
  const tokenRegex = /[?&]token=([^&"']+)/g;
  const tokens: string[] = [];
  let tokenMatch: RegExpExecArray | null;

  while ((tokenMatch = tokenRegex.exec(html)) !== null) {
    if (tokenMatch[1]) {
      tokens.push(tokenMatch[1]);
    }
  }

  if (tokens.length > 0) {
    console.log("\n🔑 TOKENS ENCONTRADOS:");
    tokens.forEach((token, _index) => {
      console.log(`   Token ${_index + 1}: \x1b[33m${token}\x1b[0m`);
    });
  }

  // Destacar links diretos para facilitar o teste
  const actionLinks: string[] = [];

  for (const link of links) {
    if (
      link.includes("/primeiro-login") ||
      link.includes("/reset-password") ||
      link.includes("/verify-email") ||
      link.includes("/confirm-account")
    ) {
      actionLinks.push(link);
    }
  }

  if (actionLinks.length > 0) {
    console.log("\n🔐 LINKS DE AÇÃO RÁPIDA:");
    actionLinks.forEach((link, _index) => {
      console.log(`   \x1b[32m${link}\x1b[0m`);
    });
    console.log("\n   👆 COPIE UM DOS LINKS ACIMA PARA TESTAR DIRETAMENTE 👆");
  }

  console.log("\n═════════════════════════════════════════════════════");

  return {
    success: true,
    messageId: "test-mode-email-id",
    testMode: true,
  };
}

// Inicializar o cliente Resend
const resend = new Resend(env.RESEND_API_KEY);

// Função principal para enviar emails
export async function sendEmail({ to, type, variables }: SendEmailOptions) {
  try {
    // Validar configurações de email
    if (!env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY não está configurada");
    }

    if (!env.RESEND_FROM_EMAIL) {
      throw new Error("RESEND_FROM_EMAIL não está configurada");
    }

    // Obter configuração do template
    const templateConfig = EMAIL_TEMPLATES[type];
    if (!templateConfig) {
      throw new Error(`Template de email "${type}" não encontrado`);
    }

    // Carregar e compilar o template
    const template = await loadTemplate(templateConfig.template);

    // Adicionar variáveis padrão
    const defaultVariables = {
      currentYear: new Date().getFullYear(),
      logoUrl: "https://starinstitute.pt/wp-content/uploads/2023/10/STAR_Logo-Principal_Cores-2048x374.png",
      baseUrl: env.NEXT_PUBLIC_APP_URL,
    };

    // Compilar o HTML com as variáveis
    const html = template({
      ...defaultVariables,
      ...variables,
    });

    // Verificar se estamos em ambiente de desenvolvimento ou modo de teste
    const isDev = process.env.NODE_ENV === "development";
    const isTestMode = process.env.EMAIL_TEST_MODE === "true";

    // Debug dos valores atuais
    console.log("\n");
    console.log("╔═════════════════════════════════════════════════════╗");
    console.log("║               CONFIGURAÇÃO EMAIL                    ║");
    console.log("╚═════════════════════════════════════════════════════╝");
    console.log(`📧 RESEND_API_KEY: ${env.RESEND_API_KEY ? "Configurada" : "Não configurada"}`);
    console.log(`📧 RESEND_FROM_EMAIL: ${env.RESEND_FROM_EMAIL}`);
    console.log(`📑 NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`📑 EMAIL_TEST_MODE: ${process.env.EMAIL_TEST_MODE}`);
    console.log(
      `📑 MODO DE ENVIO: ${isTestMode || isDev ? "Teste/Dev (apenas log)" : "Produção (envio real)"}`
    );

    // FORÇAR ENVIO REAL independente do ambiente
    const forceRealSend = true;

    if ((isTestMode || isDev) && !forceRealSend) {
      return debugEmail(to, templateConfig.subject, html);
    }

    // Se chegou aqui, é modo de produção ou foi forçado o envio real
    console.log("\n");
    console.log("╔═════════════════════════════════════════════════════╗");
    console.log("║               ENVIANDO EMAIL REAL                   ║");
    console.log("╚═════════════════════════════════════════════════════╝");
    console.log(`📧 PARA: ${to}`);
    console.log(`📑 ASSUNTO: ${templateConfig.subject}`);
    console.log(`📝 MODO: Envio Real Forçado`);
    console.log("═════════════════════════════════════════════════════\n");

    // Atualizar o HTML para usar uma URL baseada no NEXT_PUBLIC_APP_URL
    const logoUrl = `${env.NEXT_PUBLIC_APP_URL}/star-institute-logo.png`;
    const updatedHtml = html.replace("{{logoUrl}}", logoUrl);

    // Determinar o email de origem correto
    // Em ambiente de desenvolvimento, usar o endereço padrão do Resend
    // Em produção, usar o endereço configurado em .env
    const fromEmail = isDev 
      ? "onboarding@resend.dev" 
      : env.RESEND_FROM_EMAIL;

    // Preparar o payload do email
    const emailPayload = {
      from: `STAR Institute <${fromEmail}>`,
      to,
      subject: templateConfig.subject,
      html: updatedHtml,
    };

    // Log do payload completo
    console.log("\n");
    console.log("╔═════════════════════════════════════════════════════╗");
    console.log("║               PAYLOAD DO EMAIL                      ║");
    console.log("╚═════════════════════════════════════════════════════╝");
    console.log("FROM:", emailPayload.from);
    console.log("TO:", emailPayload.to);
    console.log("SUBJECT:", emailPayload.subject);
    console.log("HTML Length:", emailPayload.html.length);
    console.log("Campos presentes:", Object.keys(emailPayload).join(", "));
    console.log("═════════════════════════════════════════════════════\n");

    // Enviar o email usando o Resend com configuração simplificada
    const response = await resend.emails.send(emailPayload);

    // Log da resposta
    console.log("\n");
    console.log("╔═════════════════════════════════════════════════════╗");
    console.log("║               RESPOSTA DO RESEND                    ║");
    console.log("╚═════════════════════════════════════════════════════╝");
    console.log("Resposta completa:", JSON.stringify(response, null, 2));
    console.log("═════════════════════════════════════════════════════\n");

    const { data, error } = response;

    if (error) {
      console.error("\n");
      console.error("╔═════════════════════════════════════════════════════╗");
      console.error("║               ERRO DO RESEND                        ║");
      console.error("╚═════════════════════════════════════════════════════╝");
      console.error("Erro detalhado:", error);
      if ('statusCode' in error) {
        console.error("Status:", (error as any).statusCode);
      }
      console.error("Nome:", error.name);
      console.error("Mensagem:", error.message);
      console.error("═════════════════════════════════════════════════════\n");
      throw error;
    }

    console.log(`Email enviado com sucesso: ${data?.id}`);
    return { success: true, data };
  } catch (error) {
    console.error("\n");
    console.error("╔═════════════════════════════════════════════════════╗");
    console.error("║               ERRO AO ENVIAR EMAIL                  ║");
    console.error("╚═════════════════════════════════════════════════════╝");
    console.error("Tipo do erro:", error instanceof Error ? error.constructor.name : typeof error);
    console.error("Mensagem:", error instanceof Error ? error.message : String(error));
    console.error("Stack:", error instanceof Error ? error.stack : "No stack trace");
    
    if (error instanceof Error && 'cause' in error) {
      console.error("Causa:", (error as any).cause);
    }

    // Se for um objeto com propriedades específicas
    if (typeof error === 'object' && error !== null) {
      console.error("Erro detalhado:", JSON.stringify(error, null, 2));
    }
    
    console.error("═════════════════════════════════════════════════════\n");
    
    // Melhorar a mensagem de erro para o usuário
    if (error instanceof Error) {
      if (error.message.includes("domain is not verified")) {
        throw new Error(`O domínio do email não está verificado. Por favor, verifique o domínio em https://resend.com/domains ou use onboarding@resend.dev para testes.`);
      }
      if (error.message.includes("Invalid `from` field")) {
        throw new Error(`Erro de configuração do email. Email atual: ${env.RESEND_FROM_EMAIL}`);
      }
      if (error.message.includes("API key")) {
        throw new Error("Chave API do Resend inválida. Por favor, verifique a variável RESEND_API_KEY.");
      }
      if (error.message.includes("missing_required_field") || error.message.includes("missing one or more required fields")) {
        throw new Error(`Campos obrigatórios faltando no email. Por favor, verifique se todos os campos necessários estão presentes.`);
      }
    }
    
    throw error;
  }
}

// Exemplo de uso:
/*
await sendEmail({
  to: "user@example.com",
  type: "welcome",
  variables: {
    userName: "João Silva",
    activationLink: "https://app.example.com/activate?token=xyz"
  }
});
*/
