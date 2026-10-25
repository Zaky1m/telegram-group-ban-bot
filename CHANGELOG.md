# Changelog

All notable changes are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.1.0]

### Added
- Ban an account from every watched chat after one confirmation: by replying with `/ban`, with `/wban` to also blacklist the replied text, or by sending an account ID in a private chat.
- Unban with `/unban` or from the confirmation shown when a banned ID is sent.
- Banned accounts that post are deleted and banned in that chat, and banned accounts that join are banned on arrival.
- Warnings with `/warn`: the third warning asks whether to ban from this group or from every chat.
- Phrase blacklist with `/w`, `/words` and `/rmword`. A matching message is deleted, and the third repeat from the same person bans them.
- Chat registration when the bot is made an admin with the right to ban members and delete messages, plus `/addchat` and `/rmchat`.
- Paged `/list` panel of banned accounts and watched chats.
- Deletion of service messages (joins, leaves, title and photo changes, pins, video chats and similar) in every chat where the bot can delete messages.
- Removal of the pin that Telegram puts on a channel post mirrored into a discussion group.
- Extra admins with `/addadmin` and `/rmadmin`, managed by the owner only.
- `/errors` for the owner: the last 20 problems, one row per problem and chat.
- Bot messages in English, shown in small capitals.
