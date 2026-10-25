// The /list panel with its banned accounts and watched chats pages
import { api } from 'sdk';
import * as store from 'lib/store';
import * as T from 'lib/text';
import { replyTo, edit } from 'lib/ui';
import { backRow, pageRows, panelRows } from 'lib/rows';

const PAGE = 10;            // rows per panel page

// getChat on a bare account ID only answers for someone the bot has already seen, so a user banned by ID
// is looked up in the chats themselves, where the ban left them as a removed member
export async function lookupUser(userId) {
  try {
    const u = await api.getChat({ chat_id: userId });
    if (u && u.first_name) return pick(u);
  } catch {}
  const chats = await store.listChats();
  for (const c of chats) {
    try {
      const m = await api.getChatMember({ chat_id: c.chatId, user_id: userId });
      if (m && m.user && m.user.first_name) return pick(m.user);
    } catch {}
  }
  return null;
}

function pick(u) {
  return {
    name: u.last_name ? `${u.first_name} ${u.last_name}` : u.first_name,
    username: u.username || null,
  };
}

async function fillNames(rows) {
  for (const r of rows) {
    if (r.checked || r.name || r.username) continue;
    const got = await lookupUser(r.userId);
    r.name = got ? got.name : null;
    r.username = got ? got.username : null;
    await store.setBannedInfo(r.userId, r.name, r.username);
  }
}

async function fillLinks(rows) {
  for (const c of rows) {
    if (c.link) continue;
    try {
      const chat = await api.getChat({ chat_id: c.chatId });
      let url = chat.username ? `https://t.me/${chat.username}` : chat.invite_link || null;
      if (!url) {
        try {
          const made = await api.createChatInviteLink({ chat_id: c.chatId, name: 'AutBan' });
          url = made.invite_link;
        } catch {}
      }
      if (url) {
        c.link = url;
        await store.setChatLink(c.chatId, url);
      }
    } catch {}
  }
}

export async function showPanel(chatId, msgId, message) {
  const [chats, bans] = await Promise.all([store.listChats(), store.listBanned()]);
  const text = T.panel(bans.length, chats.length);
  if (msgId) return edit(chatId, msgId, text, panelRows());
  return replyTo(message, text, panelRows());
}

export async function showBans(chatId, msgId, page) {
  const all = await store.listBannedRows();
  if (!all.length) return edit(chatId, msgId, T.panelEmptyBans, [backRow()]);
  const pages = Math.max(1, Math.ceil(all.length / PAGE));
  const at = Math.min(Math.max(1, page), pages);
  const slice = all.slice((at - 1) * PAGE, at * PAGE);
  await fillNames(slice);
  await edit(chatId, msgId, T.bansPage(slice, at, pages), pageRows('b', at, pages));
}

export async function showChats(chatId, msgId, page) {
  const all = await store.listChats();
  if (!all.length) return edit(chatId, msgId, T.panelEmptyChats, [backRow()]);
  const pages = Math.max(1, Math.ceil(all.length / PAGE));
  const at = Math.min(Math.max(1, page), pages);
  const slice = all.slice((at - 1) * PAGE, at * PAGE);
  await fillLinks(slice);
  await edit(chatId, msgId, T.chatsPage(slice, at, pages), pageRows('c', at, pages));
}
