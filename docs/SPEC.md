# Specification

How the bot behaves. Change it only after discussing it in an issue. Numbers in
*(code)* are constants in the source.

## 1. Roles

- **Owner**: the first account that sends `/start` in a private chat. Stored in
  `settings.admin_id`. The owner has every power.
- **Extra admins**: added by the owner with `/addadmin <id>` and removed with
  `/rmadmin <id>`. They have the owner's powers except managing admins and
  reading `/errors`. Stored as a JSON list in `settings.extra_admins`.
- **Everyone else**: cannot run any command or press any button. In a private
  chat the bot answers anything they send with a short note that it is for admins
  only, and a blue button with an emoji that opens the source repository. In a
  group, a channel, for an edited message, for a bot, and before an owner exists,
  it stays silent.

Commands are registered with Telegram on the admins' own chats only. Every other
scope is cleared, so nobody else sees a command list.

## 2. Watched chats

- Adding the bot to a group, supergroup or channel as an admin with the rights
  to **ban members** and **delete messages** makes it ask every admin whether to
  start watching the chat. Confirming registers the chat and applies the whole
  ban list to it.
- With fewer rights the bot leaves the chat and tells the admins, with buttons
  to add it again with the right rights preset.
- A channel's direct-messages chat is never registered.
- If the bot is removed from a watched chat it stops watching it and tells the
  admins.
- `/addchat <id>` and `/rmchat <id>` do the same by chat ID.

## 3. Banning

- **By reply**: an admin replies `/ban` to a member's message in a watched
  group. The bot asks for confirmation in that group. `/wban` also adds the
  replied text to the blacklist. Bots, the bot's own admins and replies to messages sent
  on behalf of a channel are ignored without a reply, and the reason is kept for
  `/errors`.
- **By ID**: an admin sends an account ID (more than five digits) in a private
  chat. A chat ID, which is negative, is explained instead of banned. An ID that
  is already banned offers to unban.
- Confirming bans the account in every watched chat. An account that has not
  joined a chat is banned in advance. A chat where the ban fails (missing right,
  target is an admin, chat unavailable) is reported privately with the reason.
- A banned account that posts in a watched chat has the message deleted and is
  banned there. A banned account that joins is banned on arrival.
- `/unban <id>` or the unban confirmation unbans in every watched chat.
- Group questions expire after 5 minutes *(ASK_TTL)*. Questions asked in a
  private chat do not expire.

## 4. Warnings

- `/warn` as a reply, with an `@username` the bot knows, a mention, or the ID of a
  member. Only inside a watched group.
- Warnings are counted per group. The limit is 3 *(WARN_LIMIT)*.
- The third warning asks the admin to ban from **this group only** or from
  **every chat**. Either choice clears the person's warnings.
- `/warn` alone lists the warned people: of this group when sent in a group, of
  every group when sent in a private chat.

## 5. Blacklist

- `/w <phrase>` adds, `/rmword <phrase>` removes, `/words` lists.
- Matching ignores diacritics, tatweel, spacing, punctuation and case, and folds
  the Arabic alef, teh marbuta, yeh and hamza variants.
- A matching message in a watched chat is deleted and every admin is asked
  whether to ban the sender.
- Admins are exempt: the bot's owner and extra admins, the chat's own admins and
  creator, an anonymous admin posting as the group, a post mirrored from the
  linked channel, and any post in a channel. The chat's admin list is checked
  with `getChatMember` only when a phrase matches. If that lookup fails the
  sender is treated as a normal member.
- The same person repeating the same phrase 3 times *(HITS_LIMIT)*, counted across
  all watched chats, is banned without a question.

## 6. Service messages and pins

- Every service message (joins, leaves, title and photo changes, pins, video
  chats, topic changes, boosts and the like) is deleted in any group or channel
  where the bot can delete messages, watched or not. A giveaway is kept because
  it is content. Service messages in a private chat are left alone.
- A pin notice for a post that Telegram mirrored from a linked channel
  (`is_automatic_forward`) also unpins that post. A pin made by a person stays.
  Unpinning needs the **pin messages** right, which is not required of the bot;
  a failure goes to `/errors`.

## 7. Panel and problems

- `/list` shows the panel. Its two pages, banned accounts and watched chats, show
  10 rows per page *(PAGE)* and switch with buttons.
- `/errors` (owner only) lists the last 20 problems: a failed unpin, or why a
  `/ban` was ignored. One row per problem, chat and detail; a repeat raises its
  counter. `/errors clear` empties it.

## 8. Profile

The bot's short description (the "About" text on its profile) is
`Bans an account from every group you moderate. Open source: <repository URL>`,
in small capitals with the link untouched. It is written with
`setMyShortDescription` on the first update after it changes, and retried on the
next update if Telegram refuses. A failure goes to `/errors`.

## 9. Messages

- All text is English, shown in small capitals. Names, IDs, `/commands`,
  `@usernames`, links and HTML are not converted.
- Buttons are coloured and use premium emoji. If Telegram rejects them the same
  message is sent again without colour or emoji.

## 10. State

| Kind | Examples | Lifetime |
|---|---|---|
| Permanent | owner, extra admins, banned accounts, watched chats, blacklist, warnings, repeat counters, the problem list, the bot username | Until removed |
| Temporary | A request waiting for a button press (`pending`) | Group questions 5 minutes, private ones until answered |

A button carries only a short code. The request itself is in `pending` and is
deleted when claimed, so pressing twice, or two admins pressing, runs it once.
