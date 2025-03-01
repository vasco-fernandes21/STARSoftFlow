import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "prisma/prisma"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcrypt"
import { Permissao } from "@prisma/client"
import { ZodError } from "zod"
import { loginSchema } from "./auth/schemas"

// Define um tipo para estender o User do NextAuth
type ExtendedUser = {
  permissao?: Permissao;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
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

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            permissao: user.permissao,
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
    })
  ],
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login"
  },
  callbacks: {
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub
      }
      
      if (token.permissao && session.user) {
        // Usa type assertion para informar o TypeScript sobre a propriedade permissao
        (session.user as ExtendedUser).permissao = token.permissao as Permissao
      }
      
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        // Usa type assertion para informar o TypeScript sobre a propriedade permissao
        token.permissao = (user as unknown as ExtendedUser).permissao
      }
      return token
    }
  }
})
