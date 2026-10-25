import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { reset, called, failWhen } from './fake/sdk.mjs';
import { handleMessage } from 'lib/bot';
import * as store from 'lib/store';

const owner = { id: 11, first_name: 'Owner' };
const helper = { id: 22, first_name: 'Helper' };
const group = { id: -100123, type: 'supergroup' };

const say = (from, text, chat = { id: from.id, type: 'private' }, extra = {}) => ({
  message_id: 1,
  chat,
  from,
  text,
  entities: [{ type: 'bot_command', offset: 0, length: text.split(' ')[0].length }],
  ...extra,
});

const lastText = () => called('sendMessage').at(-1).text;

beforeEach(async () => {
  reset();
  await store.setSetting('admin_id', String(owner.id));
  await store.setSetting('bot_username', 'TestBot');
  await store.addExtraAdmin(helper.id);
});

test('repeats of one problem only bump its counter', async () => {
  await store.logError('unpin failed', group.id, 'no rights');
  await store.logError('unpin failed', group.id, 'no rights');
  const rows = await store.listErrors();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].count, 2);
});

test('keeps the 20 newest problems', async () => {
  for (let i = 0; i < 25; i++) await store.logError('x', i, 'boom');
  const rows = await store.listErrors();
  assert.equal(rows.length, 20);
  assert.equal(rows[0].chatId, 24);
});

test('a failed unpin is recorded for the owner to read', async () => {
  failWhen('unpinChatMessage', () => 'not enough rights to manage pinned messages');
  await handleMessage({
    message_id: 50, chat: group, from: { id: 777000 },
    pinned_message: { message_id: 40, is_automatic_forward: true },
  });
  const [row] = await store.listErrors();
  assert.equal(row.where, 'unpin failed');
  assert.equal(row.chatId, group.id);
  assert.match(row.detail, /pinned/);
});

test('/ban that cannot run is recorded instead of failing silently', async () => {
  await store.addChat(group.id, 'G', 'supergroup');
  await handleMessage(say(owner, '/ban', group));
  const [row] = await store.listErrors();
  assert.equal(row.where, 'ban ignored');
  assert.match(row.detail, /reply/);
  assert.equal(called('sendMessage').length, 0);
});

test('/errors lists problems, and clear empties the list', async () => {
  await handleMessage(say(owner, '/errors'));
  assert.match(lastText(), /ɴᴏ ᴘʀᴏʙʟᴇᴍѕ/);
  await store.logError('unpin failed', group.id, 'no rights');
  await handleMessage(say(owner, '/errors'));
  assert.match(lastText(), /ᴜɴᴘɪɴ ꜰᴀɪʟᴇᴅ/);
  await handleMessage(say(owner, '/errors clear'));
  assert.deepEqual(await store.listErrors(), []);
});

test('only the owner can read or clear the list', async () => {
  await store.logError('x', 1, 'boom');
  await handleMessage(say(helper, '/errors'));
  await handleMessage(say(helper, '/errors clear'));
  assert.equal((await store.listErrors()).length, 1);
  assert.equal(called('sendMessage').length, 2);
});

test('a corrupted list reads as empty', async () => {
  await store.setSetting('errors', 'nope');
  assert.deepEqual(await store.listErrors(), []);
});
