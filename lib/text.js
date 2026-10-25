// Every user-facing string. Plain English: lib/ui.js turns static text into small caps when it sends.
// Dynamic values go through iso / mono / link so they stay untouched and keep their own text direction.
import { esc, iso, mono, link, emo } from 'lib/ui';

const RIGHTS = 'restrict_members+delete_messages';
export const addGroupUrl = (username) => `https://t.me/${username}?startgroup=add&admin=${RIGHTS}`;
export const addChannelUrl = (username) => `https://t.me/${username}?startchannel=add&admin=${RIGHTS}`;

export const BTN = {
  bans: 'Banned accounts',
  chats: 'Watched chats',
  prev: 'Previous',
  next: 'Next',
  back: 'Back',
  confirm: 'Confirm',
  refuse: 'Decline',
  ban: 'Ban',
  banGroup: 'This group only',
  banAll: 'All chats',
  ignore: 'Ignore',
  ok: 'OK',
  unban: 'Unban',
  addGroup: 'Add me to a group',
  addChannel: 'Add me to a channel',
};

export function welcome(name) {
  const hello = name ? `${emo('star')} <b>Welcome, ${iso(name)}</b>\nYou are now the bot owner\n\n` : '';
  return hello +
    `${emo('banned')} <b>Ban bot</b>\n` +
    'I ban anyone on your list from every group and channel where I am an admin\n\n' +
    `${emo('chats')} <b>Register a chat</b>\n` +
    'Add me and make me an admin with the right to ban members and delete messages, and I will send you an activation message\n\n' +
    `${emo('person')} <b>Ban someone</b>\n` +
    'Send me their account ID here and I will ask you to confirm\n' +
    'Or reply to their message in a group with /ban\n\n' +
    `${emo('panel')} <b>Commands</b>\n` +
    [...GROUP_COMMANDS, ...COMMANDS.filter((c) => c.command !== 'start')]
      .map((c) => `/${c.command} ${c.description}`).join('\n');
}

// Group commands are not registered anywhere, they are only explained in the welcome message
export const GROUP_COMMANDS = [
  { command: 'ban', description: 'Reply to someone to ban them' },
  { command: 'wban', description: 'Reply to ban them and add their message to the blacklist' },
];

// Only these are registered with Telegram, and only on the owner's chats
export const COMMANDS = [
  { command: 'start', description: 'How the bot works and its commands' },
  { command: 'list', description: 'Panel of watched chats and banned accounts' },
  { command: 'warn', description: 'Reply or give a username to warn someone, alone it lists warned people' },
  { command: 'unban', description: 'Account ID, removes it from the ban list' },
  { command: 'rmchat', description: 'Chat ID, stops watching it' },
  { command: 'addchat', description: 'Chat ID, starts watching it' },
  { command: 'w', description: 'A phrase, adds it to the blacklist' },
  { command: 'words', description: 'Show the blacklist' },
  { command: 'rmword', description: 'A phrase, removes it from the blacklist' },
  { command: 'addadmin', description: 'Account ID, adds an admin with your powers, owner only' },
  { command: 'rmadmin', description: 'Account ID, removes an admin, owner only' },
  { command: 'errors', description: 'Recent problems the bot ran into, add clear to empty it, owner only' },
];

export const denied = `${emo('alert')} <b>You are not allowed to do that</b>`;

export function panel(bans, chats) {
  return `${emo('panel')} <b>Bot panel</b>\n\n` +
    `You have ${iso(bans)} accounts on the ban list and ${iso(chats)} watched chats\n` +
    'Choose what you want to see below';
}

export const panelEmptyBans = 'The ban list is empty';
export const panelEmptyChats = 'No watched chats';

function pageHead(icon, title, page, pages) {
  let out = `${emo(icon)} <b>${title}</b>\n`;
  if (pages > 1) out += `\nPage ${iso(page)} of ${iso(pages)}\n`;
  return out;
}

export function bansPage(rows, page, pages) {
  const lines = rows.map((r) => {
    const name = link(`tg://user?id=${r.userId}`, r.name || 'User');
    const at = r.username ? `, ${iso('@' + r.username)}` : '';
    return `${name}${at}, ID ${mono(r.userId)}`;
  });
  return pageHead('banned', 'Banned accounts', page, pages) + '\n' + lines.join('\n');
}

export function chatsPage(rows, page, pages) {
  const lines = rows.map((c) => {
    const kind = c.type === 'channel' ? 'Channel' : 'Group';
    const title = c.link ? link(c.link, c.title || String(c.chatId)) : iso(c.title || c.chatId);
    return `${kind} ${title}, ID ${mono(c.chatId)}`;
  });
  return pageHead('chats', 'Watched chats', page, pages) + '\n' + lines.join('\n');
}

