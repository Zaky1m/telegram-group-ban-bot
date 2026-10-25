import { db } from 'sdk';
import { eq, and, gt, lte, asc, sql } from 'sdk/db';
import { bannedUsers, watchedChats, blacklistWords, settings, pending, wordHits, warns } from 'schema';

export function now() {
  return Math.floor(Date.now() / 1000);
}

export async function getSetting(key) {
  const row = await db.select().from(settings).where(eq(settings.key, key)).get();
  return row ? row.value : null;
}

export async function setSetting(key, value) {
  await db.insert(settings).values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } }).run();
}

export async function getAdminId() {
  const saved = await getSetting('admin_id');
  const id = saved == null ? NaN : Number(saved);
  return Number.isSafeInteger(id) ? id : null;
}

// The bot's own username comes from getMe once and is kept, so the code never hardcodes a deployment
export async function getBotUsername(fetchMe) {
  const saved = await getSetting('bot_username');
  if (saved) return saved;
  const me = await fetchMe();
  if (me && me.username) await setSetting('bot_username', me.username);
  return me && me.username ? me.username : null;
}

// ============================ Problems the owner can read with /errors ============================
const ERRORS_KEY = 'errors';
const ERRORS_MAX = 20;

export async function listErrors() {
  try {
    const rows = JSON.parse((await getSetting(ERRORS_KEY)) || '[]');
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

// One row per problem and chat: a repeat only bumps its counter, so a noisy chat cannot push out the rest
export async function logError(where, chatId, detail) {
  try {
    const rows = await listErrors();
    const key = `${where}:${chatId ?? ''}:${detail}`;
    const row = rows.find((r) => r.key === key) || { key, where, chatId: chatId ?? null, detail, count: 0 };
    row.count += 1;
    row.at = now();
    const next = [row, ...rows.filter((r) => r !== row && r.key !== key)].slice(0, ERRORS_MAX);
    await setSetting(ERRORS_KEY, JSON.stringify(next));
  } catch {}
}

export async function clearErrors() {
  await setSetting(ERRORS_KEY, '[]');
}

// Extra admins have exactly the owner's powers, except managing this list (see cmdAddadmin).
const EXTRA_ADMINS_KEY = 'extra_admins';

export async function listExtraAdmins() {
  try {
    const ids = JSON.parse((await getSetting(EXTRA_ADMINS_KEY)) || '[]');
    return Array.isArray(ids) ? ids.filter(Number.isSafeInteger) : [];
  } catch {
    return [];
  }
}

export async function addExtraAdmin(userId) {
  const ids = await listExtraAdmins();
  if (ids.includes(userId) || userId === (await getAdminId())) return false;
  await setSetting(EXTRA_ADMINS_KEY, JSON.stringify([...ids, userId]));
  return true;
}

export async function removeExtraAdmin(userId) {
  const ids = await listExtraAdmins();
  if (!ids.includes(userId)) return false;
  await setSetting(EXTRA_ADMINS_KEY, JSON.stringify(ids.filter((id) => id !== userId)));
  return true;
}

export async function getAdminIds() {
  const main = await getAdminId();
  if (main == null) return [];
  return [main, ...(await listExtraAdmins()).filter((id) => id !== main)];
}

// ============================ Banned accounts ============================
export async function addBannedUser(userId, name = null, username = null) {
  const rows = await db.insert(bannedUsers).values({ userId, name, username })
    .onConflictDoNothing({ target: bannedUsers.userId }).returning().run();
  if (!rows.length && (name || username)) await setBannedInfo(userId, name, username);
  return rows.length > 0;
}

export async function setBannedInfo(userId, name, username) {
  await db.update(bannedUsers).set({ name, username, checked: 1 })
    .where(eq(bannedUsers.userId, userId)).run();
}

export async function removeBannedUser(userId) {
  const rows = await db.delete(bannedUsers).where(eq(bannedUsers.userId, userId)).returning().run();
  return rows.length > 0;
}

export async function isBanned(userId) {
  const row = await db.select().from(bannedUsers).where(eq(bannedUsers.userId, userId)).get();
  return row != null;
}

export async function listBanned() {
  const rows = await db.select().from(bannedUsers).orderBy(asc(bannedUsers.userId)).all();
  return rows.map((r) => r.userId);
}

export async function listBannedRows() {
  return db.select().from(bannedUsers).orderBy(asc(bannedUsers.userId)).all();
}

// ============================ Chats ============================
export async function addChat(chatId, title, type) {
  await db.insert(watchedChats).values({ chatId, title, type })
    .onConflictDoUpdate({ target: watchedChats.chatId, set: { title, type } }).run();
}

export async function setChatLink(chatId, link) {
  await db.update(watchedChats).set({ link }).where(eq(watchedChats.chatId, chatId)).run();
}

export async function removeChat(chatId) {
  const rows = await db.delete(watchedChats).where(eq(watchedChats.chatId, chatId)).returning().run();
  return rows.length > 0;
}

export async function hasChat(chatId) {
  const row = await db.select().from(watchedChats).where(eq(watchedChats.chatId, chatId)).get();
  return row != null;
}

export async function listChats() {
  return db.select().from(watchedChats).orderBy(asc(watchedChats.title)).all();
}

// ============================ Blacklist ============================
export async function addWord(word) {
  word = String(word).trim();
  if (!word) return false;
  const rows = await db.insert(blacklistWords).values({ word })
    .onConflictDoNothing({ target: blacklistWords.word }).returning().run();
  return rows.length > 0;
}

export async function removeWord(word) {
  word = String(word).trim();
  const rows = await db.delete(blacklistWords).where(eq(blacklistWords.word, word)).returning().run();
  return rows.length > 0;
}

export async function listWords() {
  const rows = await db.select().from(blacklistWords).orderBy(asc(blacklistWords.word)).all();
  return rows.map((r) => r.word);
}

// ============================ Pending requests ============================
function newCode() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

export async function createPending(row) {
  const code = newCode();
  await db.insert(pending).values({
    code,
    kind: row.kind,
    userId: row.userId ?? null,
    chatId: row.chatId ?? null,
    askChatId: row.askChatId ?? null,
    askMsgId: row.askMsgId ?? null,
    cmdMsgId: row.cmdMsgId ?? null,
    targetMsgId: row.targetMsgId ?? null,
    phrase: row.phrase ?? null,
    tname: row.tname ?? null,
    tusername: row.tusername ?? null,
    peers: row.peers ?? null,
    expiresAt: row.expiresAt ?? 0,
  }).run();
  return code;
}

export async function setAskMessage(code, askChatId, askMsgId) {
  await db.update(pending).set({ askChatId, askMsgId }).where(eq(pending.code, code)).run();
}

export async function setPeers(code, peers) {
  await db.update(pending).set({ peers: JSON.stringify(peers) }).where(eq(pending.code, code)).run();
}

// The delete returns the row to the first caller only, so a repeated press or one from another admin cannot run twice
export async function claimPending(code) {
  const rows = await db.delete(pending).where(eq(pending.code, code)).returning().run();
  return rows[0];
}

export async function getPending(code) {
  return db.select().from(pending).where(eq(pending.code, code)).get();
}

export async function dropPending(code) {
  await db.delete(pending).where(eq(pending.code, code)).run();
}

export async function expiredPending() {
  return db.select().from(pending)
    .where(and(gt(pending.expiresAt, 0), lte(pending.expiresAt, now()))).all();
}

// ============================ Repeat counter ============================
export async function bumpHit(userId, key) {
  const id = `${userId}:${key}`;
  const row = await db.select().from(wordHits).where(eq(wordHits.id, id)).get();
  const hits = (row && row.hits ? row.hits : 0) + 1;
  await db.insert(wordHits).values({ id, hits })
    .onConflictDoUpdate({ target: wordHits.id, set: { hits } }).run();
  return hits;
}

export async function clearHit(userId, key) {
  await db.delete(wordHits).where(eq(wordHits.id, `${userId}:${key}`)).run();
}

// ============================ Warnings ============================
export const WARN_LIMIT = 3;

export async function bumpWarn(chatId, user, title) {
  const id = `${chatId}:${user.id}`;
  const row = await db.select().from(warns).where(eq(warns.id, id)).get();
  const count = Math.min((row && row.count ? row.count : 0) + 1, WARN_LIMIT);
  const info = { name: user.name, username: user.username || null, title };
  await db.insert(warns).values({ id, chatId, userId: user.id, count, ...info })
    .onConflictDoUpdate({ target: warns.id, set: { count, ...info } }).run();
  return count;
}

export async function listWarns(chatId = null) {
  const cond = chatId == null ? gt(warns.count, 0) : and(gt(warns.count, 0), eq(warns.chatId, chatId));
  return db.select().from(warns).where(cond).orderBy(asc(warns.title)).all();
}

export async function clearWarns(userId, chatId = null) {
  if (chatId == null) await db.delete(warns).where(eq(warns.userId, userId)).run();
  else await db.delete(warns).where(eq(warns.id, `${chatId}:${userId}`)).run();
}

export async function findKnownUser(username) {
  const u = String(username).toLowerCase();
  const w = await db.select().from(warns).where(sql`lower(${warns.username}) = ${u}`).get();
  if (w) return { id: w.userId, first_name: w.name || u, username: w.username };
  const b = await db.select().from(bannedUsers).where(sql`lower(${bannedUsers.username}) = ${u}`).get();
  return b ? { id: b.userId, first_name: b.name || u, username: b.username } : null;
}
