# Deployment

[العربية](deploy.ar.md) · [Back to the README](../README.md)

The bot runs on [Telegram's serverless platform](https://core.telegram.org/bots/serverless).
There is no server, Docker image or webhook address to set up. The platform
runs the modules and keeps the database.

## Before you start

You need:

- Node.js 22 or newer on the computer you deploy from
- A bot registered with [@BotFather](https://t.me/BotFather), with **Serverless**
  switched on: open your bot, then **Serverless**
- The bot's CLI access token: in @BotFather, your bot, **Serverless**, **CLI Access**,
  **Access token**. It looks like `app<id>:<secret>` and is not the bot's API token

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

## From a phone

Telegram's guide says the whole project is also available in @BotFather, under your
bot's **Serverless** section: you can create and edit handlers and the shared
library, test-run them, and edit and apply the database schema. Saving there deploys.

This project has about twenty modules, so typing them in by hand is slow. A
practical route from a phone is any environment with a terminal and Node.js 22, such
as a GitHub Codespace opened in the browser, where the steps above work unchanged.
The token still comes from @BotFather.

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
