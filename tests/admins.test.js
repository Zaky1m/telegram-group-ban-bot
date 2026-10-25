import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { reset, called } from './fake/sdk.mjs';
import { handleMessage } from 'lib/bot';
import * as store from 'lib/store';

const owner = { id: 11, first_name: 'Owner' };
const helper = { id: 22, first_name: 'Helper' };
const stranger = { id: 33, first_name: 'Stranger' };

const say = (from, text) => ({
  message_id: 1,
  chat: { id: from.id, type: 'private' },
  from,
  text,
  entities: [{ type: 'bot_command', offset: 0, length: text.split(' ')[0].length }],
});

const lastText = () => called('sendMessage').at(-1).text;

beforeEach(async () => {
  reset();
  await store.setSetting('admin_id', String(owner.id));
});

test('with no extra admins only the owner is an admin', async () => {
  assert.deepEqual(await store.getAdminIds(), [owner.id]);
});

test('the owner adds an extra admin, who then gets the same powers', async () => {
  await handleMessage(say(owner, `/addadmin ${helper.id}`));
  assert.deepEqual(await store.getAdminIds(), [owner.id, helper.id]);
  await handleMessage(say(helper, '/words'));
  assert.match(lastText(), /./);
  assert.equal(called('sendMessage').at(-1).chat_id, helper.id);
});

test('registers the command list for the new admin', async () => {
  await handleMessage(say(owner, `/addadmin ${helper.id}`));
  const scopes = called('setMyCommands').map((c) => c.scope.chat_id);
  assert.ok(scopes.includes(helper.id));
});

test('adding the same admin or the owner twice changes nothing', async () => {
  await handleMessage(say(owner, `/addadmin ${helper.id}`));
  await handleMessage(say(owner, `/addadmin ${helper.id}`));
  await handleMessage(say(owner, `/addadmin ${owner.id}`));
  assert.deepEqual(await store.getAdminIds(), [owner.id, helper.id]);
});

test('the owner removes an extra admin and their command list', async () => {
  await handleMessage(say(owner, `/addadmin ${helper.id}`));
  await handleMessage(say(owner, `/rmadmin ${helper.id}`));
  assert.deepEqual(await store.getAdminIds(), [owner.id]);
  assert.deepEqual(called('deleteMyCommands').filter((c) => c.scope.type === 'chat'), [
    { scope: { type: 'chat', chat_id: helper.id } },
  ]);
});

test('an extra admin cannot add or remove admins', async () => {
  await handleMessage(say(owner, `/addadmin ${helper.id}`));
  await handleMessage(say(helper, `/addadmin ${stranger.id}`));
  await handleMessage(say(helper, `/rmadmin ${owner.id}`));
  assert.deepEqual(await store.getAdminIds(), [owner.id, helper.id]);
});

test('a stranger cannot add themselves and is only pointed to the source', async () => {
  await handleMessage(say(stranger, `/addadmin ${stranger.id}`));
  assert.deepEqual(await store.getAdminIds(), [owner.id]);
  assert.equal(called('sendMessage').length, 1);
  assert.match(lastText(), /ᴏɴʟʏ ꜰᴏʀ ᴀᴅᴍɪɴѕ/);
});

test('rejects missing, non numeric and negative ids', async () => {
  await handleMessage(say(owner, '/addadmin'));
  await handleMessage(say(owner, '/addadmin abc'));
  await handleMessage(say(owner, '/addadmin -100123'));
  assert.deepEqual(await store.getAdminIds(), [owner.id]);
  assert.equal(called('sendMessage').length, 3);
});

test('removing someone who is not an admin changes nothing', async () => {
  await handleMessage(say(owner, `/rmadmin ${stranger.id}`));
  assert.deepEqual(await store.getAdminIds(), [owner.id]);
});

test('a corrupted admin list is treated as empty', async () => {
  await store.setSetting('extra_admins', '{not json');
  assert.deepEqual(await store.getAdminIds(), [owner.id]);
});
