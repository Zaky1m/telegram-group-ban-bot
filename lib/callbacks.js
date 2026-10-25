// Handling of the inline buttons
import { api } from 'sdk';
import * as store from 'lib/store';
import * as T from 'lib/text';
import { norm } from 'lib/match';
import { drop } from 'lib/ui';
import { dropAsk, editAsk, notifyAll, sweep } from 'lib/admins';
import { applyListToChat, banEverywhere, getChatInfo, safeBan, unbanEverywhere } from 'lib/enforce';
import { lookupUser, showBans, showChats, showPanel } from 'lib/panel';

async function ack(query) {
  try {
    await api.answerCallbackQuery({ callback_query_id: query.id });
  } catch {}
}

async function runBan(p, adminId, head) {
  const added = await store.addBannedUser(p.userId, p.tname || null, p.tusername || null);
  const res = await banEverywhere(p.userId);
  if (!p.tname && !p.tusername) {
    const got = await lookupUser(p.userId);
    if (got) await store.setBannedInfo(p.userId, got.name, got.username);
  }
  let text = T.banResult(p.userId, res, head || (added ? T.headBanned : T.headBannedAgain));

  if (p.kind === 'wban' && p.phrase) {
    if (await store.addWord(p.phrase)) text += T.wordSaved(p.phrase);
    await drop(p.chatId, p.targetMsgId);
  }
  await editAsk(p, text);
  if (p.kind === 'warn3') await store.clearWarns(p.userId);

  if (res.failed.length) {
    await drop(p.askChatId, p.cmdMsgId);
    await notifyAll(T.failures(p.userId, res.failed));
  }
}

// Ban from the group where the warning happened only, without entering the global ban list
async function runBanHere(p) {
  const r = await safeBan(p.chatId, p.userId);
  await store.clearWarns(p.userId, p.chatId);
  if (r.status === 'banned' || r.status === 'preemptive') return editAsk(p, T.bannedHere(p.userId));
  const [title] = await getChatInfo(p.chatId);
  await editAsk(p, T.failures(p.userId, [{ title: title || String(p.chatId), status: r.status, detail: r.detail }]));
}

export async function handleCallback(query) {
  await sweep();
  const adminId = await store.getAdminId();
  if (!(await store.getAdminIds()).includes(query.from.id)) return;   // nobody else gets an answer

  const data = String(query.data || '');
  const nav = data.match(/^v:([bch]):(\d+)$/);
  if (nav) {
    await ack(query);
    if (!query.message) return;
    const chatId = query.message.chat.id;
    const msgId = query.message.message_id;
    const page = Number(nav[2]) || 1;
    if (nav[1] === 'b') return showBans(chatId, msgId, page);
    if (nav[1] === 'c') return showChats(chatId, msgId, page);
    return showPanel(chatId, msgId, null);
  }

  const m = data.match(/^([acg]):(.+)$/);
  if (!m) return ack(query);
  const [, act, code] = m;
  const p = await store.claimPending(code);
  await ack(query);
  if (!p) {
    if (query.message) await drop(query.message.chat.id, query.message.message_id);
    return;
  }

  if (act === 'c') {
    if (p.kind === 'chat') await editAsk(p, T.chatSkipped);
    else {
      await dropAsk(p);
      await drop(p.askChatId, p.cmdMsgId);
    }
    return;
  }

  if (act === 'g') {
    if (p.kind === 'warn3') await runBanHere(p);
    return;
  }

  if (p.kind === 'ban' || p.kind === 'wban' || p.kind === 'warn3') {
    await runBan(p, adminId);
  } else if (p.kind === 'hit') {
    await store.clearHit(p.userId, norm(p.phrase || ''));
    await runBan({ ...p, kind: 'ban' }, adminId);
  } else if (p.kind === 'unban') {
    await store.removeBannedUser(p.userId);
    const count = await unbanEverywhere(p.userId);
    await editAsk(p, T.unbanDone(p.userId, count));
  } else if (p.kind === 'chat') {
    let [title, ctype] = await getChatInfo(p.chatId);
    if (title == null) {
      title = String(p.chatId);
      ctype = 'unknown';
    }
    await store.addChat(p.chatId, title, ctype);
    const res = await applyListToChat({ chatId: p.chatId, title });
    await editAsk(p, T.watching(title, p.chatId, res));
    if (res.failed.length) await notifyAll(T.failures(null, res.failed));
  }
}
