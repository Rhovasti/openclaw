/**
 * IRC channel configuration types
 */

import type {
  BlockStreamingCoalesceConfig,
  DmPolicy,
  GroupPolicy,
  MarkdownConfig,
  OutboundRetryConfig,
  ReplyToMode,
} from "./types.base.js";
import type { ChannelHeartbeatVisibilityConfig } from "./types.channels.js";
import type { DmConfig, ProviderCommandsConfig } from "./types.messages.js";
import type { GroupToolPolicyConfig, GroupToolPolicyBySenderConfig } from "./types.tools.js";

export type IrcDmConfig = {
  /** If false, ignore all incoming IRC DMs. Default: true. */
  enabled?: boolean;
  /** Direct message access policy (default: pairing). */
  policy?: DmPolicy;
  /** Allowlist for DM senders (nicks or hostmasks). */
  allowFrom?: string[];
};

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

export type IrcNetworkEntry = {
  slug?: string;
  requireMention?: boolean;
  /** Optional tool policy overrides for this network. */
  tools?: GroupToolPolicyConfig;
  toolsBySender?: GroupToolPolicyBySenderConfig;
  users?: string[];
  channels?: Record<string, IrcChannelConfig>;
};

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
  /** Channel heartbeat visibility config */
  heartbeatVisibility?: ChannelHeartbeatVisibilityConfig;
  /** Block streaming coalesce config */
  blockStreamingCoalesce?: BlockStreamingCoalesceConfig;
};
