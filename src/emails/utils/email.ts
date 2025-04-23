import { sendEmail } from "@/emails/utils/send-email";

export async function sendPrimeiroAcessoEmail(
  email: string,
  nome: string,
  token: string
): Promise<void> {
  await sendEmail({
    to: email,
    type: "welcome",
    variables: {
      userName: nome,
      activationLink: `${process.env.NEXT_PUBLIC_APP_URL}/primeiro-login?token=${token}`,
    },
  });
}

export async function sendPasswordResetEmail(
  email: string,
  nome: string,
  token: string
): Promise<void> {
  await sendEmail({
    to: email,
    type: "resetPassword",
    variables: {
      userName: nome,
      resetLink: `${process.env.NEXT_PUBLIC_APP_URL}/recuperar-password?token=${token}`,
      verificationCode: Math.floor(100000 + Math.random() * 900000).toString(),
    },
  });
}

// E assim por diante para notificações...
