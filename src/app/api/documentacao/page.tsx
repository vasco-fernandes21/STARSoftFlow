"use client";

import Link from "next/link";
import { ArrowLeft, ChevronRight, Code, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function ApiDocumentacaoPage() {
  const router = useRouter();

  const endpoints = [
    {
      name: "GET /api/trpc/projetos.listar",
      description: "Obter lista de projetos",
      parameters: "page, limit, sortBy, filterBy",
      responseType: "ProjectoListResponse",
    },
    {
      name: "GET /api/trpc/projetos.detalhe",
      description: "Obter detalhes de um projeto específico",
      parameters: "id",
      responseType: "ProjectoDetalhado",
    },
    {
      name: "POST /api/trpc/projetos.criar",
      description: "Criar um novo projeto",
      parameters: "ProjectoInput",
      responseType: "Projecto",
    },
    {
      name: "GET /api/trpc/workpackages.listar",
      description: "Obter workpackages de um projeto",
      parameters: "projetoId",
      responseType: "WorkPackageListResponse",
    },
    {
      name: "GET /api/trpc/tarefas.listar",
      description: "Obter tarefas de um workpackage",
      parameters: "workpackageId",
      responseType: "TarefaListResponse",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/documentacao")}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">API Documentation</h1>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden mb-8">
          <div className="p-6 border-b bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-900">Introdução</h2>
          </div>
          <div className="p-6">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto"
            >
              Bem-vindo à documentação da API STAR SoftFlow. A nossa API permite-lhe integrar as poderosas funcionalidades de gestão de projetos da nossa plataforma diretamente nos seus sistemas e fluxos de trabalho personalizados.
            </motion.p>
            <p className="text-gray-700 mb-4">
              A API é baseada em tRPC e pode ser acessada através de endpoints REST ou usando o cliente tRPC para uma
              experiência com TypeScript totalmente tipada.
            </p>
            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="text-sm text-gray-700 font-medium mb-2">URL Base:</p>
              <code className="bg-gray-900 text-gray-100 px-3 py-2 rounded text-sm block">
                https://STARSoftFlow.app/api/trpc
              </code>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden mb-8">
          <div className="p-6 border-b bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-900">Autenticação</h2>
          </div>
          <div className="p-6">
            <p className="text-gray-700 mb-4">
              Todas as requisições devem incluir um cabeçalho de autorização com um token JWT válido:
            </p>
            <div className="bg-gray-100 p-4 rounded-lg mb-4">
              <code className="text-sm block text-gray-800">
                Authorization: Bearer {"<seu_token_jwt>"}
              </code>
            </div>
            <p className="text-gray-700">
              Para obter um token, utilize o endpoint de autenticação:
            </p>
            <div className="bg-gray-100 p-4 rounded-lg mt-2">
              <code className="text-sm block text-gray-800">
                POST /api/auth/login
              </code>
              <p className="text-xs text-gray-600 mt-2">
                Body: {" { email: string, password: string }"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-6 border-b bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-900">Endpoints Disponíveis</h2>
          </div>
          <div className="divide-y">
            {endpoints.map((endpoint, index) => (
              <div key={index} className="p-6">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      <code className="bg-gray-100 px-2 py-1 rounded text-gray-800">{endpoint.name}</code>
                    </h3>
                    <p className="text-gray-700 mb-2">{endpoint.description}</p>
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium text-gray-700">Parâmetros:</span> {endpoint.parameters}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium text-gray-700">Resposta:</span> {endpoint.responseType}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <Link 
                      href={`/api/documentacao/endpoints/${endpoint.name.split(" ").length > 1 ? endpoint.name.split(" ")[1]?.replace("/api/trpc/", "") : ""}`}
                      className="inline-flex items-center text-azul hover:text-azul-dark text-sm font-medium"
                    >
                      Ver Detalhes
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 bg-gradient-to-r from-azul to-azul-dark text-white rounded-xl p-8 shadow-md relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/pattern-grid.svg')] bg-center opacity-10"></div>
          <div className="absolute right-0 bottom-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="flex flex-col md:flex-row gap-6 items-center relative z-10">
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">Precisa de mais informações?</h2>
              <p className="text-white/90 mb-4">
                Acesse nossa documentação completa da API com exemplos, schemas e tutoriais.
              </p>
              <Button
                variant="outline"
                className="border-white border-2 text-white hover:bg-white/10 rounded-full"
                onClick={() => router.push("/documentacao")}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Documentação completa
              </Button>
            </div>
            <div className="flex-shrink-0">
              <div className="bg-white/10 rounded-full p-4">
                <Code className="h-12 w-12 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 