export const usageUnban = '<b>Usage</b>\n/unban account ID';
export const usageRmchat = '<b>Usage</b>\n/rmchat chat ID';
export const usageAddchat = '<b>Usage</b>\n/addchat chat ID';
export const usageWord = '<b>Usage</b>\n/w the phrase to ban';
export const usageRmword = '<b>Usage</b>\n/rmword the phrase to remove';
export const usageAddadmin = '<b>Usage</b>\n/addadmin account ID';
export const usageRmadmin = '<b>Usage</b>\n/rmadmin account ID';
export const badId = '<b>Invalid ID</b>';
export const ownerOnly = `${emo('alert')} <b>Only the bot owner can do that</b>`;

export function adminAdded(uid) {
  return `${emo('done')} <b>Admin added</b>\nAccount ${mono(uid)}\nThey now have your powers except managing admins`;
}

export function adminKnown(uid) {
  return `${mono(uid)} is already an admin or is the bot owner`;
}

export function adminRemoved(uid) {
  return `${emo('done')} <b>Admin removed</b>\nAccount ${mono(uid)}`;
}

export function adminNotListed(uid) {
  return `${mono(uid)} is not on the admin list`;
}

export const usageErrors = '<b>Usage</b>\n/errors to list, /errors clear to empty';
export const errorsEmpty = `${emo('done')} <b>No problems recorded</b>`;
export const errorsCleared = `${emo('done')} <b>Problem list emptied</b>`;

export function errorsList(rows) {
  const lines = rows.map((r) => {
    const when = new Date(r.at * 1000).toISOString().slice(0, 16).replace('T', ' ');
    // `where` is always one of our own labels, `detail` can be text from Telegram
    const chat = r.chatId == null ? '' : ` in ${mono(r.chatId)}`;
    return `${esc(r.where)}${chat}, ${iso(`${r.count}x`)}, ${iso(when)} UTC\n${iso(r.detail)}`;
  });
  return `${emo('alert')} <b>Recent problems</b>\n\n` + lines.join('\n\n');
}

export function notBanned(uid) {
  return `${mono(uid)} is not on the ban list`;
}

export function unbanDone(uid, count) {
  return `${emo('done')} <b>Unbanned</b>\nAccount ${mono(uid)}\nRestored in ${iso(count)} chats`;
}

export function chatRemoved(cid) {
  return `<b>Stopped watching</b> ${mono(cid)}`;
}

export function chatNotWatched(cid) {
  return `${mono(cid)} is not on the watch list`;
}

export const chatInfoFailed = '<i>I could not get the chat details, so I will add it by ID</i>';

export function chatAdded(title, cid, type, enforced) {
  return `${emo('done')} <b>Now watching</b>\n${iso(title)} (${mono(cid)} ${iso(type)})\n` +
         `The ban list was applied to ${iso(enforced)} accounts`;
}

export function wordAdded(w) {
  return `${emo('done')} <b>Added to the blacklist</b>\n${mono(w)}`;
}

export function wordExists(w) {
  return `${mono(w)} is already on the blacklist`;
}

export function wordsList(words) {
  return `${emo('banned')} <b>Blacklist</b>\n` + words.map((w) => mono(w)).join('\n');
}

export const wordsEmpty = `${emo('banned')} <b>The blacklist is empty</b>`;

export function wordRemoved(w) {
  return `${emo('done')} <b>Removed</b>\n${mono(w)}`;
}

export function wordMissing(w) {
  return `${mono(w)} is not on the blacklist`;
}

// ===================== Bans =====================
export function askBan(uid, phrase) {
  let out = `${emo('alert')} <b>Confirm ban</b>\nAccount ${mono(uid)}\nBan it from every known chat?`;
  if (phrase) out += `\n\nThis phrase will be added to the blacklist\n${mono(cut(phrase))}`;
  return out;
}

export function banResult(uid, res, head) {
  const lines = [`${emo('banned')} <b>${head}</b>`, `Account ${mono(uid)}`, `Banned in ${iso(res.banned)} chats`];
  if (res.preemptive) lines.push(`Will be banned on arrival in ${iso(res.preemptive)} chats`);
  if (res.failed.length) lines.push(`Could not ban in ${iso(res.failed.length)} chats, details sent privately`);
  return lines.join('\n');
}

export const headBanned = 'Banned';
export const headBannedAgain = 'Was already banned, the ban was applied again';
export const headAuto = 'Automatic ban after 3 repeats';

export function wordSaved(phrase) {
  return `\nThe phrase was added to the blacklist\n${mono(cut(phrase))}`;
}

export function alreadyBanned(uid) {
  return `${emo('banned')} <b>Already banned</b>\nAccount ${mono(uid)} is on the ban list`;
}

export function looksLikeChat(cid) {
  return `${emo('alert')} <b>${mono(cid)} is a chat ID, not an account</b>\n` +
         'To register a chat, add me to it and make me an admin, and I will send you an activation message\n' +
         'Or use /addchat with its ID';
}

