import { object, string } from "zod";

export const loginSchema = object({
  email: string({ required_error: "Email é obrigatório" })
    .min(1, "Email é obrigatório")
    .email("Email inválido"),
  password: string({ required_error: "Password é obrigatória" })
    .min(1, "Password é obrigatória")
    .min(8, "Password deve ter pelo menos 8 caracteres")
    .max(32, "Password deve ter no máximo 32 caracteres"),
});
