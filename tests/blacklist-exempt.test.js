import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { reset, called, answer, failWhen } from './fake/sdk.mjs';
import { handleMessage } from 'lib/bot';
import * as store from 'lib/store';

const owner = { id: 11, first_name: 'Owner' };
const helper = { id: 22, first_name: 'Helper' };
const moderator = { id: 33, first_name: 'Mod' };
const member = { id: 44, first_name: 'Member' };
const group = { id: -1001, type: 'supergroup', title: 'G' };

const post = (from, extra = {}, chat = group) => ({ message_id: 200, chat, from, text: 'free followers here', date: 1, ...extra });

beforeEach(async () => {
  reset();
  await store.setSetting('admin_id', String(owner.id));
  await store.addExtraAdmin(helper.id);
  await store.addChat(group.id, group.title, group.type);
  await store.addWord('free followers');
  answer('getChatMember', ({ user_id }) => ({ status: user_id === moderator.id ? 'administrator' : 'member' }));
});

const untouched = () => {
  assert.equal(called('deleteMessage').length, 0);
  assert.equal(called('sendMessage').length, 0);
};

test('the owner and extra admins can post a blacklisted phrase', async () => {
  await handleMessage(post(owner));
  await handleMessage(post(helper));
  untouched();
});

test('a chat administrator can post a blacklisted phrase', async () => {
  await handleMessage(post(moderator));
  untouched();
});

test('the chat creator can post a blacklisted phrase', async () => {
  answer('getChatMember', () => ({ status: 'creator' }));
  await handleMessage(post(member));
  untouched();
});

test('an anonymous admin posting as the group is exempt', async () => {
  await handleMessage(post({ id: 1087968824, first_name: 'Group' }, { sender_chat: { id: group.id, type: 'supergroup' } }));
  untouched();
});

test('a post mirrored from the linked channel is exempt', async () => {
  await handleMessage(post({ id: 777000, first_name: 'Telegram' }, { is_automatic_forward: true, sender_chat: { id: -1009, type: 'channel' } }));
  untouched();
});

test('a post in a watched channel is exempt', async () => {
  const channel = { id: -1005, type: 'channel', title: 'C' };
  await store.addChat(channel.id, channel.title, channel.type);
  await handleMessage(post(null, {}, channel), { isChannelPost: true });
  untouched();
});

test('an admin repeating the phrase is never banned', async () => {
  for (let i = 0; i < 5; i++) await handleMessage(post(moderator));
  assert.equal(called('banChatMember').length, 0);
  assert.equal(await store.isBanned(moderator.id), false);
});

test('a regular member is still deleted and the admins are asked', async () => {
  await handleMessage(post(member));
  assert.deepEqual(called('deleteMessage'), [{ chat_id: group.id, message_id: 200 }]);
  assert.ok(called('sendMessage').length >= 1);
});

test('a failed admin lookup does not switch the blacklist off', async () => {
  failWhen('getChatMember', () => 'Bad Request: chat not found');
  await handleMessage(post(member));
  assert.equal(called('deleteMessage').length, 1);
});

test('the lookup only happens when a phrase matches', async () => {
  await handleMessage(post(member, { text: 'hello there' }));
  assert.equal(called('getChatMember').length, 0);
});
