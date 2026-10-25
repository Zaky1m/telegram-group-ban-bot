// Commands sent to the bot in a private chat
import { api } from 'sdk';
import * as store from 'lib/store';
import * as T from 'lib/text';
import { replyTo } from 'lib/ui';
import { ensureCommands } from 'lib/admins';
import { applyListToChat, getChatInfo, unbanEverywhere } from 'lib/enforce';
import { showPanel } from 'lib/panel';
import { sourceRows } from 'lib/rows';
import { parseId } from 'lib/util';

export async function cmdStart(message, user, adminId) {
  if (message.chat.type !== 'private') return;
  if (adminId == null) {
    await store.setSetting('admin_id', String(user.id));
    await ensureCommands(await store.getAdminIds(), true);
    await replyTo(message, T.welcome(T.fullName(user)));
  } else if ((await store.getAdminIds()).includes(user.id)) {
    await ensureCommands(await store.getAdminIds(), true);
    await replyTo(message, T.welcome(null));
  } else {
    await turnAway(message, user, adminId);
  }
}

// Anyone who is not an admin gets a pointer to the source in a private chat, and nothing in a group.
// Before an owner exists there is nothing to turn people away from, and edits would only repeat the answer.
export async function turnAway(message, user, adminId) {
  if (message.chat.type !== 'private' || adminId == null || !user || user.is_bot || message.edit_date) return;
  await replyTo(message, T.adminsOnly, sourceRows());
}

async function cmdList(message) {
  await showPanel(message.chat.id, null, message);
}

async function cmdUnban(message, args) {
  if (!args.length) return replyTo(message, T.usageUnban);
  const uid = parseId(args[0]);
  if (uid == null) return replyTo(message, T.badId);
  if (!(await store.removeBannedUser(uid))) return replyTo(message, T.notBanned(uid));
  const count = await unbanEverywhere(uid);
  await replyTo(message, T.unbanDone(uid, count));
}

// Managing admins and reading the problem list are the owner's alone, so an extra admin cannot widen access.
async function isOwner(message) {
  return message.from.id === (await store.getAdminId());
}

async function cmdAddadmin(message, args) {
  if (!(await isOwner(message))) return replyTo(message, T.ownerOnly);
  if (!args.length) return replyTo(message, T.usageAddadmin);
  const uid = parseId(args[0]);
  if (uid == null || uid <= 0) return replyTo(message, T.badId);
  if (!(await store.addExtraAdmin(uid))) return replyTo(message, T.adminKnown(uid));
  await ensureCommands(await store.getAdminIds(), true);
  await replyTo(message, T.adminAdded(uid));
}

async function cmdRmadmin(message, args) {
  if (!(await isOwner(message))) return replyTo(message, T.ownerOnly);
  if (!args.length) return replyTo(message, T.usageRmadmin);
  const uid = parseId(args[0]);
  if (uid == null || uid <= 0) return replyTo(message, T.badId);
  if (!(await store.removeExtraAdmin(uid))) return replyTo(message, T.adminNotListed(uid));
  try {
    await api.deleteMyCommands({ scope: { type: 'chat', chat_id: uid } });
  } catch {}
  await replyTo(message, T.adminRemoved(uid));
}

async function cmdErrors(message, args) {
  if (!(await isOwner(message))) return replyTo(message, T.ownerOnly);
  if (args[0] === 'clear') {
    await store.clearErrors();
    return replyTo(message, T.errorsCleared);
  }
  if (args.length) return replyTo(message, T.usageErrors);
  const rows = await store.listErrors();
  await replyTo(message, rows.length ? T.errorsList(rows) : T.errorsEmpty);
}

async function cmdRmchat(message, args) {
  if (!args.length) return replyTo(message, T.usageRmchat);
  const cid = parseId(args[0]);
  if (cid == null) return replyTo(message, T.badId);
  if (await store.removeChat(cid)) await replyTo(message, T.chatRemoved(cid));
  else await replyTo(message, T.chatNotWatched(cid));
}

async function cmdAddchat(message, args) {
  if (!args.length) return replyTo(message, T.usageAddchat);
  const cid = parseId(args[0]);
  if (cid == null) return replyTo(message, T.badId);
  let [title, ctype] = await getChatInfo(cid);
  if (title == null) {
    title = String(cid);
    ctype = 'unknown';
    await replyTo(message, T.chatInfoFailed);
  }
  await store.addChat(cid, title, ctype);
  const res = await applyListToChat({ chatId: cid, title });
  await replyTo(message, T.chatAdded(title, cid, ctype, res.banned + res.preemptive));
}

function phraseArg(message) {
  const m = (message.text || '').match(/^\S+\s+([\s\S]+)$/);
  return m ? m[1].trim() : '';
}

async function cmdW(message) {
  const phrase = phraseArg(message);
  if (!phrase) return replyTo(message, T.usageWord);
  if (await store.addWord(phrase)) await replyTo(message, T.wordAdded(phrase));
  else await replyTo(message, T.wordExists(phrase));
}

async function cmdWords(message) {
  const words = await store.listWords();
  if (!words.length) return replyTo(message, T.wordsEmpty);
  await replyTo(message, T.wordsList(words));
}

async function cmdRmword(message) {
  const phrase = phraseArg(message);
  if (!phrase) return replyTo(message, T.usageRmword);
  if (await store.removeWord(phrase)) await replyTo(message, T.wordRemoved(phrase));
  else await replyTo(message, T.wordMissing(phrase));
}

export const ADMIN_COMMANDS = {
  list: cmdList,
  unban: cmdUnban,
  rmchat: cmdRmchat,
  addchat: cmdAddchat,
  w: cmdW,
  words: cmdWords,
  rmword: cmdRmword,
  addadmin: cmdAddadmin,
  rmadmin: cmdRmadmin,
  errors: cmdErrors,
};
