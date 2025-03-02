import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "prisma/prisma"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare, hash } from "bcrypt"
import { Permissao } from "@prisma/client"
import { ZodError } from "zod"
import { loginSchema } from "./api/auth/types"
import { z } from "zod"

// Schema para validação do token e senha
const tokenValidationSchema = z.object({
  token: z.string(),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres")
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credenciais",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          // Validar as credenciais usando o loginSchema
          const { email, password } = await loginSchema.parseAsync(credentials);
          
          // Procurar o utilizador pelo email
          const user = await prisma.user.findUnique({
            where: { email },
            include: { password: true }
          })

          if (!user || !user.password) {
            console.log("Utilizador não encontrado ou sem password")
            return null
          }

          // Verificar se a password está correta
          const isPasswordValid = await compare(
            password,
            user.password.hash
          )

          if (!isPasswordValid) {
            console.log("Password inválida")
            return null
          }

          // Retornar apenas os campos necessários para o NextAuth
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            permissao: user.permissao,
            foto: user.foto,
            atividade: user.atividade,
            regime: user.regime,
            username: user.username,
            contratacao: user.contratacao
          }
        } catch (error) {
          // Tratar erros de validação do Zod
          if (error instanceof ZodError) {
            console.error("Erro de validação:", error.errors)
            return null
          }
          
          console.error("Erro na autenticação:", error)
          return null
        }
      }
    }),
    
    // Provider para validação de conta por token
    CredentialsProvider({
      id: "token-validation",
      name: "Validação por Token",
      credentials: {
        token: { label: "Token", type: "text" },
        password: { label: "Nova Senha", type: "password" }
      },
      async authorize(credentials) {
        try {
          // Validar o token e a senha
          const { token, password } = await tokenValidationSchema.parseAsync(credentials);
          
          // Primeiro tenta buscar em passwordReset (reset de senha)
          let passwordReset = await prisma.passwordReset.findUnique({
            where: { token }
          });
          
          let userEmail;
          
          // Se não encontrou, tenta em verificationToken (primeiro acesso)
          if (!passwordReset) {
            const verificationToken = await prisma.verificationToken.findUnique({
              where: { token }
            });
            
            if (!verificationToken) {
              console.log("Token não encontrado em nenhuma tabela");
              return null;
            }
            
            if (verificationToken.expires < new Date()) {
              console.log("Token de verificação expirado");
              return null;
            }
            
            userEmail = verificationToken.identifier;
            
            // Continua o processo com o email do verificationToken
            const user = await prisma.user.findUnique({
              where: { email: userEmail }
            });
            
            if (!user) {
              console.log("Usuário não encontrado para o token");
              return null;
            }
            
            // Criar ou atualizar a senha do usuário
            const hashedPassword = await hash(password, 12);
            
            // Verificar se o usuário já tem uma senha
            const existingPassword = await prisma.password.findUnique({
              where: { userId: user.id }
            });
            
            if (existingPassword) {
              // Atualizar a senha existente
              await prisma.password.update({
                where: { userId: user.id },
                data: { hash: hashedPassword }
              });
            } else {
              // Criar uma nova senha
              await prisma.password.create({
                data: {
                  userId: user.id,
                  hash: hashedPassword
                }
              });
            }
            
            // Marcar o email como verificado
            await prisma.user.update({
              where: { id: user.id },
              data: { emailVerified: new Date() }
            });
            
            // No final, delete do verificationToken
            await prisma.verificationToken.delete({
              where: { token }
            });
            
            // Retornar apenas os campos necessários para o NextAuth
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              // Usar campos adicionais como propriedades personalizadas
              permissao: user.permissao,
              foto: user.foto,
              atividade: user.atividade,
              regime: user.regime,
              username: user.username,
              contratacao: user.contratacao
            };
          }
          
          // Resto do código para passwordReset como já está
          // Verificar se o token não expirou
          if (passwordReset.expires < new Date()) {
            console.log("Token de redefinição expirado");
            return null;
          }
          
          // Buscar o usuário pelo email
          const user = await prisma.user.findUnique({
            where: { email: passwordReset.email }
          });
          
          if (!user) {
            console.log("Usuário não encontrado para o token");
            return null;
          }
          
          // Criar ou atualizar a senha do usuário
          const hashedPassword = await hash(password, 12);
          
          // Verificar se o usuário já tem uma senha
          const existingPassword = await prisma.password.findUnique({
            where: { userId: user.id }
          });
          
          if (existingPassword) {
            // Atualizar a senha existente
            await prisma.password.update({
              where: { userId: user.id },
              data: { hash: hashedPassword }
            });
          } else {
            // Criar uma nova senha
            await prisma.password.create({
              data: {
                userId: user.id,
                hash: hashedPassword
              }
            });
          }
          
          // Marcar o email como verificado
          await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: new Date() }
          });
          
          // Remover o token de redefinição após o uso
          await prisma.passwordReset.delete({
            where: { id: passwordReset.id }
          });
          
          // Retornar apenas os campos necessários para o NextAuth
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            // Usar campos adicionais como propriedades personalizadas
            permissao: user.permissao,
            foto: user.foto,
            atividade: user.atividade,
            regime: user.regime,
            username: user.username,
            contratacao: user.contratacao
          };
        } catch (error) {
          if (error instanceof ZodError) {
            console.error("Erro de validação:", error.errors);
            return null;
          }
          
          console.error("Erro na validação do token:", error);
          return null;
        }
      }
    })
  ],
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/verificar-email",
    newUser: "/bem-vindo"
  },
  callbacks: {
    session({ session, token }) {
      console.log("Session callback - Token recebido:", token);
      
      if (session.user) {
        // Campos já existentes
        (session.user as any).id = token.sub;
        (session.user as any).permissao = token.permissao;
        
        // Adicionar novos campos
        (session.user as any).atividade = token.atividade;
        (session.user as any).regime = token.regime;
        (session.user as any).username = token.username;
        (session.user as any).contratacao = token.contratacao;
        
        console.log("Session callback - Session após modificação:", session);
      }
      return session;
    },
    jwt({ token, user }) {
      console.log("JWT callback - User recebido:", user);
      
      if (user) {
        token.sub = user.id;
        
        // Campos já existentes
        token.permissao = (user as any).permissao;
        
        // Adicionar novos campos
        token.atividade = (user as any).atividade;
        token.regime = (user as any).regime;
        token.username = (user as any).username;
        token.contratacao = (user as any).contratacao;
        
        console.log("JWT callback - Token após modificação:", token);
      }
      return token;
    }
  }
});
