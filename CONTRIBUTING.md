# Contributing

Thanks for helping. Please read `docs/SPEC.md` first: it is the source of truth
for the bot's behaviour, and changes to it need a discussion in an issue.

## Run the tests

```bash
npm install
npm test
```

The tests run the real modules in `lib/` against a fake `sdk` in
`tests/fake/` (an in-memory database and a recorder of Bot API calls), so they
need no network, no bot and no account. Add a test with every change in
behaviour.

## Rules

- Import modules by bare name, never by relative path or with an extension:
  `import { x } from 'lib/store'`. The platform resolves modules that way
- Only `schema.js`, `lib/` and `handlers/` are deployed. Handler files are named
  after Telegram update types and `handlers/` has no subfolders
- No npm packages at runtime. The only things a module can import are the
  platform `sdk` and the other modules of this project
- Comments are in English, short, and explain why rather than what
- User-facing text lives in `lib/text.js` as plain English. `lib/ui.js` turns it
  into small capitals when it sends
- State that must survive a restart goes in the database, never in a variable
- No tokens, account IDs, usernames or deployment details in code, tests, docs
  or commit messages

## Commits

Small commits with one reason each, in the imperative mood ("Delete service
notices in unwatched chats"). Run `npm test` before every commit.
