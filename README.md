# Twilight Books

A small, self-contained bookkeeping app for a cash business — one HTML file, plus a
helper that keeps the books in a folder and serves them to your own devices.

It was built for a hookah lounge that closes out its till every night, so it is
shaped around that: enter the day's takings and what went out, count the cash,
and let it work out the rest.

## What it does

- **Tonight** — the closing-up screen: today's sales, what went out, count the cash
- **Cashbook** — every entry, searchable and editable
- **Cash & counts** — what the books say each pot holds against what you counted
- **Stock & suppliers** — stock counts, purchases, and what each supplier is owed
- **Settlement** — month end: what is still to pay, and each partner's share
- **Dashboard** — the month at a glance, where the money went, and a list of checks
  that look for things that do not add up

Accrual where it matters (rent, salaries and electricity are charged to the month
they belong to, not the month they are paid), cash where it matters, and every
figure rounded to a note you can actually hand over.

## Running it

Put every file in one folder and double-click **Start Twilight.bat**.

A small window opens and says *Twilight is running*. Leave it open while you work —
it is what saves. The app opens in its own window.

The books live in `twilight-books.json` in that folder, with a dated copy written
once a day. They are not inside any browser, so every device reads and writes the
same file.

Requires Windows with PowerShell 5.1 (built in) and Chrome or Edge.

### From another device

The helper answers on `http://<this-computer>:8787/`. It only accepts this
computer and addresses on your own [Tailscale](https://tailscale.com) network —
nothing is exposed to the open internet, and that is deliberate.

## Updating

The helper checks this repository every time it starts, and there is a
**Check for updates** button in Setup.

**Before it applies anything, it copies your books to
`twilight-books-before-<version>.json`.** If that copy cannot be made, the update
does not happen at all. That is the guarantee worth having, because it holds
whatever goes wrong — a wrong file list, a bad build, a mistake by whoever
published it. The books as they were are still sitting in the folder.

Two further guards, narrower than they look:

- An update replaces only files named in `version.json` **and** present on the
  helper's own `$UpdatableFiles` list, so naming a books file here cannot reach
  one on somebody's machine.
- The downloaded app is rejected unless it carries the right marker and is a
  plausible size, and everything is fetched and checked before any local file is
  touched. What gets replaced is kept in a `previous-version` folder.

Neither of those protects against bad code being published. `TwilightHelper.ps1`
is itself on the updatable list, so an update can replace the file holding the
list; and the app can already write to the books through `/save`, because that is
how saving works. Running an auto-updater means trusting whoever can push here —
that is true of all of them. The snapshot is what makes the trust recoverable.

To turn updating off, set `$CheckForUpdates = $false` near the top of
`TwilightHelper.ps1`.

## Working on it

```
npm test            # 43 tests, no dependencies
npm run build       # rebuilds TwilightBooks.html from src/
```

`TwilightBooks.html` is **generated**. Edit `src/` and build — see
[ARCHITECTURE.md](ARCHITECTURE.md) for how the source is laid out and why the
deliverable is still one file.

## Your data is not here

This repository holds the program only. There are no books in it, and
`.gitignore` is set up so a books file cannot be committed by accident.

## Licence

MIT
