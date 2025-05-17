import Pusher from 'pusher-js';
import { type Channel } from 'pusher-js';
import { CHANNELS } from './pusher-config';

interface PusherConnection {
  instance: Pusher;
  channel: Channel | null;
  lastUsed: number;
}

class PusherSingleton {
  private static instance: PusherSingleton;
  private connections: Map<string, PusherConnection>;
  private cleanupInterval: NodeJS.Timeout | null;

  private constructor() {
    this.connections = new Map();
    this.cleanupInterval = null;
    this.startCleanupInterval();
  }

  public static getInstance(): PusherSingleton {
    if (!PusherSingleton.instance) {
      PusherSingleton.instance = new PusherSingleton();
    }
    return PusherSingleton.instance;
  }

  private startCleanupInterval() {
    // Limpar conexões inativas a cada 5 minutos
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      this.connections.forEach((connection, userId) => {
        // Se a conexão não foi usada nos últimos 10 minutos
        if (now - connection.lastUsed > 600000) {
          this.disconnect(userId);
        }
      });
    }, 300000);
  }

  public getConnection(
    userId: string,
    pusherKey: string,
    pusherCluster: string,
    authorizer: (channel: { name: string }, options: unknown) => { authorize: (socketId: string, callback: (error: Error | null, authData: { auth: string } | null) => void) => void }
  ): { instance: Pusher; channel: Channel | null } {
    const existingConnection = this.connections.get(userId);
    
    if (existingConnection) {
      existingConnection.lastUsed = Date.now();
      return {
        instance: existingConnection.instance,
        channel: existingConnection.channel
      };
    }

    console.log(`[Pusher Singleton] Criando nova conexão para utilizador ${userId}`);
    const newInstance = new Pusher(pusherKey, {
      cluster: pusherCluster,
      authorizer,
      enabledTransports: ['ws', 'wss'],
      disabledTransports: ['xhr_streaming', 'xhr_polling', 'sockjs'],
      activityTimeout: 120000,
      pongTimeout: 30000,
      auth: {
        headers: {
          'Cache-Control': 'no-cache',
        },
      },
    });

    const newConnection: PusherConnection = {
      instance: newInstance,
      channel: null,
      lastUsed: Date.now()
    };

    this.connections.set(userId, newConnection);
    return {
      instance: newInstance,
      channel: null
    };
  }

  public setChannel(userId: string, channel: Channel) {
    const connection = this.connections.get(userId);
    if (connection) {
      connection.channel = channel;
      connection.lastUsed = Date.now();
    }
  }

  public disconnect(userId: string) {
    const connection = this.connections.get(userId);
    if (connection) {
      if (connection.channel) {
        connection.instance.unsubscribe(connection.channel.name);
      }
      connection.instance.disconnect();
      this.connections.delete(userId);
      console.log(`[Pusher Singleton] Desconectado usuário ${userId}`);
    }
  }

  public cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.connections.forEach((connection, userId) => {
      this.disconnect(userId);
    });
    this.connections.clear();
  }
}

export const pusherSingleton = PusherSingleton.getInstance(); 