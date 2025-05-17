import { type Channel as PusherChannel } from 'pusher-js';

export const CHANNELS = {
  NOTIFICACOES_GERAIS: "private-notificacoes",
};

export const EVENTS = {
  NOVA_NOTIFICACAO: "nova-notificacao",
};

export type Channel = PusherChannel; 