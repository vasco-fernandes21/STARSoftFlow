"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { loginSchema } from "@/server/api/auth/types";
import { ZodError } from "zod";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      loginSchema.parse({ email, password });

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result) {
        throw new Error("Não foi possível realizar o login");
      }

      if (result.error) {
        toast({
          variant: "destructive",
          title: "Dados inválidos",
          description: "Por favor, verifique o email e a palavra-passe.",
        });
        return;
      }

      try {
        router.push("/");
        router.refresh();
      } catch (redirectError) {
        window.location.href = "/";
      }
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors = error.errors.map((err) => err.message);
        toast({
          variant: "destructive",
          title: "Erro de validação",
          description: fieldErrors[0] || "Por favor verifique os campos de entrada",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erro no login",
          description: "Ocorreu um erro durante o login. Por favor, tente novamente.",
        });
      }
    } finally {
      if (document.visibilityState !== "hidden") {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* Left side - Animation and Image */}
      <div className="relative hidden bg-azul/20 lg:flex lg:w-1/2">
        {/* Fixed gradient background with blur */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(120deg, rgba(255,255,255,0.9) 0%, rgba(59,130,246,0.5) 100%)",
            backdropFilter: "blur(16px)",
          }}
        />
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="w-full max-w-md"
          >
            <Image
              src="/star-institute-logo.png"
              alt="STAR Institute"
              width={280}
              height={80}
              priority
              className="mb-12 drop-shadow-lg"
              onError={(e) => {
                console.error("Error loading logo:", e);
                e.currentTarget.src = "/favicon.ico";
              }}
            />
            <motion.h1
              className="mb-6 text-4xl font-bold text-azul"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              STARSoftFlow
            </motion.h1>
            <motion.p
              className="text-lg text-azul/80"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              Acompanhe em tempo real o progresso, simplifique a alocação de recursos e maximize a
              sua eficiência.
            </motion.p>
          </motion.div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="relative flex w-full items-center justify-center bg-white lg:w-1/2">
        <div className="w-full max-w-md px-6 py-12 sm:px-12">
          {/* Logo for mobile only */}
          <div className="mb-12 flex justify-center lg:hidden">
            <Image
              src="/star-institute-logo.png"
              alt="STAR Institute"
              width={180}
              height={48}
              priority
              className="h-10 w-auto"
              onError={(e) => {
                console.error("Error loading logo:", e);
                e.currentTarget.src = "/favicon.ico";
              }}
            />
          </div>

          <div>
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-gray-900">Bem-vindo</h2>
              <p className="mt-2 text-gray-500">Entre para continuar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border-0 px-4 py-3.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 transition-all duration-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-azul"
                  placeholder="utilizador@starinstitute.com"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Palavra-passe
                  </label>
                  <Link href="/" className="text-sm font-medium text-azul hover:text-azul/80">
                    Esqueceu-se?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-xl border-0 px-4 py-3.5 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 transition-all duration-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-azul"
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="h-5 w-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="h-5 w-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="flex w-full justify-center rounded-xl bg-azul px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-azul/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azul"
                disabled={isLoading}
              >
                {isLoading ? "A processar..." : "Entrar"}
              </button>
            </form>

            {/* Footer */}
            <footer className="mt-8 text-center text-xs text-gray-400">
              © {new Date().getFullYear()} STAR Institute. Todos os direitos reservados.
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
