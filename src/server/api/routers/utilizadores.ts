import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Permissao, Regime, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { sendEmail } from "@/lib/email";
import { hash, compare } from "bcryptjs";
import { z } from "zod";
import { createPaginatedResponse, handlePrismaError } from "../utils";
import { paginationSchema, getPaginationParams } from "../schemas/common";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

// Schemas base
const emailSchema = z
  .string({ required_error: "Email é obrigatório" })
  .email("Email inválido");

const passwordSchema = z
  .string({ required_error: "Password é obrigatória" })
  .min(8, "Password deve ter pelo menos 8 caracteres")
  .max(32, "Password deve ter no máximo 32 caracteres")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    "Password deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial"
  );

const dateSchema = z.union([
  z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Data inválida",
  }),
  z.date(),
  z.null(),
]);

// Schema base para utilizador
const utilizadorBaseSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: emailSchema,
  foto: z.string().nullable().optional(),
  atividade: z.string().min(1, "Atividade é obrigatória"),
  contratacao: dateSchema,
  username: z.string().min(3, "Username deve ter pelo menos 3 caracteres"),
  permissao: z.nativeEnum(Permissao),
  regime: z.nativeEnum(Regime)
}).passthrough();

// Schema para criação de utilizador
const createUtilizadorSchema = utilizadorBaseSchema.extend({
  password: passwordSchema.optional(),
}).passthrough();

// Schema para atualização de utilizador
const updateUtilizadorSchema = utilizadorBaseSchema.partial();

// Schema para alteração de password
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Password atual é obrigatória"),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, "Confirmação de password é obrigatória"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As passwords não coincidem",
  path: ["confirmPassword"],
});

// Schema para filtros de utilizador
const utilizadorFilterSchema = z.object({
  search: z.string().optional(),
  permissao: z.nativeEnum(Permissao).optional(),
  regime: z.nativeEnum(Regime).optional(),
}).merge(paginationSchema);

// Schema para reset de password
const resetPasswordRequestSchema = z.object({
  email: emailSchema,
});

// Schema para definir nova password após reset
const resetPasswordSchema = z.object({
  token: z.string(),
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Confirmação de password é obrigatória"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As passwords não coincidem",
  path: ["confirmPassword"],
});

// Schema para validação de primeiro acesso
const primeiroAcessoSchema = z.object({
  token: z.string(),
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Confirmação de password é obrigatória"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As passwords não coincidem",
  path: ["confirmPassword"],
});

// Tipos inferidos dos schemas
export type CreateUtilizadorInput = z.infer<typeof createUtilizadorSchema>;
export type UpdateUtilizadorInput = z.infer<typeof updateUtilizadorSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UtilizadorFilterInput = z.infer<typeof utilizadorFilterSchema>;
export type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type PrimeiroAcessoInput = z.infer<typeof primeiroAcessoSchema>;

// Tipo estendido para o utilizador com as propriedades que precisamos
type UserWithPermissao = {
  permissao: Permissao;
  id: string;
  // Outras propriedades do utilizador
} & Record<string, any>;

