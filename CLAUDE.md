# CLAUDE.md

Guidance for AI agents and contributors working on this repository.

## What this is

A Telegram moderation bot written in JavaScript for Telegram's serverless
platform (`tgcloud`). It bans an account from every watched chat, warns
members, deletes blacklisted phrases and clears service messages. There is no
server: the platform runs the modules and provides the database.

## Read before you change anything

1. `docs/SPEC.md`: behaviour of the bot. This is the source of truth.
2. `docs/DECISIONS.md`: why things are the way they are. Append to it when you
   make a non-obvious choice.
3. `CLAUDE.local.md`, if present: notes for one specific deployment. It is
   never committed.

## Commands

```bash
npm install
npm test                    # unit tests against the fake sdk in tests/fake
npx tgcloud status          # local changes against the last known cloud state (offline)
npx tgcloud push            # deploys to the live bot, so ask first
```

## Platform rules

- Import by bare module name, never a relative path or a file extension.
- Only `schema.js`, `lib/` and `handlers/` are deployed. `handlers/` is flat and
  its file names are Telegram update types.
- No filesystem and no npm packages at runtime, only the platform `sdk`.
- Never read or edit `.tgcloud/`. It holds credentials and machine state.
- `tgcloud push` changes the live bot. Do not run it without being asked.

## Code rules

- Comments are English, short, and say why, not what.
- Name things by domain meaning, never `utils`, `helper`, or `manager`.
- User-facing text is plain English in `lib/text.js`. Wrap anything dynamic in
  `iso`, `mono` or `link` so small capitals leave it alone.
- Buttons carry only a code in `callback_data`. The details live in the
  database and are claimed atomically, so a repeated press runs once.
- Temporary waiting states expire. Accounts, chats, bans, warnings and the
  blacklist are permanent.
- Webhooks only. Never poll.
- No secrets, account IDs or usernames in code, tests, fixtures, docs or
  commit messages.

## Commits

Small commits, one reason each, imperative mood. Run the tests before every
commit.
