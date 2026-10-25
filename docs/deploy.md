# Deployment

[العربية](deploy.ar.md) · [Back to the README](../README.md)

The bot runs on [Telegram's serverless platform](https://core.telegram.org/bots/serverless).
There is no server, Docker image or webhook address to set up. The platform
runs the modules and keeps the database.

## Before you start

You need:

- Node.js 22 or newer on the computer you deploy from
- A bot on Telegram's serverless platform. The platform's guide explains how to
  create one, and `tgcloud login` asks for the token that links this project to it

## Deploy

```bash
git clone https://github.com/Zaky1m/telegram-group-ban-bot.git
cd telegram-group-ban-bot
npm install
npx tgcloud login        # paste the token that links this project to your bot
npx tgcloud push         # uploads schema.js, lib/ and handlers/
npx tgcloud migrate      # creates the tables on the first deploy
```

`tgcloud login` keeps the token in `.tgcloud/`, which git ignores. To run the
commands from a script, set `TGCLOUD_TOKEN` instead (see `.env.example`).

## Claim the bot

Send `/start` to the bot right away. The first account to do so becomes the
owner, and until then anyone who finds the bot could claim it. Do this before
you share the bot's username or add it to a chat.

## Add chats

Add the bot to a group or channel as an admin with these rights:

- **Ban users** and **Delete messages**, which are required. Without them the
  bot leaves the chat
- **Pin messages**, which is optional and lets the bot unpin channel posts that
  Telegram pins in a discussion group

The bot sends the owner a message asking whether to watch the chat. Confirm it.

## Update

```bash
git pull
npm install
npm test
npx tgcloud status       # lists what differs from the last deployed version
npx tgcloud push
npx tgcloud migrate      # only when schema.js gained tables or columns
```

`push` goes to the live bot straight away, so run the tests first.

## Where things are stored

Everything the bot remembers is in the platform's database: the owner, extra
admins, banned accounts, watched chats, the blacklist, warnings, pending
questions, the problem list and the bot's own username. Nothing is kept on your
computer except the token in `.tgcloud/`.
