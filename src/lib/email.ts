import { Resend } from 'resend';

type EmailOptions = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail({ to, subject, html }: EmailOptions) {
  // Verificar se estamos em ambiente de desenvolvimento ou modo de teste
  const isDev = process.env.NODE_ENV === 'development';
  const isTestMode = process.env.EMAIL_TEST_MODE === 'true';
  
  if (isTestMode || isDev) {
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
    
    // Em modo de teste, imprimir o conteúdo do email
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
      links.forEach((link, index) => {
        // Verificar se é um link da aplicação
        const isAppLink = 
          link.includes(process.env.AUTH_URL || 'localhost') || 
          link.startsWith('/');
        
        if (isAppLink) {
          console.log(`🌐 Link da aplicação ${index + 1}: \x1b[36m${link}\x1b[0m`);
        } else {
          console.log(`🔗 Link externo ${index + 1}: ${link}`);
        }
      });
    }
    
    // Procurar e destacar tokens de autenticação (comum em links de reset e primeiro acesso)
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
      tokens.forEach((token, index) => {
        console.log(`   Token ${index + 1}: \x1b[33m${token}\x1b[0m`);
      });
    }
    
    // Destacar links diretos para facilitar o teste
    // Procurar por URLs específicas associadas a login, reset de senha, etc.
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
      actionLinks.forEach((link, index) => {
        console.log(`   \x1b[32m${link}\x1b[0m`);
      });
      console.log('\n   👆 COPIE UM DOS LINKS ACIMA PARA TESTAR DIRETAMENTE 👆');
    }
    
    console.log('\n═════════════════════════════════════════════════════');
    
    return { 
      success: true, 
      messageId: 'test-mode-email-id',
      testMode: true,
      devMode: isDev
    };
  }
  
  // Em modo de produção, enviar o email usando Resend
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@starinstitute.com',
      to,
      subject,
      html,
    });
    
    if (error) {
      console.error('Erro ao enviar email com Resend:', error);
      throw error;
    }
    
    console.log(`Email enviado com sucesso: ${data?.id}`);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    throw error;
  }
}
