// Entry point: routes every incoming message to the right place
import { api } from 'sdk';
import * as store from 'lib/store';
import * as T from 'lib/text';
import { findWord, norm } from 'lib/match';
import { replyTo, drop } from 'lib/ui';
import { askAll, ensureCommands, notifyAll, sweep } from 'lib/admins';
import { ADMIN_COMMANDS, cmdStart } from 'lib/commands';
import { banEverywhere, safeBan } from 'lib/enforce';
import { cmdBan, cmdWarn } from 'lib/groupcmds';
import { askRows, botUsername, hitRows, unbanRows } from 'lib/rows';
import { parseId } from 'lib/util';

const HITS_LIMIT = 3;       // repeats of one phrase after which the ban is automatic

function isCommandMessage(message) {
  const e = message.entities && message.entities[0];
  return Boolean(message.text && e && e.type === 'bot_command' && e.offset === 0);
}

async function parseCommand(message) {
  if (!isCommandMessage(message)) return null;
  const e = message.entities[0];
  const [name, target] = message.text.slice(1, e.length).toLowerCase().split('@');
  if (target && target !== String(await botUsername()).toLowerCase()) return null;
  if (!['start', 'ban', 'wban', 'warn'].includes(name) && !ADMIN_COMMANDS[name]) return null;
  const args = message.text.slice(e.length).trim().split(/\s+/).filter(Boolean);
  return [name, args];
}

const SERVICE_FIELDS = [
  'new_chat_members', 'left_chat_member', 'new_chat_title', 'new_chat_photo', 'delete_chat_photo',
  'group_chat_created', 'supergroup_chat_created', 'channel_chat_created', 'message_auto_delete_timer_changed',
  'migrate_to_chat_id', 'migrate_from_chat_id', 'pinned_message', 'successful_payment', 'refunded_payment',
  'users_shared', 'chat_shared', 'gift', 'unique_gift', 'connected_website', 'write_access_allowed',
  'proximity_alert_triggered', 'boost_added', 'chat_background_set', 'forum_topic_created',
  'forum_topic_edited', 'forum_topic_closed', 'forum_topic_reopened', 'general_forum_topic_hidden',
  'general_forum_topic_unhidden', 'giveaway_created', 'giveaway', 'giveaway_winners', 'giveaway_completed',
  'video_chat_scheduled', 'video_chat_started', 'video_chat_ended', 'video_chat_participants_invited',
  'web_app_data', 'paid_message_price_changed', 'direct_message_price_changed', 'checklist_tasks_done',
  'checklist_tasks_added', 'suggested_post_approved', 'suggested_post_approval_failed',
  'suggested_post_declined', 'suggested_post_paid', 'suggested_post_refunded',
];

function isServiceMessage(message) {
  return SERVICE_FIELDS.some((f) => message[f] !== undefined);
}

// Channel posts mirrored into a linked discussion group get pinned there on their own; only those are undone.
// Needs the pin right, which is deliberately not required of the bot, so a failure is traced instead of leaving the chat.
async function unpinChannelPost(message) {
  const pinned = message.pinned_message;
  if (!pinned || !pinned.is_automatic_forward) return;
  try {
    await api.unpinChatMessage({ chat_id: message.chat.id, message_id: pinned.message_id });
  } catch (e) {
    await store.logError('unpin failed', message.chat.id, String((e && (e.description || e.message)) || 'Unknown error').slice(0, 120));
  }
}

export async function handleMessage(message, { isChannelPost = false } = {}) {
  const chat = message.chat;
  // Not gated on watched chats: any chat where the bot can delete gets cleaned, and drop() ignores the rest.
  if (chat.type !== 'private' && isServiceMessage(message)) {
    // A giveaway is real content an admin posted, even though Telegram files it with the service fields.
    if (message.giveaway === undefined) await drop(chat.id, message.message_id);
    await unpinChannelPost(message);
    return;
  }
  await sweep();
  const user = isChannelPost ? null : message.from || null;
  const adminId = await store.getAdminId();
  const ids = await store.getAdminIds();
  const isAdmin = Boolean(user && ids.includes(user.id));

  if (isAdmin && chat.type === 'private') await ensureCommands(ids);

  const cmd = !isChannelPost && user ? await parseCommand(message) : null;
  if (cmd) {
    const [name, args] = cmd;
    if (name === 'start') return cmdStart(message, user, adminId);
    if (!isAdmin) return;
    if (name === 'ban' || name === 'wban') return cmdBan(message, ids, name === 'wban');
    if (name === 'warn') return cmdWarn(message, args, ids);
    return ADMIN_COMMANDS[name](message, args);
  }

  if (chat.type === 'private') {
    if (isAdmin && message.text && !isCommandMessage(message)) return onPrivateText(message);
    return;
  }

  return onGroupMessage(message, user, adminId);
}

async function onPrivateText(message) {
  const text = message.text.trim();
  if (!text || text.startsWith('/')) return;
  if (!/^-?\d+$/.test(text)) return;
  if (text.replace(/^-+/, '').length <= 5) return;
  const targetId = parseId(text);
  if (targetId == null) return;

  if (targetId < 0) return replyTo(message, T.looksLikeChat(targetId));

  if (await store.isBanned(targetId)) {
    const code = await store.createPending({
      kind: 'unban', userId: targetId, cmdMsgId: message.message_id, expiresAt: 0,
    });
    const sent = await replyTo(message, T.alreadyBanned(targetId), unbanRows(code));
    return store.setAskMessage(code, message.chat.id, sent.message_id);
  }

  const code = await store.createPending({
    kind: 'ban', userId: targetId, cmdMsgId: message.message_id, expiresAt: 0,
  });
  const sent = await replyTo(message, T.askBan(targetId, null), askRows(code));
  await store.setAskMessage(code, message.chat.id, sent.message_id);
}

async function onGroupMessage(message, user, adminId) {
  const chat = message.chat;
  if (!['group', 'supergroup', 'channel'].includes(chat.type)) return;
  if (!(await store.hasChat(chat.id))) return;

  if (user && (await store.isBanned(user.id))) {
    await drop(chat.id, message.message_id);
    await safeBan(chat.id, user.id);
    await store.setBannedInfo(user.id, T.fullName(user), user.username || null);
    return;
  }

  const text = message.text || message.caption;
  if (!text) return;
  const words = await store.listWords();
  if (!words.length) return;
  const word = findWord(text, words);
  if (!word) return;
  await drop(chat.id, message.message_id);
  if (adminId == null || user == null) return;

  const key = norm(word);
  const hits = await store.bumpHit(user.id, key);
  if (hits >= HITS_LIMIT) {
    await store.clearHit(user.id, key);
    await store.addBannedUser(user.id, T.fullName(user), user.username || null);
    const res = await banEverywhere(user.id);
    await notifyAll(`${T.hit(chat, user, text)}\n\n${T.banResult(user.id, res, T.headAuto)}`);
    if (res.failed.length) await notifyAll(T.failures(user.id, res.failed));
    return;
  }

  const code = await store.createPending({
    kind: 'hit', userId: user.id, chatId: chat.id, phrase: word, expiresAt: 0,
    tname: T.fullName(user), tusername: user.username || null,
  });
  await askAll(code, T.hit(chat, user, text), hitRows(code));
}

export { handleCallback } from 'lib/callbacks';
export { handleChatMember, handleMyChatMember } from 'lib/membership';
