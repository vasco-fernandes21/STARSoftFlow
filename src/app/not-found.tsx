"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bgApp p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-6 flex justify-center">
          <Image 
            src="/star-institute-logo.png" 
            alt="STAR Institute Logo" 
            width={120} 
            height={40} 
            className="h-auto" 
          />
        </div>

        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-azul-subtle">
            <AlertCircle className="h-12 w-12 text-azul" />
          </div>
        </div>

        <h1 className="mb-2 text-center text-2xl font-bold text-slate-800">
          Página não encontrada
        </h1>
        
        <p className="mb-6 text-center text-slate-500">
          A página que procura não existe ou foi movida para outro endereço.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="flex w-full items-center justify-center gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          
          <Button
            onClick={() => router.push("/")}
            className="flex w-full items-center justify-center gap-2 bg-azul hover:bg-azul-light"
          >
            <Home className="h-4 w-4" />
            Página inicial
          </Button>
        </div>
      </div>
      
      <div className="mt-8 text-center text-xs text-slate-400">
        <p>StarSoftFlow • Sistema de Gestão de Projetos</p>
      </div>
    </div>
  );
} 