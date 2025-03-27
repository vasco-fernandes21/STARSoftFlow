import { Resend } from 'resend';
import fs from 'fs/promises';
import path from 'path';
import Handlebars from 'handlebars';
import { env } from '@/env';

// Mapa de templates disponíveis
const EMAIL_TEMPLATES = {
  welcome: {
    subject: 'Bem-vindo ao STARSoftFlow',
    template: 'welcome.html'
  },
  resetPassword: {
    subject: 'Redefinir palavra-passe',
    template: 'reset-password.html'
  },
  inviteUser: {
    subject: 'Convite para o STARSoftFlow',
    template: 'invite-user.html'
  },
  notification: {
    subject: 'Notificação do STARSoftFlow',
    template: 'notification.html'
  }
} as const;

type EmailType = keyof typeof EMAIL_TEMPLATES;

interface SendEmailOptions {
  to: string;
  type: EmailType;
  variables: Record<string, any>;
}

// Função para carregar e compilar o template
async function loadTemplate(templateName: string) {
  const templatePath = path.join(process.cwd(), 'src/emails/templates', templateName);
  const template = await fs.readFile(templatePath, 'utf-8');
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
  
  console.log('\n');
  console.log('╔═════════════════════════════════════════════════════╗');
  console.log('║                  EMAIL DE TESTE                     ║');
  console.log('╚═════════════════════════════════════════════════════╝');
  console.log(`📧 PARA: ${to}`);
  console.log(`📑 ASSUNTO: ${subject}`);
  console.log('📄 CONTEÚDO HTML:');
  console.log(html);
  
  // Destacar links encontrados
  if (links.length > 0) {
    console.log('\n🔗 LINKS ENCONTRADOS NO EMAIL:');
    links.forEach((link, _index) => {
      // Verificar se é um link da aplicação
      const isAppLink = 
        link.includes(env.NEXT_PUBLIC_APP_URL) || 
        link.startsWith('/');
      
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
    console.log('\n🔑 TOKENS ENCONTRADOS:');
    tokens.forEach((token, _index) => {
      console.log(`   Token ${_index + 1}: \x1b[33m${token}\x1b[0m`);
    });
  }
  
  // Destacar links diretos para facilitar o teste
  const actionLinks: string[] = [];
  
  for (const link of links) {
    if (
      link.includes('/primeiro-login') ||
      link.includes('/reset-password') ||
      link.includes('/verify-email') ||
      link.includes('/confirm-account')
    ) {
      actionLinks.push(link);
    }
  }
  
  if (actionLinks.length > 0) {
    console.log('\n🔐 LINKS DE AÇÃO RÁPIDA:');
    actionLinks.forEach((link, _index) => {
      console.log(`   \x1b[32m${link}\x1b[0m`);
    });
    console.log('\n   👆 COPIE UM DOS LINKS ACIMA PARA TESTAR DIRETAMENTE 👆');
  }
  
  console.log('\n═════════════════════════════════════════════════════');
  
  return { 
    success: true, 
    messageId: 'test-mode-email-id',
    testMode: true
  };
}

// Inicializar o cliente Resend
const resend = new Resend(env.RESEND_API_KEY);

// Função principal para enviar emails
export async function sendEmail({
  to,
  type,
  variables,
}: SendEmailOptions) {
  try {
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
      logoUrl: `${env.NEXT_PUBLIC_APP_URL}/star-institute-logo.png`,
      baseUrl: env.NEXT_PUBLIC_APP_URL,
    };

    // Compilar o HTML com as variáveis
    const html = template({
      ...defaultVariables,
      ...variables,
    });

    // Verificar se estamos em ambiente de desenvolvimento ou modo de teste
    const isDev = process.env.NODE_ENV === 'development';
    const isTestMode = process.env.EMAIL_TEST_MODE === 'true';
    
    // Debug dos valores atuais
    console.log('\n');
    console.log('╔═════════════════════════════════════════════════════╗');
    console.log('║               CONFIGURAÇÃO EMAIL                    ║');
    console.log('╚═════════════════════════════════════════════════════╝');
    console.log(`📧 RESEND_API_KEY: ${env.RESEND_API_KEY ? 'Configurada' : 'Não configurada'}`);
    console.log(`📧 RESEND_FROM_EMAIL: ${env.RESEND_FROM_EMAIL}`);
    console.log(`📑 NODE_ENV: ${process.env.NODE_ENV}`); 
    console.log(`📑 EMAIL_TEST_MODE: ${process.env.EMAIL_TEST_MODE}`);
    console.log(`📑 MODO DE ENVIO: ${isTestMode || isDev ? 'Teste/Dev (apenas log)' : 'Produção (envio real)'}`);
    
    // FORÇAR ENVIO REAL independente do ambiente
    const forceRealSend = true;
    
    if (!forceRealSend && (isTestMode || isDev)) {
      return debugEmail(to, templateConfig.subject, html);
    }

    // Se chegou aqui, é modo de produção ou foi forçado o envio real
    console.log('\n');
    console.log('╔═════════════════════════════════════════════════════╗');
    console.log('║               ENVIANDO EMAIL REAL                   ║');
    console.log('╚═════════════════════════════════════════════════════╝');
    console.log(`📧 PARA: ${to}`);
    console.log(`📑 ASSUNTO: ${templateConfig.subject}`);
    console.log(`📝 MODO: Envio Real Forçado`);
    console.log('═════════════════════════════════════════════════════\n');

    // Atualizar o HTML para usar uma URL baseada no NEXT_PUBLIC_APP_URL
    const logoUrl = `${env.NEXT_PUBLIC_APP_URL}/star-institute-logo.png`;
    const updatedHtml = html.replace(
      '{{logoUrl}}',
      logoUrl
    );

    // Enviar o email usando o Resend
    const { data, error } = await resend.emails.send({
      from: `STAR Institute <${env.RESEND_FROM_EMAIL}>`,
      to,
      subject: templateConfig.subject,
      html: updatedHtml,
    });

    if (error) {
      console.error('Erro ao enviar email:', error);
      throw error;
    }

    console.log(`Email enviado com sucesso: ${data?.id}`);
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao enviar email:', error);
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