import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { reset, called, answer } from './fake/sdk.mjs';
import { handleMessage, handleMyChatMember } from 'lib/bot';
import * as store from 'lib/store';

const owner = { id: 11, first_name: 'Owner' };

const say = (text) => ({
  message_id: 1,
  chat: { id: owner.id, type: 'private' },
  from: owner,
  text,
  entities: [{ type: 'bot_command', offset: 0, length: text.split(' ')[0].length }],
});

beforeEach(async () => {
  reset();
  answer('getMe', () => ({ id: 1, username: 'MyOwnBot' }));
  await store.setSetting('admin_id', String(owner.id));
});

test('the bot username is read once from getMe and kept', async () => {
  assert.equal(await store.getBotUsername(async () => ({ username: 'A' })), 'A');
  assert.equal(await store.getBotUsername(async () => ({ username: 'B' })), 'A');
});

test('a command addressed to this bot works, to another bot is ignored', async () => {
  await handleMessage(say('/words@MyOwnBot'));
  assert.equal(called('sendMessage').length, 1);
  await handleMessage(say('/words@SomeoneElseBot'));
  assert.equal(called('sendMessage').length, 1);
});

test('the add-to-chat buttons use this bot\'s own username', async () => {
  await handleMyChatMember({
    chat: { id: -100123, type: 'supergroup', title: 'G' },
    new_chat_member: { status: 'member' },
  });
  const urls = called('sendMessage')[0].reply_markup.inline_keyboard[0].map((b) => b.url);
  assert.deepEqual(urls.map((u) => u.split('?')[0]), ['https://t.me/MyOwnBot', 'https://t.me/MyOwnBot']);
  assert.ok(urls[0].includes('startgroup=add'));
  assert.ok(urls[1].includes('startchannel=add'));
});
