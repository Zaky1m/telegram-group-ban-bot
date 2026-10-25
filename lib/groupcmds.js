// /ban and /warn, which are given inside a group
import { api } from 'sdk';
import * as store from 'lib/store';
import * as T from 'lib/text';
import { replyTo, btn, ICON } from 'lib/ui';
import { askRows } from 'lib/rows';
import { parseId } from 'lib/util';

const ASK_TTL = 300;        // seconds a group ban question stays answerable

// Works only as a reply, only in a watched chat and only for admins. Anything else is ignored without a reply
// The group never sees a reply when /ban is ignored, so the owner finds the reason in /errors
const ignored = (chat, reason) => store.logError('ban ignored', chat.id, reason);

export async function cmdBan(message, ids, withWord) {
  const chat = message.chat;
  if (chat.type !== 'group' && chat.type !== 'supergroup') return ignored(chat, 'The command only works in groups');
  if (!(await store.hasChat(chat.id))) return ignored(chat, 'This group is not on the watch list');

  const target = message.reply_to_message;
  if (!target) return ignored(chat, 'It must be a reply to the person\'s message');
  if (target.sender_chat) return ignored(chat, 'The replied message was sent on behalf of a channel or group');
  const tu = target.from;
  if (!tu) return ignored(chat, 'The replied message has no sender');
  if (tu.is_bot) return ignored(chat, 'Bots cannot be banned this way');
  if (ids.includes(tu.id)) return ignored(chat, 'Admins cannot ban each other');

  const raw = withWord ? String(target.text || target.caption || '').trim() : '';
  const phrase = raw || null;
  const code = await store.createPending({
    kind: phrase ? 'wban' : 'ban',
    userId: tu.id,
    chatId: chat.id,
    cmdMsgId: message.message_id,
    targetMsgId: target.message_id,
    phrase,
    tname: T.fullName(tu),
    tusername: tu.username || null,
    expiresAt: store.now() + ASK_TTL,
  });
  const sent = await replyTo(message, T.askBan(tu.id, phrase), askRows(code));
  await store.setAskMessage(code, chat.id, sent.message_id);
}

// ============================ /warn ============================
const warnRows = (code) => [
  [
    btn(T.BTN.banGroup, `g:${code}`, 'danger', ICON.go),
    btn(T.BTN.banAll, `a:${code}`, 'danger', ICON.go),
  ],
  [btn(T.BTN.ignore, `c:${code}`, 'primary', ICON.end)],
];

// The target is a reply, a mention, a username the bot knows, or an account ID
async function warnTarget(message, args, chat) {
  const reply = message.reply_to_message;
  if (reply) return reply.from && !reply.sender_chat ? reply.from : null;
  const mention = (message.entities || []).find((e) => e.type === 'text_mention' && e.user);
  if (mention) return mention.user;
  const arg = args[0] || '';
  const id = parseId(arg);
  if (id != null) {
    try {
      const m = await api.getChatMember({ chat_id: chat.id, user_id: id });
      if (m && m.user) return m.user;
    } catch {}
    return null;
  }
  const name = arg.replace(/^@/, '');
  if (!/^\w{4,}$/.test(name)) return null;
  try {
    const c = await api.getChat({ chat_id: `@${name}` });
    if (c && c.type === 'private') return { id: c.id, first_name: c.first_name, last_name: c.last_name, username: c.username };
  } catch {}
  return store.findKnownUser(name);
}

export async function cmdWarn(message, args, ids) {
  const chat = message.chat;
  const inGroup = chat.type === 'group' || chat.type === 'supergroup';

  if (!message.reply_to_message && !args.length) {
    const rows = await store.listWarns(inGroup ? chat.id : null);
    return replyTo(message, rows.length ? T.warnList(rows, !inGroup, store.WARN_LIMIT) : T.warnEmpty);
  }
  if (!inGroup) return replyTo(message, T.warnGroupOnly);
  if (!(await store.hasChat(chat.id))) return;

  const tu = await warnTarget(message, args, chat);
  if (!tu) return replyTo(message, T.warnNoUser);
  if (tu.is_bot || ids.includes(tu.id)) return;

  const user = { id: tu.id, name: T.fullName(tu), username: tu.username || null };
  const title = chat.title || String(chat.id);
  const count = await store.bumpWarn(chat.id, user, title);
  if (count < store.WARN_LIMIT) return replyTo(message, T.warned(title, user, count, store.WARN_LIMIT));

  const code = await store.createPending({
    kind: 'warn3',
    userId: user.id,
    chatId: chat.id,
    cmdMsgId: message.message_id,
    tname: user.name,
    tusername: user.username,
    expiresAt: store.now() + ASK_TTL,
  });
  const sent = await replyTo(message, T.warnLimit(title, user), warnRows(code));
  await store.setAskMessage(code, chat.id, sent.message_id);
}
