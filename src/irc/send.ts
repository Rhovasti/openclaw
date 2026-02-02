/**
 * Send messages to IRC
 */

import type { IrcClient } from "./client.js";

/**
 * Send a message to IRC
 */
export async function sendMessageIrc(
  client: IrcClient,
  target: string,
  text: string,
  options: {
    /** Send as action (/me) instead of regular message */
    action?: boolean;
    /** Send as notice instead of message */
    notice?: boolean;
    /** Split long messages (IRC limit is typically 512 bytes total) */
    split?: boolean;
    /** Prefix for split messages */
    splitPrefix?: string;
  } = {},
): Promise<void> {
  if (!client.isConnected()) {
    throw new Error("IRC client not connected");
  }

  const { action, notice, split, splitPrefix } = options;

  // IRC message limit is 512 bytes total including protocol overhead
  // Safe message content limit is around 400-450 bytes depending on nick/host
  const MAX_LENGTH = 400;

  if (text.length <= MAX_LENGTH || !split) {
    if (action) {
      client.action(target, text);
    } else if (notice) {
      client.notice(target, text);
    } else {
      client.say(target, text);
    }
    return;
  }

  // Split long messages
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > MAX_LENGTH) {
    // Find a good split point (newline, space, or punctuation)
    let splitIndex = MAX_LENGTH;

    // Try to split at newline
    const lastNewline = remaining.lastIndexOf("\n", MAX_LENGTH);
    if (lastNewline > MAX_LENGTH - 100) {
      splitIndex = lastNewline + 1;
    } else {
      // Try to split at space
      const lastSpace = remaining.lastIndexOf(" ", MAX_LENGTH);
      if (lastSpace > MAX_LENGTH - 50) {
        splitIndex = lastSpace + 1;
      } else {
        // Try to split at punctuation
        const lastPunct = Math.max(
          remaining.lastIndexOf(".", MAX_LENGTH),
          remaining.lastIndexOf(",", MAX_LENGTH),
          remaining.lastIndexOf(";", MAX_LENGTH),
          remaining.lastIndexOf("!", MAX_LENGTH),
          remaining.lastIndexOf("?", MAX_LENGTH),
        );
        if (lastPunct > MAX_LENGTH - 50) {
          splitIndex = lastPunct + 1;
        }
      }
    }

    chunks.push(remaining.slice(0, splitIndex).trimEnd());
    remaining = remaining.slice(splitIndex).trimStart();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  // Send chunks with prefix
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const isFirst = i === 0;
    const isLast = i === chunks.length - 1;

    let message = chunk;
    if (!isFirst && splitPrefix) {
      message = `${splitPrefix} ${message}`;
    }

    if (!isLast) {
      message = `${message} ...`;
    }

    if (action) {
      client.action(target, message);
    } else if (notice) {
      client.notice(target, message);
    } else {
      client.say(target, message);
    }

    // Small delay between chunks to avoid rate limiting
    if (!isLast) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

/**
 * Send an action message (/me)
 */
export async function sendActionIrc(
  client: IrcClient,
  target: string,
  text: string,
): Promise<void> {
  return sendMessageIrc(client, target, text, { action: true });
}

/**
 * Send a notice message
 */
export async function sendNoticeIrc(
  client: IrcClient,
  target: string,
  text: string,
): Promise<void> {
  return sendMessageIrc(client, target, text, { notice: true });
}

/**
 * React to a message with an emote
 * Note: IRC doesn't have native reactions, so we send an action message
 */
export async function reactMessageIrc(
  client: IrcClient,
  target: string,
  emote: string,
): Promise<void> {
  client.action(target, emote);
}

/**
 * Edit a message (not natively supported in IRC, sends a replacement message)
 */
export async function editMessageIrc(
  client: IrcClient,
  target: string,
  originalText: string,
  newText: string,
): Promise<void> {
  // IRC doesn't support message editing, so we send a correction message
  await sendMessageIrc(client, target, `${originalText} (Correction: ${newText})`);
}
