# How this is put together

## Why the app is one file, and the source is not

`TwilightBooks.html` ships as a single self-contained file. That is deliberate:
the helper serves it straight from a folder, it also opens from disk with no
server at all, and an update is then one file to replace rather than a set that
has to stay consistent with each other.

But one file is a poor place to work. So the source is modular and the
deliverable is not: `node build/build.mjs` joins `src/` back into one scope and
writes `TwilightBooks.html`.

The import lines in `src/` only ever described which module a name comes from.
Once built, every module shares one scope, exactly as the original single file
did — so the build strips the imports and concatenates in a fixed order. It
refuses to build if two modules declare the same name, because that would
silently shadow rather than fail.

**`TwilightBooks.html` is generated. Never edit it by hand** — edit `src/` and
build. A test fails if the committed file is not what `src/` builds.

## The layers

```
src/util/     money, dates, cloning          - knows nothing about anything else
src/core/     the money: stock, cost of goods, electricity, payroll,
              partners, suppliers, settlement, the checks
src/store/    where the books live: this browser, the folder, the change log
src/ui/       screens, printing, what a click does
src/boot.js   wiring, and the first render
```

Dependencies only point downwards. `core/` never reaches into `store/` or `ui/`,
which is what lets the tests load the whole of `core/` in Node with no browser
anywhere. If that rule is broken the tests stop being able to run, which is a
good enough alarm.

`state.js` holds `S`, the one mutable object the books live in. Modules read it
directly rather than being handed it, which is how the original worked and keeps
the diff from the single-file version honest.

## Tests

```
node --test        # or: npm test
```

No dependencies — `node:test` and `node:assert` only, same as the app itself
depends on nothing.

`test/books.mjs` is a small invented set of books. Every figure in it exists so
that some test can check one thing, and the expected answers are worked out by
hand in the tests rather than captured from the app, so a test can disagree with
the code rather than merely describe it. **No real books are in this repository.**

`test/ui.test.mjs` checks the screen without a browser: what the helpers build,
and what the stylesheet promises. One of those tests walks every class written in
`src/ui/` and fails if the stylesheet has no rule for it — which is how a rename
or a deleted block gets caught rather than discovered weeks later on a screen
nobody looked at. Others hold the design to its own rules: no all-caps labels, no
shadows, a dark value for every colour, and the till-roll rules left intact.

`test/regressions.test.mjs` is one test per fault these books have actually
suffered — electricity that was paid but still asked for, a payment that cleared
the wrong month, a pot driven below zero, a day that landed in yesterday because
of the timezone. Each name says what went wrong. A failure there is a known
problem coming back.

## Adding something

1. Edit the module in `src/` that owns it. New file? Add it to
   `build/modules.json` — the build fails if a file under `src/` is not listed.
2. `npm test`
3. `npm run build`
4. Commit both the source and the rebuilt `TwilightBooks.html`.
5. Bump `version.json` so the running copies pick it up.
