import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { reset, called } from './fake/sdk.mjs';
import { handleMessage } from 'lib/bot';
import * as store from 'lib/store';

beforeEach(reset);

const start = (from) => ({
  message_id: 1,
  chat: { id: from.id, type: 'private' },
  from,
  text: '/start',
  entities: [{ type: 'bot_command', offset: 0, length: 6 }],
});

const alice = { id: 11, first_name: 'Alice' };
const bob = { id: 22, first_name: 'Bob' };

test('the first person to send /start becomes the owner', async () => {
  assert.equal(await store.getAdminId(), null);
  await handleMessage(start(alice));
  assert.equal(await store.getAdminId(), alice.id);
  assert.ok((await store.getAdminIds()).includes(alice.id));
});

test('a later /start from someone else does not take ownership', async () => {
  await handleMessage(start(alice));
  await handleMessage(start(bob));
  assert.equal(await store.getAdminId(), alice.id);
  assert.equal((await store.getAdminIds()).includes(bob.id), false);
});
test('the owner gets the command list for their own chat only', async () => {
  await handleMessage(start(alice));
  const scopes = called('setMyCommands').map((c) => c.scope);
  assert.deepEqual(scopes, [{ type: 'chat', chat_id: alice.id }]);
});
