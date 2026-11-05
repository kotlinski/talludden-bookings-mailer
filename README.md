# talludden-bookings-mailer

Google script mailing if a new booking is made for the talludden booking system.

## Configuration

Credentials and recipients are not stored in the code. The script reads them at runtime from **Script Properties** (see [config.js](config.js)).

1. Copy `secrets.example.json` to `secrets.local.json` and fill in the values. `secrets.local.json` is ignored by both git and clasp, so it is only a local reference.
2. In the Apps Script editor, open **Project Settings → Script Properties** and add each key with its value from `secrets.local.json`:

   | Key | Description |
   | --- | --- |
   | `USERNAME` | Login username for the booking site |
   | `PASSWORD` | Login password for the booking site |
   | `OWNER_RECIPIENT_EMAILS` | Comma-separated recipients of the full email (names and prices) |
   | `OTHER_RECIPIENT_EMAILS` | Comma-separated recipients of the limited email (first names only) |
   | `STUG_NAMN` | Name of the cabin, used in the subject and footer |
   | `OWNER_NAME` | Owner's name as it appears in bookings (always shown in full) |
   | `TEST_RECIPIENT_EMAILS` | Comma-separated recipients used by `test()` instead of the real lists |

3. Push the code with `npx clasp push` (see below).

Until all properties are set, `main()` logs a `Missing Script Property "<KEY>"` error and sends no email.

## Running locally

You can run the script on your machine with Node, much like pressing **Run** in the Apps Script editor:

```sh
yarn local          # runs test()
yarn local main     # runs main()
yarn local <name>   # runs any top-level function
```

[local/run.js](local/run.js) loads all `.js`/`.gs` files into one shared scope (like Apps Script does) and replaces the Google services:

| Apps Script | Locally |
| --- | --- |
| `Logger.log` | Printed to the terminal |
| Script Properties | Read from `secrets.local.json`; values the script writes (`upcomingBookings`) are stored in `local/.state.json` |
| User Properties | Stored in `local/.state.json` |
| `UrlFetchApp.fetch` | Real HTTP requests |
| `MailApp.sendEmail` | **Not sent** – saved as HTML in `local/outbox/` |

No push is needed, and nothing in Apps Script is changed. Open the files in `local/outbox/` in a browser to preview the emails. Delete `local/.state.json` to reset the "has anything changed" check. Both are ignored by git and clasp.

Node's date formatting can differ slightly from Apps Script's, e.g. `dec.` vs `dec`.

## Syncing with Apps Script (clasp)

The project uses [clasp](https://github.com/google/clasp) to sync local files with the Apps Script project.

```sh
yarn install          # installs clasp locally
npx clasp login       # authorize clasp with your Google account (once)
```

If `.clasp.json` is missing, connect the folder to the existing script:

```sh
npx clasp clone <scriptId>
```

Day-to-day commands:

```sh
npx clasp status      # list which files will be pushed
npx clasp push        # upload local files to Apps Script (overwrites the remote code)
npx clasp pull        # download the remote code (overwrites local files)
npx clasp open-script # open the project in the Apps Script editor
```

Only `appsscript.json` and the `.js`, `.gs` and `.html` files are pushed. Everything else, including `secrets.local.json`, is excluded by [.claspignore](.claspignore).

> **Note:** If you edit code in the online editor, run `npx clasp pull` before making local changes. Otherwise the next `push` overwrites the online edits.
