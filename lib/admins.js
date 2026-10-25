// Talking to the admins: notices, questions with buttons, the command list and expiry of old questions
import { api } from 'sdk';
import * as store from 'lib/store';
import * as T from 'lib/text';
import { small } from 'lib/smallcaps';
import { send, edit, drop } from 'lib/ui';

const CMD_VERSION = '6';    // bump to re-register the command list with Telegram

// Requests past their deadline are closed with the first update the bot receives
export async function sweep() {
  let rows = [];
  try {
    rows = await store.expiredPending();
  } catch {
    return;
  }
  for (const p of rows) {
    await dropAsk(p);
    await drop(p.askChatId, p.cmdMsgId);
    await store.dropPending(p.code);
  }
}

// Every admin has the same powers, so each notice goes to all of them and each question with buttons gets one message per admin
export async function notifyAll(text, rows = null) {
  for (const id of await store.getAdminIds()) {
    try {
      await send(id, text, rows);
    } catch {}
  }
}

export async function askAll(code, text, rows) {
  let first = true;
  const peers = [];
  for (const id of await store.getAdminIds()) {
    let sent;
    try {
      sent = await send(id, text, rows);
    } catch {
      continue;
    }
    if (first) {
      await store.setAskMessage(code, id, sent.message_id);
      first = false;
    } else {
      peers.push([id, sent.message_id]);
    }
  }
  if (peers.length) await store.setPeers(code, peers);
}

function peersOf(p) {
  try {
    return p.peers ? JSON.parse(p.peers) : [];
  } catch {
    return [];
  }
}

export async function dropAsk(p) {
  await drop(p.askChatId, p.askMsgId);
  for (const [chatId, msgId] of peersOf(p)) await drop(chatId, msgId);
}

export async function editAsk(p, text) {
  await edit(p.askChatId, p.askMsgId, text);
  for (const [chatId, msgId] of peersOf(p)) await edit(chatId, msgId, text);
}

const SMALL_COMMANDS = T.COMMANDS.map((c) => ({ ...c, description: small(c.description) }));

// The command list is registered for the admins' own chats only, nobody else sees any command
const CLEAR_SCOPES = [
  { type: 'default' },
  { type: 'all_private_chats' },
  { type: 'all_group_chats' },
  { type: 'all_chat_administrators' },
];

// The list is registered on the admins' own chats and every other scope is cleared,
// so no command shows up in groups or for anyone else
export async function ensureCommands(adminIds, force = false) {
  if (!force && (await store.getSetting('cmds')) === CMD_VERSION) return;
  let ok = false;
  for (const id of adminIds) {
    try {
      await api.setMyCommands({ commands: SMALL_COMMANDS, scope: { type: 'chat', chat_id: id } });
      ok = true;
    } catch {}
  }
  for (const scope of CLEAR_SCOPES) {
    try {
      await api.deleteMyCommands({ scope });
    } catch {}
  }
  if (ok) await store.setSetting('cmds', CMD_VERSION);
}
