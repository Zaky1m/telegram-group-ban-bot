# Decisions

Short records of why things are the way they are. Newest at the bottom.

## 1. Telegram's serverless platform

Context: the bot only reacts to updates, needs a small database and no
long-running work.
Decision: plain JavaScript modules deployed with `tgcloud`, using the platform's
SQLite database and Bot API client.
Why: there is no server to host, patch or restart, and a deployment is one
command.

## 2. The first `/start` makes the owner

Context: the bot has no configuration at runtime, because modules cannot read
environment variables.
Decision: the first account to send `/start` becomes the owner, and that is
stored in the database.
Why: it needs no setup step. The cost is a short window after the first deploy
in which anyone who finds the bot could claim it. The deployment guide makes
`/start` the first thing to do, before the bot's username is shared.

## 3. Extra admins live in the database

Context: a second person needed the owner's powers, and an ID written in the
code cannot be published.
Decision: the owner manages the list with `/addadmin` and `/rmadmin`, stored as
JSON in `settings`. Only the owner can change it.
Why: no schema migration, the list survives deploys, and an extra admin cannot
hand out access or revoke the owner's.

## 4. Buttons hold a code, the database holds the request

Context: an inline button can be pressed twice, by several admins, or long after
the question.
Decision: `callback_data` is a short code. The request is a `pending` row that
is deleted when claimed, and the delete returns the row to the first caller only.
Why: repeated presses cannot run an action twice, and nothing is kept in memory
between updates.

## 5. Service messages are deleted everywhere

Context: join, leave and pin notices clutter groups.
Decision: delete them in every chat where the bot can, without checking that the
chat is watched, and ignore the error when it cannot.
Why: the owner asked for it in every group the bot is an admin of. A failed
delete costs one API call.

## 6. Only mirrored channel posts are unpinned

Context: Telegram pins a linked channel's post in its discussion group.
Decision: unpin when the pin notice's message has `is_automatic_forward`, and
leave other pins alone.
Why: people pin things on purpose. The pin right is not required of the bot,
because the bot leaves chats where a required right is missing and that would
remove it from working groups. The failure is recorded instead.
Trade-off: an admin who pins a mirrored post by hand has it unpinned too, since
the notice does not say who pinned it.

## 7. Small capitals at send time

Context: all bot text is English and is shown in small capitals.
Decision: the strings stay plain in `lib/text.js`, and `lib/ui.js` converts them
when sending. Names, IDs and links go through `iso`, `mono` and `link`, which
wrap them in Unicode isolates that the converter skips.
Why: the sources stay readable and searchable, and user data is never rewritten.

## 8. A problem list instead of tracing

Context: the first version kept a trace of recent commands, with chat and user
IDs, behind a hidden handler.
Decision: replace it with an owner-only `/errors` list of 20 rows, one per
problem and chat.
Why: the trace stored more than it needed and relied on an unrelated update
handler as a back door. The new list records only what the owner can act on.

## 9. The bot learns its own username

Context: the add-to-chat links and `/command@bot` parsing need the username.
Decision: read it with `getMe` once and keep it in `settings`.
Why: a clone needs no edit before it works.

## 10. Premium emoji ids are kept in the code

Context: buttons and headings use custom emoji.
Decision: their IDs are public sticker IDs, not secrets, so they stay in
`lib/ui.js` next to a plain emoji fallback.
Why: Telegram only renders them for bots that may use them. Other deployments
fall back to the plain emoji, and a rejected message is sent again without them.

## 11. Tests run against a fake `sdk`

Context: the platform runtime cannot be started locally.
Decision: `tests/loader.mjs` maps the bare module names to the project files and
to `tests/fake/`, which holds an in-memory database and a recorder of Bot API
calls.
Why: the real modules run in tests unchanged, with no account, network or bot.
