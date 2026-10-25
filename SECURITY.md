# Security policy

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub: open the **Security**
tab of this repository and choose **Report a vulnerability**. Do not open a
public issue for a security problem.

Include what you found, how to reproduce it, and the impact you expect. You
should get a first answer within a few days.

## Scope

In scope: the code in this repository, that is the message, button and
membership handling, the owner and admin checks, and how the bot stores state
in its database. The Telegram Bot API and Telegram's serverless platform
belong to Telegram.

## Known limitation: who becomes the owner

The first account that sends `/start` to a freshly deployed bot becomes its
owner. Until that happens, anyone who finds the bot can claim it and then
control bans in every chat the bot is added to. Send `/start` yourself right
after the first deploy, before you share the bot's username or add it to any
chat. The reasoning is in [docs/DECISIONS.md](docs/DECISIONS.md).

## Supported versions

Only the latest release receives security fixes.
