import { Resend } from 'resend'
import { env } from '@/env'

const resend = new Resend(env.RESEND_API_KEY)

export async function sendVerificationRequest(params: {
  identifier: string
  url: string
  provider: any
}) {
  const { identifier, url } = params

  try {
    await resend.emails.send({
      from: env.EMAIL_FROM,
      to: identifier,
      subject: 'Faça login no seu sistema',
      html: `
        <body>
          <h1>Login</h1>
          <p>Clique no link abaixo para fazer login:</p>
          <a href="${url}">Fazer Login</a>
        </body>
      `
    })
  } catch (error) {
    console.error('Error sending verification email', error)
    throw new Error('Failed to send verification email')
  }
} 