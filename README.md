# Group Ban Bot

**English** · [العربية](README.ar.md)

A Telegram bot that bans an account from every group and channel you moderate,
after one confirmation.

Add the bot to your chats as an admin, then ban someone once: reply to their
message, or send their account ID. The bot bans them in every chat it watches,
deletes what they post, and bans them again if they join. It also warns members,
deletes messages that match a phrase blacklist, and removes the join, leave and
pin notices that clutter a group.

It runs on Telegram's serverless platform, so there is no server to host. The
code is plain JavaScript and deploys with one command. The bot writes in
English, in small capitals.

## What it does

- Bans and unbans an account in every watched chat at once, including chats the
  account has not joined yet
- Warns members per group, and on the third warning asks whether to ban from that
  group or from every chat
- Keeps a phrase blacklist: a matching message is deleted, and the third repeat
  from the same person bans them
- Deletes service messages such as joins, leaves, title changes and pins
- Unpins the channel posts that Telegram pins in a linked discussion group
- Gives the owner extra admins who share the same powers, and a list of recent
  problems at `/errors`

[Read how it works](docs/how-it-works.md)

## Run your own

You need Node.js 22 or newer and a bot on Telegram's serverless platform:

```bash
git clone https://github.com/Zaky1m/telegram-group-ban-bot.git
cd telegram-group-ban-bot
npm install
npx tgcloud login        # link the bot
npx tgcloud push         # deploy
npx tgcloud migrate      # create the tables on the first deploy
```

Then send `/start` to the bot. The first account to do so becomes the owner, so
do it before you share the bot with anyone.
[Read the deployment guide](docs/deploy.md)

## Contributing

`npm test` runs the tests against a fake platform, with no account or network.
Read [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/SPEC.md](docs/SPEC.md) first.
Report security problems privately, as described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)

## References

- [Telegram serverless platform](https://core.telegram.org/bots/serverless)
- [Telegram Bot API](https://core.telegram.org/bots/api)
