// Banning and unbanning across the watched chats
import { api, BotApiError } from 'sdk';
import * as store from 'lib/store';

export async function safeBan(chatId, userId) {
  try {
    await api.banChatMember({ chat_id: chatId, user_id: userId });
    return { status: 'banned' };
  } catch (e) {
    if (!(e instanceof BotApiError)) return { status: 'network' };
    const msg = (e.description || '').toLowerCase();
    if (
      msg.includes('participant_id_invalid') || msg.includes('user not found') ||
      msg.includes('user_id_invalid') || msg.includes('peer_id_invalid') ||
      msg.includes('member_not_found')
    ) return { status: 'preemptive' };
    if (e.code === 403 || msg.includes('not enough rights') || msg.includes('need administrator')) {
      return { status: 'no_permission' };
    }
    if (msg.includes('is an administrator') || msg.includes('chat owner') || msg.includes('chat_admin_required')) {
      return { status: 'is_admin' };
    }
    if (msg.includes('chat not found')) return { status: 'chat_unavailable' };
    return { status: 'other', detail: e.description };
  }
}

function collect(out, chats, results) {
  results.forEach((r, i) => {
    if (r.status === 'banned') out.banned++;
    else if (r.status === 'preemptive') out.preemptive++;
    else out.failed.push({ title: chats[i].title || String(chats[i].chatId), status: r.status, detail: r.detail });
  });
}

export async function banEverywhere(userId) {
  const chats = await store.listChats();
  const out = { banned: 0, preemptive: 0, failed: [] };
  for (let i = 0; i < chats.length; i += 10) {
    const slice = chats.slice(i, i + 10);
    collect(out, slice, await Promise.all(slice.map((c) => safeBan(c.chatId, userId))));
  }
  return out;
}

export async function applyListToChat(chat) {
  const users = await store.listBanned();
  const out = { banned: 0, preemptive: 0, failed: [] };
  for (let i = 0; i < users.length; i += 10) {
    const slice = users.slice(i, i + 10);
    const results = await Promise.all(slice.map((uid) => safeBan(chat.chatId, uid)));
    collect(out, slice.map(() => chat), results);
  }
  return out;
}

export async function unbanEverywhere(userId) {
  const chats = await store.listChats();
  const results = await Promise.all(chats.map((c) =>
    api.unbanChatMember({ chat_id: c.chatId, user_id: userId, only_if_banned: true }).then(() => 1, () => 0)));
  return results.reduce((a, b) => a + b, 0);
}

// A channel's direct messages chat gets registered on its own when the bot is made admin there.
// It is neither a group nor a discussion, so there is nothing to watch in it.
export async function isDirect(chat) {
  if (chat.is_direct_messages) return true;
  try {
    const full = await api.getChat({ chat_id: chat.id });
    return Boolean(full.is_direct_messages);
  } catch {
    return false;
  }
}

export async function getChatInfo(chatId) {
  try {
    const chat = await api.getChat({ chat_id: chatId });
    return [chat.title || String(chatId), chat.type];
  } catch {
    return [null, null];
  }
}

// The blacklist never applies to admins: the bot's own, the chat's, and anything posted on behalf of the
// group or its linked channel, which only admins can do. A failed lookup counts as a normal member so a
// broken lookup cannot switch the blacklist off.
export async function isExempt(message) {
  const chat = message.chat;
  if (chat.type === 'channel' || message.is_automatic_forward) return true;
  if (message.sender_chat && message.sender_chat.id === chat.id) return true;
  const user = message.from;
  if (!user) return false;
  if ((await store.getAdminIds()).includes(user.id)) return true;
  try {
    const member = await api.getChatMember({ chat_id: chat.id, user_id: user.id });
    return member.status === 'creator' || member.status === 'administrator';
  } catch {
    return false;
  }
}
