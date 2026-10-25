import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { reset, called, answer, failWhen } from './fake/sdk.mjs';
import { handleMessage, handleCallback, handleChatMember, handleMyChatMember } from 'lib/bot';
import * as store from 'lib/store';

const owner = { id: 11, first_name: 'Owner' };
const helper = { id: 22, first_name: 'Helper' };
const spammer = { id: 99, first_name: 'Spammer', username: 'spam_guy' };
const groupA = { id: -1001, type: 'supergroup', title: 'Group A' };
const groupB = { id: -1002, type: 'supergroup', title: 'Group B' };

const command = (from, chat, text, extra = {}) => ({
  message_id: 100,
  chat,
  from,
  text,
  entities: [{ type: 'bot_command', offset: 0, length: text.split(' ')[0].length }],
  ...extra,
});

const keyboard = () => (called('sendMessage').at(-1).reply_markup?.inline_keyboard ?? []).flat();
const data = (prefix) => keyboard().find((b) => b.callback_data.startsWith(`${prefix}:`)).callback_data;
const press = (from, callbackData) => handleCallback({
  id: 'q', from, data: callbackData, message: { chat: { id: from.id }, message_id: 5 },
});
const bansIn = (chatId, userId) => called('banChatMember').filter((c) => c.chat_id === chatId && c.user_id === userId).length;
const texts = () => called('sendMessage').map((c) => c.text).join('\n');

beforeEach(async () => {
  reset();
  await store.setSetting('admin_id', String(owner.id));
  await store.setSetting('bot_username', 'TestBot');
  await store.addChat(groupA.id, groupA.title, groupA.type);
  await store.addChat(groupB.id, groupB.title, groupB.type);
});

const replyBan = (text = '/ban') => command(owner, groupA, text, { reply_to_message: { message_id: 9, from: spammer, text: 'buy followers now' } });

test('/ban as a reply asks first, then bans everywhere when confirmed', async () => {
  await handleMessage(replyBan());
  assert.equal(called('banChatMember').length, 0);
  await press(owner, data('a'));
  assert.equal(bansIn(groupA.id, spammer.id), 1);
  assert.equal(bansIn(groupB.id, spammer.id), 1);
  assert.equal(await store.isBanned(spammer.id), true);
  assert.equal(called('editMessageText').length, 1);
});

test('declining the question bans nobody', async () => {
  await handleMessage(replyBan());
  await press(owner, data('c'));
  assert.equal(called('banChatMember').length, 0);
  assert.equal(await store.isBanned(spammer.id), false);
});

test('pressing the same button twice bans once', async () => {
  await handleMessage(replyBan());
  const confirm = data('a');
  await press(owner, confirm);
  await press(owner, confirm);
  assert.equal(bansIn(groupA.id, spammer.id), 1);
});

test('someone who is not an admin cannot press the buttons', async () => {
  await handleMessage(replyBan());
  await press({ id: 500, first_name: 'Nosy' }, data('a'));
  assert.equal(called('banChatMember').length, 0);
});

test('/ban is ignored for strangers, outside watched chats and without a reply', async () => {
  await handleMessage(command(helper, groupA, '/ban', { reply_to_message: { message_id: 9, from: spammer } }));
  await handleMessage(command(owner, { id: -777, type: 'supergroup' }, '/ban', { reply_to_message: { message_id: 9, from: spammer } }));
  await handleMessage(command(owner, groupA, '/ban'));
  assert.equal(called('sendMessage').length, 0);
});

test('/wban also saves the replied text to the blacklist', async () => {
  await handleMessage(replyBan('/wban'));
  await press(owner, data('a'));
  assert.deepEqual(await store.listWords(), ['buy followers now']);
  assert.equal(called('deleteMessage').some((c) => c.message_id === 9), true);
});

test('an extra admin can confirm a question the owner also received', async () => {
  await store.addExtraAdmin(helper.id);
  await handleMessage(replyBan());
  await press(helper, data('a'));
  assert.equal(bansIn(groupA.id, spammer.id), 1);
});

test('a ban that fails in one chat is reported privately', async () => {
  failWhen('banChatMember', (p) => (p.chat_id === groupB.id ? 'Forbidden: not enough rights' : false));
  await handleMessage(replyBan());
  await press(owner, data('a'));
  assert.equal(bansIn(groupA.id, spammer.id), 1);
  assert.match(texts(), /ᴛʜᴇ ʙᴀɴ ᴡᴀѕ ɴᴏᴛ ᴀᴘᴘʟɪᴇᴅ ᴇᴠᴇʀʏᴡʜᴇʀᴇ/);
});

const warnReply = () => command(owner, groupA, '/warn', { reply_to_message: { message_id: 9, from: spammer } });