// ===================== Warnings =====================
// The username when there is one, otherwise the name, never both
function whoOf(id, name, username) {
  return username ? iso('@' + username) : link(`tg://user?id=${id}`, name || 'User');
}

export function warned(chatTitle, user, n, limit) {
  return `${emo('alert')} <b>Warning</b>\n` +
    `Person ${whoOf(user.id, user.name, user.username)}\n` +
    `Account ${mono(user.id)}\n` +
    `Chat ${iso(chatTitle)}\n\n` +
    `Warned ${iso(`${n} of ${limit}`)}`;
}

export function warnLimit(chatTitle, user) {
  return `${emo('alert')} <b>Reached the third warning</b>\n` +
    `Person ${whoOf(user.id, user.name, user.username)}\n` +
    `Account ${mono(user.id)}\n` +
    `Chat ${iso(chatTitle)}\n\n` +
    'Where should I ban them from?';
}

export function bannedHere(uid) {
  return `${emo('banned')} <b>Banned</b>\nAccount ${mono(uid)}\nFrom this group`;
}

export function warnList(rows, withChat, limit) {
  const lines = rows.slice(0, 40).map((r) => {
    const where = withChat ? ` in ${iso(r.title || r.chatId)}` : '';
    return `${whoOf(r.userId, r.name, r.username)}, ID ${mono(r.userId)}, ${iso(`${r.count} of ${limit}`)}${where}`;
  });
  const more = rows.length > 40 ? `\n\nand ${iso(rows.length - 40)} more` : '';
  return `${emo('alert')} <b>Warned people</b>\n\n` + lines.join('\n') + more;
}

export const warnEmpty = `${emo('done')} <b>Nobody has warnings</b>`;
export const warnNoUser = '<b>Usage</b>\n/warn as a reply to the person\'s message, or /warn @username';
export const warnGroupOnly = 'Warnings are given inside the group by replying to the person\'s message';

// ===================== Errors =====================
const REASONS = {
  is_admin: 'The person is an admin in this chat so I cannot ban them',
  no_permission: 'I do not have the right to ban members here',
  chat_unavailable: 'The chat does not exist or I am not in it',
  network: 'The connection to Telegram dropped while banning',
};

export function failures(uid, failed) {
  const lines = [`${emo('alert')} <b>The ban was not applied everywhere</b>`];
  if (uid) lines.push(`Account ${mono(uid)}`);
  lines.push('');
  for (const f of failed) {
    const why = REASONS[f.status] || iso(f.detail || 'Unknown error');
    lines.push(`${iso(f.title)}\n${why}\n`);
  }
  return lines.join('\n').trimEnd();
}

// ===================== Blacklist =====================
export function hit(chat, user, phrase) {
  const who = link(`tg://user?id=${user.id}`, fullName(user));
  const at = user.username ? ` ${iso('@' + user.username)}` : '';
  return `${emo('alert')} <b>Blacklisted phrase</b>\n` +
    `Person ${who}${at}\n` +
    `Account ${mono(user.id)}\n` +
    `Chat ${iso(chat.title || chat.id)}\n\n` +
    `${mono(cut(phrase))}`;
}

export const hitClosed = '\n\n<b>Ignored</b>';

// ===================== Chats =====================
export function newChat(title, cid, type) {
  return `${emo('chats')} <b>I was added to a chat</b>\n` +
    `${iso(title)}\n` +
    `ID ${mono(cid)}\n` +
    `Type ${iso(type)}\n\n` +
    'Start watching it?';
}

export function watching(title, cid, res) {
  const lines = [`${emo('done')} <b>Now watching</b>`, `${iso(title)} (${mono(cid)})`];
  if (res) {
    lines.push(`The ban list was applied and I banned ${iso(res.banned)} accounts`);
    if (res.failed.length) lines.push(`It failed for ${iso(res.failed.length)}, details sent privately`);
  }
  return lines.join('\n');
}

export const chatSkipped = `${emo('broken')} <b>Cancelled</b>\nThis chat will not be watched`;

export function goneFromChat(title, cid) {
  return `${emo('broken')} <b>Stopped watching</b>\n${iso(title)} (${mono(cid)})\nBecause I am no longer in it`;
}

export function leftNoRights(title, cid) {
  return `${emo('broken')} <b>I left the chat</b>\n` +
    `${iso(title)} (${mono(cid)})\n\n` +
    'I cannot work unless I am an admin with the right to ban members and delete messages\n' +
    'Add me with the button and the rights will be preset';
}

export function fullName(user) {
  return user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name;
}

function cut(s) {
  const chars = Array.from(String(s));
  return chars.length > 400 ? chars.slice(0, 400).join('') : chars.join('');
}