// Router
export const utilizadorRouter = createTRPCRouter({
  // Obter todos os utilizadores
  getAll: protectedProcedure
    .input(utilizadorFilterSchema.optional())
    .query(async ({ ctx, input }) => {
      try {
        const { search, permissao, regime, page = 1, limit = 10 } = input || {};
        
        // Construir condições de filtro
        const where: Prisma.UserWhereInput = {
          ...(search ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
              { email: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
              { username: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
            ] as Prisma.UserWhereInput[],
          } : {}),
          ...(permissao ? { permissao } : {}),
          ...(regime ? { regime } : {}),
        };
        
        // Parâmetros de paginação
        const { skip, take } = getPaginationParams(page, limit);
        
        // Executar query com contagem
        const [users, total] = await Promise.all([
          ctx.db.user.findMany({
            where,
            select: {
              id: true,
              name: true,
              email: true,
              foto: true,
              atividade: true,
              contratacao: true,
              username: true,
              permissao: true,
              regime: true,
              emailVerified: true,
            },
            skip,
            take,
            orderBy: { name: "asc" },
          }),
          ctx.db.user.count({ where }),
        ]);
        
        return createPaginatedResponse(users, total, page, limit);
      } catch (error) {
        return handlePrismaError(error);
      }
    }),

  getByWorkpackage: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input: workpackageId }) => {
      try {
        const users = await ctx.db.user.findMany({
          where: {
            workpackages: {
              some: {
                workpackageId: workpackageId
              }
            }
          },
          select: {
            id: true,
            name: true,
            email: true,
            foto: true,
            atividade: true,
            regime: true,
            workpackages: {
              where: {
                workpackageId: workpackageId
              },
              select: {
                mes: true,
                ano: true,
                ocupacao: true
              },
              orderBy: [
                { ano: 'asc' },
                { mes: 'asc' }
              ]
            }
          }
        });

        return users.map(user => ({
          ...user,
          alocacoes: user.workpackages.map(wp => ({
            mes: wp.mes,
            ano: wp.ano,
            ocupacao: wp.ocupacao
          }))
        }));
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao obter utilizadores do workpackage",
          cause: error,
        });
      }
    }),

  getProjetosWithUser: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input: userId }) => {
      try {
        const alocacoes = await ctx.db.alocacaoRecurso.findMany({
          where: {
            userId: userId
          },
          select: {
            mes: true,
            ano: true,
            ocupacao: true,
            workpackageId: true,
            userId: true
          }
        });

        // Extrair IDs de workpackages únicos
        const workpackageIds = [...new Set(alocacoes.map(w => w.workpackageId))];

        // Buscar workpackages com seus projetos
        const workpackages = await ctx.db.workpackage.findMany({
          where: {
            id: { in: workpackageIds }
          },
          select: {
            id: true,
            nome: true,
            descricao: true,
            inicio: true,
            fim: true,
            estado: true,
            projetoId: true,
            projeto: {
              select: {
                id: true,
                nome: true,
                descricao: true,
                inicio: true,
                fim: true
              }
            }
          }
        });

        // Criar mapa de alocações por workpackage
        const alocacoesPorWP = new Map();
        alocacoes.forEach(alocacao => {
          if (!alocacoesPorWP.has(alocacao.workpackageId)) {
            alocacoesPorWP.set(alocacao.workpackageId, []);
          }
          alocacoesPorWP.get(alocacao.workpackageId).push({
            mes: alocacao.mes,
            ano: alocacao.ano,
            ocupacao: alocacao.ocupacao
          });
        });

        // Agrupar workpackages por projeto
        const projetoMap = new Map();
        workpackages.forEach(wp => {
          if (!projetoMap.has(wp.projeto.id)) {
            projetoMap.set(wp.projeto.id, {
              id: wp.projeto.id,
              nome: wp.projeto.nome,
              descricao: wp.projeto.descricao,
              inicio: wp.projeto.inicio,
              fim: wp.projeto.fim,
              workpackages: []
            });
          }

          projetoMap.get(wp.projeto.id).workpackages.push({
            id: wp.id,
            nome: wp.nome,
            descricao: wp.descricao,
            inicio: wp.inicio,
            fim: wp.fim,
            estado: wp.estado,
            alocacoes: alocacoesPorWP.get(wp.id) || []
          });
        });

        // Converter o Map para array e ordenar por data de início do projeto
        const projetos = Array.from(projetoMap.values()).sort((a, b) => 
          new Date(a.inicio).getTime() - new Date(b.inicio).getTime()
        );

        return projetos;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),

  // Obter utilizador por ID
  getById: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input: id }) => {
      try {
        const user = await ctx.db.user.findUnique({
          where: { id },
          select: {
            id: true,
            name: true,
            email: true,
            foto: true,
            atividade: true,
            contratacao: true,
            username: true,
            permissao: true,
            regime: true,
            emailVerified: true,
          },
        });
        
        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Utilizador não encontrado",
          });
        }
        
        return user;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),

  //Obter por username
  getByUsername: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input: username }) => {
      try {
        const user = await ctx.db.user.findUnique({
          where: { username },
          select: {
            id: true,
            name: true,
            email: true,
            foto: true,
            atividade: true,
            contratacao: true,
            username: true,
            permissao: true,
            regime: true,
            emailVerified: true,
          },
        });
  
        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Utilizador não encontrado",
          });
        }
  
        return user;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),

  // Criar utilizador
  create: protectedProcedure
    .input(createUtilizadorSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Verificar permissão (apenas admin pode criar utilizadores)
        const user = ctx.session?.user as UserWithPermissao | undefined;
        if (!user || user.permissao !== Permissao.ADMIN) {
          throw new TRPCError({ 
            code: "FORBIDDEN",
            message: "Não tem permissões para criar utilizadores" 
          });
        }
        
        // Verificar se temos dados de entrada
        if (!input) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Dados de utilizador não fornecidos"
          });
        }
        
        const { password, ...userData } = input;
        
        if (process.env.NODE_ENV === 'development') {
          console.log("Dados recebidos:", JSON.stringify(input, null, 2));
        }
        
        // Processar a data de contratação
        const processedUserData = {
          ...userData,
          contratacao: userData.contratacao 
            ? (typeof userData.contratacao === 'string' 
                ? new Date(userData.contratacao) 
                : userData.contratacao)
            : null
        };
        
        // Verificar se email já existe
        const existingUser = await ctx.db.user.findUnique({
          where: { email: processedUserData.email },
        });
        
        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Este email já está registado",
          });
        }
        
        // Gerar token para primeiro acesso
        const token = randomUUID();
        const tokenExpiry = new Date();
        tokenExpiry.setHours(tokenExpiry.getHours() + 24);
        
        // Criar utilizador
        const newUser = await ctx.db.user.create({
          data: {
            ...processedUserData,
            password: password ? {
              create: {
                hash: await hash(password, 10),
              },
            } : undefined,
          },
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            foto: true,
            atividade: true,
            contratacao: true,
            permissao: true,
            regime: true,
            emailVerified: true,
          },
        });
        
        // Criar token para primeiro acesso se não tiver password
        if (!password && newUser.email) {
          await ctx.db.verificationToken.create({
            data: {
              identifier: newUser.email,
              token,
              expires: tokenExpiry,
            },
          });
          
          // Enviar email de primeiro acesso
          await sendEmail({
            to: newUser.email,
            subject: "Bem-vindo ao Sistema de Gestão de Projetos",
            html: `
              <p>Bem-vindo! Para aceder à sua conta, clique no link: ${process.env.AUTH_URL}/primeiro-login?token=${token}</p>
            `,
          });
        }
        
        // Serializar resposta para garantir que as datas sejam convertidas para strings
        return {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          username: newUser.username,
          foto: newUser.foto,
          atividade: newUser.atividade,
          contratacao: newUser.contratacao ? newUser.contratacao.toISOString() : null,
          permissao: newUser.permissao,
          regime: newUser.regime,
          emailVerified: newUser.emailVerified ? newUser.emailVerified.toISOString() : null
        };
      } catch (error) {
        console.error("Erro na criação de utilizador:", error);
        return handlePrismaError(error);
      }
    }),
  
  // Atualizar utilizador
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: updateUtilizadorSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, data } = input;
        
        // Verificar permissões (admin ou próprio utilizador)
        const user = ctx.session.user as UserWithPermissao;
        const isAdmin = user.permissao === Permissao.ADMIN;
        const isSelf = user.id === id;
        
        if (!isAdmin && !isSelf) {
          throw new TRPCError({ 
            code: "FORBIDDEN",
            message: "Não tem permissões para atualizar este utilizador" 
          });
        }
        
        // Se não for admin, não pode alterar permissões
        if (!isAdmin && data.permissao) {
          throw new TRPCError({ 
            code: "FORBIDDEN",
            message: "Não tem permissões para alterar permissões" 
          });
        }
        
        // Atualizar utilizador
        const updatedUser = await ctx.db.user.update({
          where: { id },
          data,
          select: {
            id: true,
            name: true,
            email: true,
            foto: true,
            atividade: true,
            contratacao: true,
            username: true,
            permissao: true,
            regime: true,
          },
        });
        
        return updatedUser;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),


  // Atualizar informações (currículo) do utilizador
  updateInformacoes: protectedProcedure
    .input(z.object({
      userId: z.string(),
      informacoes: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { userId, informacoes } = input;
        
        // Verificar permissões (admin ou próprio utilizador)
        const user = ctx.session.user as UserWithPermissao;
        const isAdmin = user.permissao === Permissao.ADMIN;
        const isSelf = user.id === userId;
        
        if (!isAdmin && !isSelf) {
          throw new TRPCError({ 
            code: "FORBIDDEN",
            message: "Não tem permissões para atualizar este utilizador" 
          });
        }
        
        // Atualizar utilizador
        const updatedUser = await ctx.db.user.update({
          where: { id: userId },
          data: { informacoes },
          select: {
            id: true,
            informacoes: true
          },
        });
        
        return updatedUser;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),

  // Obter ocupação mensal agregada
  getOcupacaoMensal: protectedProcedure
    .input(z.object({
      userId: z.string(),
      ano: z.number()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const { userId, ano } = input;
        
        // Buscar alocações do ano com relações necessárias
        const alocacoes = await ctx.db.alocacaoRecurso.findMany({
          where: {
            userId: userId,
            ano: ano
          },
          select: {
            mes: true,
            ocupacao: true,
            workpackage: {
              select: {
                projeto: {
                  select: {
                    estado: true
                  }
                }
              }
            }
          }
        });

        // Organizar por mês
        const meses = Array.from({ length: 12 }, (_, i) => i + 1);
        const ocupacaoPorMes = meses.map(mes => {
          const alocacoesMes = alocacoes.filter(a => a.mes === mes);
          
          // Separar ocupações por estado do projeto
          const ocupacaoAprovada = alocacoesMes
            .filter(a => 
              a.workpackage.projeto.estado === "APROVADO" || 
              a.workpackage.projeto.estado === "EM_DESENVOLVIMENTO"
            )
            .reduce((sum, a) => sum + Number(a.ocupacao), 0);

          const ocupacaoPendente = alocacoesMes
            .filter(a => a.workpackage.projeto.estado === "PENDENTE")
            .reduce((sum, a) => sum + Number(a.ocupacao), 0);

          return {
            mes,
            ocupacaoAprovada,
            ocupacaoPendente
          };
        });
        
        return ocupacaoPorMes;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),

  // Obter ocupação por projeto com workpackages
  getOcupacaoPorProjeto: protectedProcedure
    .input(z.object({
      userId: z.string(),
      dataInicio: z.date(),
      dataFim: z.date()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const { userId, dataInicio, dataFim } = input;
        
        // Converter datas para ano/mês
        const anoInicio = dataInicio.getFullYear();
        const mesInicio = dataInicio.getMonth() + 1;
        const anoFim = dataFim.getFullYear();
        const mesFim = dataFim.getMonth() + 1;
        
        // Buscar todas as alocações no período
        const alocacoes = await ctx.db.alocacaoRecurso.findMany({
          where: {
            userId: userId,
            OR: [
              // Alocações dentro do mesmo ano
              {
                AND: [
                  { ano: anoInicio },
                  { mes: { gte: mesInicio } },
                  { ano: anoFim },
                  { mes: { lte: mesFim } }
                ]
              },
              // Alocações em anos diferentes
              {
                AND: [
                  { ano: { gt: anoInicio, lt: anoFim } }
                ]
              },
              // Alocações no ano inicial após o mês inicial
              {
                AND: [
                  { ano: anoInicio },
                  { mes: { gte: mesInicio } },
                ]
              },
              // Alocações no ano final antes do mês final
              {
                AND: [
                  { ano: anoFim },
                  { mes: { lte: mesFim } }
                ]
              }
            ]
          },
          select: {
            mes: true,
            ano: true,
            ocupacao: true,
            workpackageId: true
          }
        });
        
        // Extrair workpackageIds das alocações
        const workpackageIds = [...new Set(alocacoes.map(a => a.workpackageId))];
        
        // Buscar workpackages com seus projetos
        const workpackages = await ctx.db.workpackage.findMany({
          where: {
            id: { in: workpackageIds }
          },
          select: {
            id: true,
            nome: true,
            descricao: true,
            inicio: true,
            fim: true,
            projetoId: true,
            projeto: {
              select: {
                id: true,
                nome: true,
                descricao: true,
                inicio: true,
                fim: true
              }
            }
          }
        });
        
        // Agrupar alocações por workpackage
        const alocacoesPorWorkpackage = new Map();
        alocacoes.forEach(a => {
          if (!alocacoesPorWorkpackage.has(a.workpackageId)) {
            alocacoesPorWorkpackage.set(a.workpackageId, []);
          }
          alocacoesPorWorkpackage.get(a.workpackageId).push(a);
        });
        
        // Agrupar workpackages por projeto
        const projetoMap = new Map();
        
        for (const wp of workpackages) {
          if (!projetoMap.has(wp.projeto.id)) {
            projetoMap.set(wp.projeto.id, {
              id: wp.projeto.id,
              nome: wp.projeto.nome,
              descricao: wp.projeto.descricao,
              inicio: wp.projeto.inicio,
              fim: wp.projeto.fim,
              workpackages: [],
              ocupacaoMedia: 0
            });
          }
          
          const wpAlocacoes = alocacoesPorWorkpackage.get(wp.id) || [];
          const ocupacoes = wpAlocacoes.map((a: any) => Number(a.ocupacao));
          const ocupacaoMedia = ocupacoes.length > 0
            ? ocupacoes.reduce((sum: number, val: number) => sum + val, 0) / ocupacoes.length
            : 0;
          
          projetoMap.get(wp.projeto.id).workpackages.push({
            id: wp.id,
            nome: wp.nome,
            descricao: wp.descricao,
            inicio: wp.inicio,
            fim: wp.fim,
            alocacoes: wpAlocacoes,
            ocupacaoMedia
          });
        }
        
        // Calcular ocupação média para cada projeto
        const projetosProcessados = Array.from(projetoMap.values()).map(projeto => {
          const ocupacoesWP = projeto.workpackages.map((wp: any) => wp.ocupacaoMedia);
          const ocupacaoMediaProjeto = ocupacoesWP.length > 0
            ? ocupacoesWP.reduce((sum: number, val: number) => sum + val, 0) / ocupacoesWP.length
            : 0;
          
          return {
            ...projeto,
            ocupacaoMedia: ocupacaoMediaProjeto
          };
        });
        
        return projetosProcessados;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),

  getByProjeto: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input: projetoId }) => {
      try {
        const workpackages = await ctx.db.workpackage.findMany({
          where: {
            projetoId: projetoId
          },
          select: {
            id: true
          }
        });

        const workpackageIds = workpackages.map(wp => wp.id);

        const users = await ctx.db.user.findMany({
          where: {
            workpackages: {
              some: {
                workpackageId: {
                  in: workpackageIds
                }
              }
            }
          },
          select: {
            id: true,
            name: true,
            email: true,
            foto: true,
            atividade: true,
            regime: true,
            workpackages: {
              where: {
                workpackageId: {
                  in: workpackageIds
                }
              },
              select: {
                mes: true,
                ano: true,
                ocupacao: true,
                workpackageId: true
              },
              orderBy: [
                { ano: 'asc' },
                { mes: 'asc' }
              ]
            }
          }
        });

        return users.map(user => ({
          ...user,
          alocacoes: user.workpackages.map(wp => ({
            mes: wp.mes,
            ano: wp.ano,
            ocupacao: wp.ocupacao,
            workpackageId: wp.workpackageId
          }))
        }));
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao obter utilizadores do projeto",
          cause: error,
        });
      }
    }),
});