test('/warn counts up and asks where to ban on the third warning', async () => {
  await handleMessage(warnReply());
  await handleMessage(warnReply());
  assert.equal(keyboard().length, 0);
  await handleMessage(warnReply());
  assert.deepEqual(keyboard().map((b) => b.callback_data[0]), ['g', 'a', 'c']);
});

test('banning from the warning chat only leaves the other chats alone', async () => {
  for (let i = 0; i < 3; i++) await handleMessage(warnReply());
  await press(owner, data('g'));
  assert.equal(bansIn(groupA.id, spammer.id), 1);
  assert.equal(bansIn(groupB.id, spammer.id), 0);
  assert.equal(await store.isBanned(spammer.id), false);
  assert.deepEqual(await store.listWarns(), []);
});

test('banning from everywhere after warnings clears them', async () => {
  for (let i = 0; i < 3; i++) await handleMessage(warnReply());
  await press(owner, data('a'));
  assert.equal(bansIn(groupB.id, spammer.id), 1);
  assert.deepEqual(await store.listWarns(), []);
});

test('/warn never targets bots or admins', async () => {
  await handleMessage(command(owner, groupA, '/warn', { reply_to_message: { message_id: 9, from: { id: 5, is_bot: true } } }));
  await handleMessage(command(owner, groupA, '/warn', { reply_to_message: { message_id: 9, from: owner } }));
  assert.deepEqual(await store.listWarns(), []);
});

test('/warn on its own lists the warned people', async () => {
  await handleMessage(warnReply());
  await handleMessage(command(owner, groupA, '/warn'));
  assert.match(texts(), /ᴡᴀʀɴᴇᴅ ᴘᴇᴏᴘʟᴇ/);
});

const post = (from, text, chat = groupA) => ({ message_id: 200, chat, from, text, date: 1 });

test('a blacklisted phrase is deleted and the owner is asked', async () => {
  await store.addWord('Free Followers');
  await handleMessage(post(spammer, 'get free-followers here'));
  assert.deepEqual(called('deleteMessage'), [{ chat_id: groupA.id, message_id: 200 }]);
  assert.deepEqual(keyboard().map((b) => b.callback_data[0]), ['a', 'c']);
});

test('the third repeat bans automatically', async () => {
  await store.addWord('free followers');
  for (let i = 0; i < 3; i++) await handleMessage(post(spammer, 'free followers'));
  assert.equal(await store.isBanned(spammer.id), true);
  assert.equal(bansIn(groupB.id, spammer.id), 1);
});

test('ignoring the question lets the repeat counter keep running', async () => {
  await store.addWord('free followers');
  await handleMessage(post(spammer, 'free followers'));
  await press(owner, data('c'));
  assert.equal(await store.isBanned(spammer.id), false);
});

test('confirming a phrase question bans the person and resets the counter', async () => {
  await store.addWord('free followers');
  await handleMessage(post(spammer, 'free followers'));
  await press(owner, data('a'));
  assert.equal(await store.isBanned(spammer.id), true);
});

test('messages in unwatched chats and from nobody are left alone', async () => {
  await store.addWord('free followers');
  await handleMessage(post(spammer, 'free followers', { id: -999, type: 'supergroup' }));
  assert.equal(called('deleteMessage').length, 0);
});

test('a banned account that posts is deleted and banned in that chat', async () => {
  await store.addBannedUser(spammer.id);
  await handleMessage(post(spammer, 'hello'));
  assert.deepEqual(called('deleteMessage'), [{ chat_id: groupA.id, message_id: 200 }]);
  assert.equal(bansIn(groupA.id, spammer.id), 1);
});

test('a banned account that joins is banned on arrival', async () => {
  await store.addBannedUser(spammer.id);
  await handleChatMember({ chat: groupA, new_chat_member: { status: 'member', user: spammer } });
  assert.equal(bansIn(groupA.id, spammer.id), 1);
});

test('a normal member joining is left alone', async () => {
  await handleChatMember({ chat: groupA, new_chat_member: { status: 'member', user: helper } });
  assert.equal(called('banChatMember').length, 0);
});

const adminRights = { status: 'administrator', can_restrict_members: true, can_delete_messages: true };
const groupC = { id: -1003, type: 'supergroup', title: 'Group C' };

test('being made admin with the right rights asks the owner to start watching', async () => {
  answer('getChat', () => ({ title: 'Group C', type: 'supergroup' }));
  await store.addBannedUser(spammer.id);
  await handleMyChatMember({ chat: groupC, new_chat_member: adminRights });
  await press(owner, data('a'));
  assert.equal(await store.hasChat(groupC.id), true);
  assert.equal(bansIn(groupC.id, spammer.id), 1);
});

test('declining leaves the new chat unwatched', async () => {
  await handleMyChatMember({ chat: groupC, new_chat_member: adminRights });
  await press(owner, data('c'));
  assert.equal(await store.hasChat(groupC.id), false);
});

