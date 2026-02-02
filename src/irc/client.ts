/**
 * IRC client wrapper using irc-framework
 */

import type { IrcAccountConfig, IrcServerConfig } from "./types.js";

// irc-framework types - using any for the library
type IrcClientLike = {
  connect(): void;
  quit(reason?: string): void;
  say(target: string, message: string): void;
  notice(target: string, message: string): void;
  action(target: string, message: string): void;
  join(channel: string): void;
  part(channel: string, reason?: string): void;
  ctcpRequest(target: string, type: string, params?: string): void;
  ctcpResponse(target: string, type: string, params?: string): void;
  channelList?(): Map<string, any>;
  on(event: string, handler: (...args: any[]) => void): void;
};

/**
 * IRC client options
 */
export type IrcClientOptions = IrcServerConfig & {
  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Maximum reconnection wait time in ms (default: 300000) */
  autoReconnectMaxWait?: number;
  /** Maximum reconnection retries (default: Infinity) */
  autoReconnectMaxRetries?: number;
  /** Ping interval in seconds (default: 30) */
  pingInterval?: number;
  /** Ping timeout in seconds (default: 120) */
  pingTimeout?: number;
  /** Enable CTCP responses (default: true) */
  enableCtcp?: boolean;
};

/**
 * IRC client wrapper
 */
export class IrcClient {
  private client: IrcClientLike | null = null;
  private connected = false;
  private registered = false;

  constructor(private options: IrcClientOptions) {}

  /**
   * Connect to IRC server
   */
  async connect(): Promise<void> {
    if (this.connected) {
      throw new Error("IRC client already connected");
    }

    // Dynamically import irc-framework
    const ircModule = await import("irc-framework");
    const Client = (ircModule as any).Client || (ircModule as any).default?.Client;

    const clientOptions: Record<string, unknown> = {
      host: this.options.host,
      port: this.options.port || 6697,
      nick: this.options.nick,
      username: this.options.username || this.options.nick,
      gecos: this.options.gecos || this.options.nick,
      tls: this.options.tls !== false,
      auto_reconnect: this.options.autoReconnect !== false,
      auto_reconnect_max_wait: this.options.autoReconnectMaxWait || 300000,
      auto_reconnect_max_retries: this.options.autoReconnectMaxRetries || Infinity,
      ping_interval: this.options.pingInterval || 30,
      ping_timeout: this.options.pingTimeout || 120,
    };

    // Add SASL authentication if configured
    if (this.options.sasl) {
      clientOptions.account = {
        account: this.options.sasl.account,
        password: this.options.sasl.password,
      };
    }

    // Add server password if configured
    if (this.options.password) {
      clientOptions.password = this.options.password;
    }

    this.client = new Client(clientOptions as any);
    if (!this.client) throw new Error("Failed to create IRC client");
    this.setupEventHandlers();
    this.client.connect();
    this.connected = true;
  }

  /**
   * Disconnect from IRC server
   */
  disconnect(reason?: string): void {
    if (!this.connected || !this.client) return;

    if (reason) {
      this.client.quit(reason);
    } else {
      this.client.quit("Bot shutting down");
    }
    this.connected = false;
    this.registered = false;
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Check if client is registered (nickname accepted)
   */
  isRegistered(): boolean {
    return this.registered;
  }

  /**
   * Join a channel
   */
  join(channel: string): void {
    if (!this.client) throw new Error("IRC client not connected");
    this.client.join(channel);
  }

  /**
   * Join multiple channels
   */
  joinChannels(channels: string[]): void {
    for (const channel of channels) {
      this.join(channel);
    }
  }

  /**
   * Part (leave) a channel
   */
  part(channel: string, reason?: string): void {
    if (!this.client) throw new Error("IRC client not connected");
    this.client.part(channel, reason);
  }

  /**
   * Send a message to a target (channel or user)
   */
  say(target: string, message: string): void {
    if (!this.client) throw new Error("IRC client not connected");
    this.client.say(target, message);
  }

  /**
   * Send a notice to a target
   */
  notice(target: string, message: string): void {
    if (!this.client) throw new Error("IRC client not connected");
    this.client.notice(target, message);
  }

  /**
   * Send an action (/me command)
   */
  action(target: string, message: string): void {
    if (!this.client) throw new Error("IRC client not connected");
    this.client.action(target, message);
  }

  /**
   * Send a CTCP request
   */
  ctcpRequest(target: string, type: string, params?: string): void {
    if (!this.client) throw new Error("IRC client not connected");
    this.client.ctcpRequest(target, type, params);
  }

  /**
   * Send a CTCP response
   */
  ctcpResponse(target: string, type: string, params?: string): void {
    if (!this.client) throw new Error("IRC client not connected");
    this.client.ctcpResponse(target, type, params);
  }

  /**
   * Get channel list
   */
  getChannels(): string[] {
    if (!this.client || !this.client.channelList) return [];
    const channels = this.client.channelList();
    return channels ? Array.from(channels.keys()) : [];
  }

  /**
   * Check if in a channel
   */
  inChannel(channel: string): boolean {
    return this.getChannels().includes(channel.toLowerCase());
  }

  /**
   * Register event handler
   */
  on(event: string, handler: (...args: any[]) => void): void {
    // Event handlers are registered internally in setupEventHandlers
    // This is a no-op for external use
  }

  /**
   * Setup internal event handlers
   */
  private setupEventHandlers(): void {
    if (!this.client) return;

    const client = this.client;

    client.on("registered", () => {
      this.registered = true;
    });

    client.on("ctcp request", (event: { nick: string; type: string; params?: string }) => {
      switch (event.type) {
        case "VERSION":
          this.ctcpResponse(event.nick, "VERSION", "OpenClaw IRC Bot v1.0");
          break;
        case "PING":
          if (event.params) {
            this.ctcpResponse(event.nick, "PING", event.params);
          }
          break;
        case "TIME":
          this.ctcpResponse(event.nick, "TIME", new Date().toString());
          break;
        case "SOURCE":
          this.ctcpResponse(event.nick, "SOURCE", "https://github.com/openclaw/openclaw");
          break;
      }
    });
  }
}

/**
 * Create an IRC client from account configuration
 */
export function createIrcClient(config: IrcAccountConfig): IrcClient {
  return new IrcClient({
    ...config.server,
    autoReconnect: true,
  });
}
