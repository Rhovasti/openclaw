import { sendMessageIrc } from "../../../irc/send-wrapper.js";
import type { ChannelOutboundAdapter } from "../types.js";

export const ircOutbound: ChannelOutboundAdapter = {
  deliveryMode: "direct",
  chunker: null,
  textChunkLimit: 512, // IRC message length limit
  pollMaxOptions: 0, // IRC doesn't support polls natively
  sendText: async ({ to, text, accountId, replyToId }) => {
    // Note: replyToId not yet supported for IRC
    const result = await sendMessageIrc(to, text, {
      accountId: accountId ?? undefined,
    });
    // IRC doesn't have message IDs, return target as identifier
    return {
      channel: "irc",
      messageId: result.target,
      target: result.target,
    };
  },
  sendMedia: async ({ to, text, mediaUrl, accountId }) => {
    // IRC doesn't support media natively, send URL as text
    const message = mediaUrl ? `${text}\n${mediaUrl}` : text;
    const result = await sendMessageIrc(to, message, {
      accountId: accountId ?? undefined,
    });
    return {
      channel: "irc",
      messageId: result.target,
      target: result.target,
    };
  },
  sendPoll: undefined, // IRC doesn't support polls
};