test('without the needed rights the bot leaves and tells the owner', async () => {
  await handleMyChatMember({ chat: groupC, new_chat_member: { status: 'administrator', can_restrict_members: true } });
  assert.deepEqual(called('leaveChat'), [{ chat_id: groupC.id }]);
  assert.match(texts(), /ɪ ʟᴇꜰᴛ ᴛʜᴇ ᴄʜᴀᴛ/);
});

test('being removed from a watched chat stops watching it and tells the owner', async () => {
  await handleMyChatMember({ chat: groupA, new_chat_member: { status: 'kicked' } });
  assert.equal(await store.hasChat(groupA.id), false);
  assert.match(texts(), /ѕᴛᴏᴘᴘᴇᴅ ᴡᴀᴛᴄʜɪɴɢ/);
});

test('a channel direct messages chat is never watched', async () => {
  await handleMyChatMember({ chat: { ...groupC, is_direct_messages: true }, new_chat_member: adminRights });
  assert.equal(await store.hasChat(groupC.id), false);
  assert.equal(called('sendMessage').length, 0);
});

const idMessage = (text) => ({ message_id: 300, chat: { id: owner.id, type: 'private' }, from: owner, text });

test('sending an account ID to the bot asks to ban it', async () => {
  await handleMessage(idMessage('123456789'));
  await press(owner, data('a'));
  assert.equal(bansIn(groupA.id, 123456789), 1);
  assert.equal(await store.isBanned(123456789), true);
});

test('sending the ID of a banned account offers to unban it', async () => {
  await store.addBannedUser(1000099);
  await handleMessage(idMessage('1000099'));
  await press(owner, data('a'));
  assert.equal(await store.isBanned(1000099), false);
  assert.equal(called('unbanChatMember').length, 2);
});

test('a chat ID sent as an account ID is explained, not banned', async () => {
  await handleMessage(idMessage('-1001234567'));
  assert.equal(await store.isBanned(-1001234567), false);
  assert.match(texts(), /ɪѕ ᴀ ᴄʜᴀᴛ ɪᴅ/);
});

test('/unban removes the ban everywhere', async () => {
  await store.addBannedUser(spammer.id);
  await handleMessage(command(owner, { id: owner.id, type: 'private' }, `/unban ${spammer.id}`));
  assert.equal(await store.isBanned(spammer.id), false);
  assert.equal(called('unbanChatMember').length, 2);
});

test('/addchat and /rmchat manage the watch list by ID', async () => {
  const dm = { id: owner.id, type: 'private' };
  answer('getChat', () => ({ title: 'Group D', type: 'supergroup' }));
  await store.addBannedUser(spammer.id);
  await handleMessage(command(owner, dm, '/addchat -1004'));
  assert.equal(await store.hasChat(-1004), true);
  assert.equal(bansIn(-1004, spammer.id), 1);
  await handleMessage(command(owner, dm, '/rmchat -1004'));
  assert.equal(await store.hasChat(-1004), false);
});

test('/w, /words and /rmword manage the blacklist', async () => {
  const dm = { id: owner.id, type: 'private' };
  await handleMessage(command(owner, dm, '/w free followers'));
  await handleMessage(command(owner, dm, '/w free followers'));
  assert.deepEqual(await store.listWords(), ['free followers']);
  await handleMessage(command(owner, dm, '/words'));
  assert.match(texts(), /ʙʟᴀᴄᴋʟɪѕᴛ/);
  await handleMessage(command(owner, dm, '/rmword free followers'));
  assert.deepEqual(await store.listWords(), []);
});

test('/list shows the panel and its pages switch with the buttons', async () => {
  const dm = { id: owner.id, type: 'private' };
  await store.addBannedUser(spammer.id, 'Spammer', 'spam_guy');
  await handleMessage(command(owner, dm, '/list'));
  assert.deepEqual(keyboard().map((b) => b.callback_data), ['v:b:1', 'v:c:1']);
  await press(owner, 'v:b:1');
  assert.match(called('editMessageText').at(-1).text, /ʙᴀɴɴᴇᴅ ᴀᴄᴄᴏᴜɴᴛѕ/);
  await press(owner, 'v:c:1');
  assert.match(called('editMessageText').at(-1).text, /ᴡᴀᴛᴄʜᴇᴅ ᴄʜᴀᴛѕ/);
});

test('expired questions are closed with the next update', async () => {
  await handleMessage(replyBan());
  const code = data('a').split(':')[1];
  await store.setPeers(code, []);
  const { db } = await import('./fake/sdk.mjs');
  const { pending } = await import('schema');
  await db.update(pending).set({ expiresAt: 1 }).run();
  await handleMessage(post(helper, 'hi'));
  assert.equal(await store.getPending(code), undefined);
});
