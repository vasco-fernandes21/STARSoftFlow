"use client";

import Image from "next/image";
import { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, AlertCircle, CheckCircle, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { signIn } from "next-auth/react";
import { api } from "@/trpc/react";
import { z } from "zod";

// Schema para validação do email
const emailSchema = z.object({
  email: z.string().email("Email inválido"),
});

// Loading component for Suspense
function RecuperarPasswordLoading() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-azul border-t-transparent"></div>
        <p className="text-azul">A carregar...</p>
      </div>
    </div>
  );
}

// Main component with useSearchParams wrapped in Suspense
function RecuperarPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Validação de palavra-passe
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    upperCase: false,
    lowerCase: false,
    number: false,
    special: false,
  });

  useEffect(() => {
    // Validar força da palavra-passe
    setPasswordStrength({
      length: password.length >= 8,
      upperCase: /[A-Z]/.test(password),
      lowerCase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    });
  }, [password]);

  // Mutation para reset de password
  const resetPasswordMutation = api.utilizador.core.resetPassword.useMutation({
    onSuccess: () => {
      setSuccess(true);
      toast.success("Email enviado com sucesso. Por favor, verifique a sua caixa de entrada.");
    },
    onError: (error) => {
      toast.error(error.message || "Ocorreu um erro ao enviar o email de recuperação.");
    },
  });

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validar email
      emailSchema.parse({ email });

      // Chamar a mutation
      await resetPasswordMutation.mutateAsync({ email });
    } catch (error) {
      if (error instanceof z.ZodError) {
        setError("Por favor, insira um email válido.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("As palavras-passe não coincidem.");
      return;
    }

    const passwordChecks = Object.values(passwordStrength);
    if (passwordChecks.includes(false)) {
      setError("A palavra-passe não cumpre todos os requisitos de segurança.");
      return;
    }

    if (!token) {
      setError("Token de recuperação ausente. Verifique o link que recebeu.");
      return;
    }

    setIsSubmitting(true);

    const result = await signIn("token-validation", {
      token: token,
      password: password,
      redirect: false,
    });

    if (result?.error) {
      toast.error(result.error || "Falha na recuperação da palavra-passe");
      setError(result.error || "Falha na recuperação da palavra-passe");
      setIsSubmitting(false);
    } else {
      toast.success("Palavra-passe alterada com sucesso!");
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    }
  };

  // Calcular a força da password
  const passwordStrengthScore = Object.values(passwordStrength).filter(Boolean).length;
  const getPasswordStrengthLabel = () => {
    if (password.length === 0) return "";
    if (passwordStrengthScore <= 2) return "Fraca";
    if (passwordStrengthScore <= 4) return "Média";
    return "Forte";
  };

  const getPasswordStrengthColor = () => {
    if (password.length === 0) return "bg-gray-200";
    if (passwordStrengthScore <= 2) return "bg-red-500";
    if (passwordStrengthScore <= 4) return "bg-yellow-500";
    return "bg-green-500";
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
            />
            <motion.h1
              className="mb-6 text-4xl font-bold text-azul"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              {token ? "Recupere a sua conta" : "Recuperar palavra-passe"}
            </motion.h1>
            <motion.p
              className="text-lg text-azul/80"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              {token
                ? "Defina a sua nova palavra-passe para recuperar o acesso à sua conta."
                : "Insira o seu email para receber instruções de recuperação."}
            </motion.p>
          </motion.div>
        </div>
      </div>

      {/* Right side - Form */}
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
            />
          </div>

          <div>
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-gray-900">
                {token ? "Defina a sua nova palavra-passe" : "Recuperar palavra-passe"}
              </h2>
              {!token && (
                <p className="mt-2 text-gray-500">
                  Insira o seu email para receber instruções de recuperação
                </p>
              )}
            </div>

            {!success ? (
              token ? (
                // Formulário para definir nova password
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  {/* Password fields - Reutilizar do primeiro-login */}
                  <div className="space-y-6">
                    {/* Password */}
                    <div className="space-y-2">
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        Nova palavra-passe
                      </label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="block w-full rounded-xl border-0 px-4 py-3.5 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 transition-all duration-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-azul"
                          placeholder="••••••••"
                          required
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

                      {/* Password força indicador */}
                      {password.length > 0 && (
                        <div className="mt-2">
                          <div className="mb-1 flex items-center justify-between">
                            <div className="text-xs font-medium text-gray-500">
                              Força da palavra-passe: {getPasswordStrengthLabel()}
                            </div>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                            <div
                              className={`h-1.5 ${getPasswordStrengthColor()} transition-all duration-300`}
                              style={{ width: `${(passwordStrengthScore / 5) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Confirmar Password */}
                    <div className="space-y-2">
                      <label
                        htmlFor="confirmPassword"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Confirmar palavra-passe
                      </label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="block w-full rounded-xl border-0 px-4 py-3.5 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 transition-all duration-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-azul"
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showConfirmPassword ? (
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
                      {confirmPassword && password !== confirmPassword && (
                        <p className="mt-1 flex items-center text-sm text-red-600">
                          <XCircle className="mr-1 h-4 w-4" /> As palavras-passe não coincidem
                        </p>
                      )}
                      {confirmPassword && password === confirmPassword && (
                        <p className="mt-1 flex items-center text-sm text-green-600">
                          <CheckCircle className="mr-1 h-4 w-4" /> As palavras-passe coincidem
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Requisitos de segurança */}
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <h3 className="mb-3 text-sm font-medium text-gray-700">
                      Requisitos de segurança:
                    </h3>
                    <ul className="space-y-2">
                      <li
                        className={`flex items-center text-sm ${passwordStrength.length ? "text-green-600" : "text-gray-500"}`}
                      >
                        {passwordStrength.length ? (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        ) : (
                          <AlertCircle className="mr-2 h-4 w-4" />
                        )}
                        Mínimo de 8 caracteres
                      </li>
                      <li
                        className={`flex items-center text-sm ${passwordStrength.upperCase ? "text-green-600" : "text-gray-500"}`}
                      >
                        {passwordStrength.upperCase ? (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        ) : (
                          <AlertCircle className="mr-2 h-4 w-4" />
                        )}
                        Pelo menos uma letra maiúscula
                      </li>
                      <li
                        className={`flex items-center text-sm ${passwordStrength.lowerCase ? "text-green-600" : "text-gray-500"}`}
                      >
                        {passwordStrength.lowerCase ? (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        ) : (
                          <AlertCircle className="mr-2 h-4 w-4" />
                        )}
                        Pelo menos uma letra minúscula
                      </li>
                      <li
                        className={`flex items-center text-sm ${passwordStrength.number ? "text-green-600" : "text-gray-500"}`}
                      >
                        {passwordStrength.number ? (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        ) : (
                          <AlertCircle className="mr-2 h-4 w-4" />
                        )}
                        Pelo menos um número
                      </li>
                      <li
                        className={`flex items-center text-sm ${passwordStrength.special ? "text-green-600" : "text-gray-500"}`}
                      >
                        {passwordStrength.special ? (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        ) : (
                          <AlertCircle className="mr-2 h-4 w-4" />
                        )}
                        Pelo menos um caractere especial
                      </li>
                    </ul>
                  </div>

                  {error && (
                    <div className="flex items-start rounded-lg bg-red-50 p-3 text-sm text-red-600">
                      <XCircle className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full justify-center rounded-xl bg-azul px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-azul/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azul disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <>
                        <svg
                          className="-ml-1 mr-3 h-5 w-5 animate-spin text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        A processar...
                      </>
                    ) : (
                      "Alterar palavra-passe"
                    )}
                  </Button>
                </form>
              ) : (
                // Formulário para solicitar reset
                <form onSubmit={handleEmailSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full rounded-xl border-0 px-4 py-3.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 transition-all duration-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-azul"
                        placeholder="utilizador@starinstitute.pt"
                        required
                        disabled={isSubmitting}
                      />
                      <Mail className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start rounded-lg bg-red-50 p-3 text-sm text-red-600">
                      <XCircle className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="flex w-full justify-center rounded-xl bg-azul px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-azul/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azul"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                        A processar...
                      </>
                    ) : (
                      "Enviar instruções"
                    )}
                  </Button>
                </form>
              )
            ) : token ? (
              // Sucesso após definir nova password
              <div className="space-y-4 p-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Palavra-passe alterada com sucesso!
                </h3>
                <p className="text-gray-500">
                  A sua palavra-passe foi alterada. Será redirecionado para a página inicial em
                  instantes.
                </p>
                <div className="mt-4 h-1.5 w-full rounded-full bg-gray-200">
                  <div className="animate-progress h-1.5 rounded-full bg-azul"></div>
                </div>
              </div>
            ) : (
              // Sucesso após enviar email
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <Mail className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-gray-900">Email enviado!</h3>
                <p className="mb-6 text-gray-500">
                  Enviámos instruções para recuperar a sua palavra-passe para {email}. Por favor,
                  verifique a sua caixa de entrada.
                </p>
                <Button variant="outline" onClick={() => router.push("/login")} className="mx-auto">
                  Voltar ao login
                </Button>
              </div>
            )}

            {/* Footer */}
            <footer className="mt-8 text-center text-xs text-gray-400">
              © {new Date().getFullYear()} STAR Institute. Todos os direitos reservados.
            </footer>
          </div>
        </div>
      </div>

      {/* Animação de progresso para o redirect após sucesso */}
      <style jsx global>{`
        @keyframes progress {
          0% {
            width: 0%;
          }
          100% {
            width: 100%;
          }
        }
        .animate-progress {
          animation: progress 3s linear forwards;
        }
      `}</style>
    </div>
  );
}

// Export Page component with Suspense
export default function RecuperarPasswordPage() {
  return (
    <Suspense fallback={<RecuperarPasswordLoading />}>
      <RecuperarPasswordContent />
    </Suspense>
  );
}