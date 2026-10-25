import { table, integer, text, index } from 'sdk/db';

export const bannedUsers = table('banned_users', {
  userId:   integer('user_id').primaryKey(),
  name:     text('name'),
  username: text('username'),
  checked:  integer('checked').default(0),   // whether its details were already looked up
});

export const watchedChats = table('watched_chats', {
  chatId: integer('chat_id').primaryKey(),
  title:  text('title'),
  type:   text('type'),
  link:   text('link'),
});

export const blacklistWords = table('blacklist_words', {
  word: text('word').primaryKey(),
});

export const settings = table('settings', {
  key:   text('key').primaryKey(),
  value: text('value'),
});

// Every request waiting for a button press. The button carries only the code, the rest lives here
export const pending = table('pending', {
  code:        text('code').primaryKey(),
  kind:        text('kind').notNull(),      // ban | wban | hit | unban | chat
  userId:      integer('user_id'),          // the target
  chatId:      integer('chat_id'),          // the group the request came from
  askChatId:   integer('ask_chat_id'),      // the chat holding the question message
  askMsgId:    integer('ask_msg_id'),       // the question message
  cmdMsgId:    integer('cmd_msg_id'),       // the admin's command message
  targetMsgId: integer('target_msg_id'),    // the message that was replied to
  phrase:      text('phrase'),
  tname:       text('tname'),           // the target's name and username at request time
  tusername:   text('tusername'),
  peers:       text('peers'),           // the question messages at the other admins, as JSON
  expiresAt:   integer('expires_at'),       // 0 means no deadline
}, (t) => ({
  expiresIdx: index('idx_pending_expires').on(t.expiresAt),
}));

// Repeat counter of a phrase per person, for the automatic ban after 3
export const wordHits = table('word_hits', {
  id:   text('id').primaryKey(),            // user_id:normalized phrase
  hits: integer('hits').default(0),
});

// Member warnings, counted per group and reset when the person is banned
export const warns = table('warns', {
  id:       text('id').primaryKey(),        // chat_id:user_id
  chatId:   integer('chat_id').notNull(),
  userId:   integer('user_id').notNull(),
  count:    integer('count').default(0),
  name:     text('name'),
  username: text('username'),
  title:    text('title'),
}, (t) => ({
  chatIdx: index('idx_warns_chat').on(t.chatId),
}));
