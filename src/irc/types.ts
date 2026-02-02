/**
 * IRC channel types for OpenClaw
 */

import type {
  DmPolicy,
  GroupPolicy,
  MarkdownConfig,
  OutboundRetryConfig,
  ReplyToMode,
} from "../config/types.base.js";
import type { DmConfig, ProviderCommandsConfig } from "../config/types.messages.js";
import type {
  GroupToolPolicyConfig,
  GroupToolPolicyBySenderConfig,
} from "../config/types.tools.js";

/**
 * IRC server configuration
 */
export type IrcServerConfig = {
  /** IRC server hostname (e.g., irc.libera.chat) */
  host: string;
  /** IRC server port (default: 6697 for TLS) */
  port?: number;
  /** Enable TLS/SSL (default: true) */
  tls?: boolean;
  /** Server password (optional) */
  password?: string;
  /** Nickname for the bot */
  nick: string;
  /** Username (defaults to nick) */
  username?: string;
  /** Real name / GECOS */
  gecos?: string;
  /** SASL authentication (recommended) */
  sasl?: {
    account: string;
    password: string;
  };
  /** NickServ authentication (legacy) */
  nickserv?: {
    password: string;
  };
  /** Auto-join channels */
  channels?: string[];
};

/**
 * IRC channel configuration
 */
export type IrcChannelConfig = {
  allow?: boolean;
  requireMention?: boolean;
  /** Optional tool policy overrides for this channel. */
  tools?: GroupToolPolicyConfig;
  toolsBySender?: GroupToolPolicyBySenderConfig;
  /** If specified, only load these skills for this channel. */
  skills?: string[];
  /** If false, disable the bot for this channel. */
  enabled?: boolean;
  /** Optional allowlist for channel senders (nicks or hostmasks). */
  users?: string[];
  /** Optional system prompt snippet for this channel. */
  systemPrompt?: string;
};

/**
 * IRC network entry
 */
export type IrcNetworkEntry = {
  slug?: string;
  requireMention?: boolean;
  /** Optional tool policy overrides for this network. */
  tools?: GroupToolPolicyConfig;
  toolsBySender?: GroupToolPolicyBySenderConfig;
  users?: string[];
  channels?: Record<string, IrcChannelConfig>;
};

/**
 * IRC DM configuration
 */
export type IrcDmConfig = {
  /** If false, ignore all incoming IRC DMs. Default: true. */
  enabled?: boolean;
  /** Direct message access policy (default: pairing). */
  policy?: DmPolicy;
  /** Allowlist for DM senders (nicks or hostmasks). */
  allowFrom?: string[];
};

/**
 * IRC account configuration
 */
export type IrcAccountConfig = {
  enabled?: boolean;
  /** IRC server configuration */
  server: IrcServerConfig;
  /** Group policy (open, allowlist, disabled) */
  groupPolicy?: GroupPolicy;
  /** Network and channel configuration */
  networks?: Record<string, IrcNetworkEntry>;
  /** DM configuration */
  dm?: IrcDmConfig;
  /** Command configuration */
  commands?: ProviderCommandsConfig;
  /** Character prefix for commands (default: !) */
  commandPrefix?: string;
  /** Markdown configuration */
  markdown?: MarkdownConfig;
  /** Reply-to mode */
  replyToMode?: ReplyToMode;
  /** Retry configuration for failed sends */
  retry?: OutboundRetryConfig;
  /** History limit */
  historyLimit?: number;
};

/**
 * IRC message event
 */
export type IrcMessageEvent = {
  type: "message";
  nick: string;
  ident: string;
  hostname: string;
  target: string; // Channel or nick (for DMs)
  message: string;
  tags?: Map<string, string>;
  time?: Date;
};

/**
 * IRC notice event
 */
export type IrcNoticeEvent = {
  type: "notice";
  nick: string;
  ident: string;
  hostname: string;
  target: string;
  message: string;
  tags?: Map<string, string>;
  time?: Date;
};

/**
 * IRC join event
 */
export type IrcJoinEvent = {
  type: "join";
  nick: string;
  ident: string;
  hostname: string;
  channel: string;
  time?: Date;
};

/**
 * IRC part event
 */
export type IrcPartEvent = {
  type: "part";
  nick: string;
  ident: string;
  hostname: string;
  channel: string;
  reason?: string;
  time?: Date;
};

/**
 * IRC quit event
 */
export type IrcQuitEvent = {
  type: "quit";
  nick: string;
  ident: string;
  hostname: string;
  reason?: string;
  channels?: string[];
  time?: Date;
};

/**
 * IRC kick event
 */
export type IrcKickEvent = {
  type: "kick";
  nick: string;
  ident: string;
  hostname: string;
  channel: string;
  kicked: string;
  reason?: string;
  time?: Date;
};

/**
 * IRC events union
 */
export type IrcEvent =
  | IrcMessageEvent
  | IrcNoticeEvent
  | IrcJoinEvent
  | IrcPartEvent
  | IrcQuitEvent
  | IrcKickEvent;

/**
 * IRC target information
 */
export type IrcTarget = {
  type: "channel" | "dm";
  target: string; // Channel name or nick
  network?: string;
  server?: string;
};

/**
 * Monitor options
 */
export type MonitorIrcOpts = {
  config?: import("../config/config.js").OpenClawConfig;
  accountId?: string;
  runtime?: import("../runtime.js").RuntimeEnv;
  mode?: "poll" | "socket";
};
