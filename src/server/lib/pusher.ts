import PusherServer from "pusher";
import { CHANNELS, EVENTS } from "../../lib/pusher-config";

if (!process.env.PUSHER_APP_ID) {
  throw new Error("Missing PUSHER_APP_ID environment variable");
}
if (!process.env.PUSHER_KEY) {
  throw new Error("Missing PUSHER_KEY environment variable");
}
if (!process.env.PUSHER_SECRET) {
  throw new Error("Missing PUSHER_SECRET environment variable");
}
if (!process.env.PUSHER_CLUSTER) {
  throw new Error("Missing PUSHER_CLUSTER environment variable");
}

export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true, //Para mais segurança
});

// Função auxiliar para disparar eventos (opcional, mas pode ser útil)
export async function triggerPusherEvent(channel: string, event: string, data: unknown) {
  try {
    await pusherServer.trigger(channel, event, data);
    console.log(`[Pusher] Evento '${event}' enviado para o canal '${channel}'`, data);
  } catch (error) {
    console.error(`[Pusher] Erro ao enviar evento para '${channel}':`, error);
    // Considere adicionar um tratamento de erro mais robusto aqui
  }
}

export { CHANNELS, EVENTS }; 