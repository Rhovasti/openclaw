/**
 * Type definitions for irc-framework
 */

declare module "irc-framework" {
  export interface IrcClientOptions {
    host: string;
    port?: number;
    nick: string;
    username?: string;
    gecos?: string;
    tls?: boolean;
    password?: string;
    account?: {
      account: string;
      password: string;
    };
    auto_reconnect?: boolean;
    auto_reconnect_max_wait?: number;
    auto_reconnect_max_retries?: number;
    ping_interval?: number;
    ping_timeout?: number;
    encoding?: string;
  }

  export interface IrcMessageEvent {
    nick: string;
    ident: string;
    hostname: string;
    target: string;
    message: string;
    tags: Map<string, string>;
    time: Date;
  }

  export interface IrcNoticeEvent {
    nick: string;
    ident: string;
    hostname: string;
    target: string;
    message: string;
    tags: Map<string, string>;
    time: Date;
  }

  export interface IrcJoinEvent {
    nick: string;
    ident: string;
    hostname: string;
    channel: string;
    time: Date;
  }

  export interface IrcPartEvent {
    nick: string;
    ident: string;
    hostname: string;
    channel: string;
    reason?: string;
    time: Date;
  }

  export interface IrcQuitEvent {
    nick: string;
    ident: string;
    hostname: string;
    reason?: string;
    channels: string[];
    time: Date;
  }

  export interface IrcKickEvent {
    nick: string;
    ident: string;
    hostname: string;
    channel: string;
    kicked: string;
    reason?: string;
    time: Date;
  }

  export interface IrcCtcpRequestEvent {
    nick: string;
    type: string;
    params?: string;
  }

  export interface IrcClient {
    connect(): void;
    quit(reason?: string): void;
    say(target: string, message: string): void;
    notice(target: string, message: string): void;
    action(target: string, message: string): void;
    join(channel: string): void;
    part(channel: string, reason?: string): void;
    ctcpRequest(target: string, type: string, params?: string): void;
    ctcpResponse(target: string, type: string, params?: string): void;
    channelList(): Map<string, any> | undefined;

    on(event: "registered", handler: () => void): this;
    on(event: "message", handler: (event: IrcMessageEvent) => void): this;
    on(event: "notice", handler: (event: IrcNoticeEvent) => void): this;
    on(event: "join", handler: (event: IrcJoinEvent) => void): this;
    on(event: "part", handler: (event: IrcPartEvent) => void): this;
    on(event: "quit", handler: (event: IrcQuitEvent) => void): this;
    on(event: "kick", handler: (event: IrcKickEvent) => void): this;
    on(event: "ctcp request", handler: (event: IrcCtcpRequestEvent) => void): this;
    on(event: "error", handler: (err: Error) => void): this;
    on(event: "close", handler: () => void): this;
  }

  export class Client implements IrcClient {
    constructor(options: IrcClientOptions);
  }

  export default Client;
}
