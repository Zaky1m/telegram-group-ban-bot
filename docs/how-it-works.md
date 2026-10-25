# How it works

[العربية](how-it-works.ar.md) · [Back to the README](../README.md)

## Roles

The first account that sends `/start` to the bot in a private chat becomes the
owner. The owner can add extra admins with `/addadmin <account id>` and remove
them with `/rmadmin <account id>`. An extra admin can do everything the owner
can except manage admins and read `/errors`. Anyone else who writes to the bot
privately is told that it is for admins and gets a button to this repository. The
buttons do nothing for them.

## Putting a chat under watch

Add the bot to a group or channel and make it an admin with the rights to ban
members and delete messages. It asks every admin whether to start watching that
chat. After you confirm, the whole ban list is applied to the chat.

If the bot is made an admin without those two rights, it leaves and tells the
admins, with buttons that add it again with the rights preset. `/addchat <chat id>`
and `/rmchat <chat id>` register or drop a chat by its ID.

## Banning

There are two ways to start a ban:

- In a watched group, reply to the person's message with `/ban`. `/wban` does the
  same and also adds the replied text to the blacklist
- In a private chat with the bot, send the account ID

The bot asks you to confirm. After you do, the account is banned in every
watched chat. If the account is not a member of a chat yet, it is banned there
in advance. A chat where the ban cannot be applied is listed in a private message
with the reason, such as the person being an admin or the bot missing a right.

From then on, a banned account that posts is deleted and banned in that chat, and
a banned account that joins is banned again on arrival.

`/unban <account id>` lifts the ban everywhere. Sending the ID of a banned
account offers the same.

Questions asked in a group expire after 5 minutes. Questions asked in a private
chat stay until you answer them.

## Warnings

Reply to a message with `/warn`, or give an `@username` or an account ID. Each
group counts its own warnings. On the third one the bot asks whether to ban the
person from this group only or from every chat. `/warn` on its own lists the
warned people.

## Blacklist

`/w <phrase>` adds a phrase, `/words` shows the list and `/rmword <phrase>`
removes one. A message containing a phrase is deleted whatever the letter case,
spacing, punctuation or Arabic diacritics. The admins are asked whether to ban
the sender, and the third repeat of the same phrase bans the person without a
question.

The blacklist never applies to admins: the owner and extra admins of the bot, the
admins and creator of the chat, and posts made on behalf of the group or its
linked channel.

## Cleaning up

In every group or channel where the bot is allowed to delete messages, it deletes
service messages: joins, leaves, title and photo changes, pins, video chats and
similar. It does not need the chat to be watched.

When a linked channel's post is mirrored into its discussion group, Telegram pins
it. The bot unpins it and leaves the post in place. This needs the **pin
messages** right. A pin made by a person is left alone.

## Panel and problems

`/list` opens a panel with two pages: the banned accounts and the watched chats.
`/errors`, for the owner, shows the last problems the bot ran into, such as a
failed unpin or the reason a `/ban` was ignored. `/errors clear` empties it.

## Language

The bot writes in English, in small capitals.
