import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { reset, called, failWhen } from './fake/sdk.mjs';
import { handleMessage } from 'lib/bot';
import * as store from 'lib/store';
import * as T from 'lib/text';

const owner = { id: 11, first_name: 'Owner' };
const stranger = { id: 33, first_name: 'Stranger' };
const dm = (from) => ({ id: from.id, type: 'private' });

const say = (from, text, extra = {}) => ({
  message_id: 1,
  chat: dm(from),
  from,
  text,
  ...(text.startsWith('/') ? { entities: [{ type: 'bot_command', offset: 0, length: text.split(' ')[0].length }] } : {}),
  ...extra,
});

beforeEach(async () => {
  reset();
  await store.setSetting('admin_id', String(owner.id));
  await store.setSetting('bot_username', 'TestBot');
});

const notice = () => called('sendMessage').filter((c) => /ᴏɴʟʏ ꜰᴏʀ ᴀᴅᴍɪɴѕ/.test(c.text));

test('a stranger who sends /start is told the bot is for admins', async () => {
  await handleMessage(say(stranger, '/start'));
  assert.equal(notice().length, 1);
});

test('plain text, other commands and unknown commands get the same answer', async () => {
  await handleMessage(say(stranger, 'hello'));
  await handleMessage(say(stranger, '/ban'));
  await handleMessage(say(stranger, '/nothing'));
  assert.equal(notice().length, 3);
});

test('the answer carries one blue button with an emoji that opens the repository', async () => {
  await handleMessage(say(stranger, 'hello'));
  const rows = called('sendMessage')[0].reply_markup.inline_keyboard;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].length, 1);
  const [button] = rows[0];
  assert.equal(button.url, T.REPO_URL);
  assert.equal(button.style, 'primary');
  assert.ok(button.icon_custom_emoji_id);
  assert.equal(button.text, 'ʀᴜɴ ʏᴏᴜʀ ᴏᴡɴ ᴄᴏᴘʏ');
});

test('the answer is still sent when Telegram rejects the button style', async () => {
  failWhen('sendMessage', (p) => (JSON.stringify(p).includes('"style"') ? 'Bad Request: invalid button style' : false));
  await handleMessage(say(stranger, 'hello'));
  assert.equal(called('sendMessage').length, 2);
  assert.equal(called('sendMessage')[1].reply_markup.inline_keyboard[0][0].url, T.REPO_URL);
});

test('strangers get no answer in groups or channels', async () => {
  const group = { id: -1001, type: 'supergroup' };
  await handleMessage(say(stranger, '/ban', { chat: group }));
  await handleMessage(say(stranger, 'hello', { chat: group }));
  assert.equal(called('sendMessage').length, 0);
});

test('nothing is sent before an owner exists, except by claiming with /start', async () => {
  reset();
  await handleMessage(say(stranger, 'hello'));
  assert.equal(called('sendMessage').length, 0);
});

test('edited messages and bots are not answered', async () => {
  await handleMessage(say(stranger, 'hello', { edit_date: 5 }));
  await handleMessage(say({ id: 44, first_name: 'Bot', is_bot: true }, 'hello'));
  assert.equal(called('sendMessage').length, 0);
});

test('admins are not turned away', async () => {
  await handleMessage(say(owner, '/start'));
  assert.equal(notice().length, 0);
});

test('the profile description is written once and again only when it changes', async () => {
  await handleMessage(say(stranger, 'hello'));
  await handleMessage(say(stranger, 'hello'));
  const writes = called('setMyShortDescription');
  assert.equal(writes.length, 1);
  assert.ok(writes[0].short_description.length <= 120);
  assert.ok(writes[0].short_description.endsWith(T.REPO_URL));
  await store.setSetting('about', 'an older text');
  await handleMessage(say(stranger, 'hello'));
  assert.equal(called('setMyShortDescription').length, 2);
});

test('a failed profile update is recorded and retried on the next update', async () => {
  failWhen('setMyShortDescription', () => 'Too Many Requests: retry later');
  await handleMessage(say(stranger, 'hello'));
  const [row] = await store.listErrors();
  assert.equal(row.where, 'profile update failed');
  assert.equal(called('sendMessage').length, 1);
  await handleMessage(say(stranger, 'hello'));
  assert.equal(called('setMyShortDescription').length, 2);
});
