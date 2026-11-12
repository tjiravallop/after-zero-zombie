# AFTER ZERO playtest services

## Project and hosting

- Firebase project: `after-zero-zombie-261112` (AFTER ZERO).
- Web app: `1:952882770289:web:2c8bcb7b23451e8cf446d0`.
- Firestore: `(default)`, Standard edition, `asia-southeast1` (Singapore), free-tier database at creation.
- Anonymous and Google sign-in are enabled. Redirect configuration covers the Firebase handler, `tjiravallop.github.io`, and `localhost`.
- The frontend continues to use GitHub Pages. Firebase provisioning does not publish the changed game frontend.
- `public/firebase-config.json` contains public Web SDK configuration, not a service-account key. Never place CLI tokens, account credentials, or service-account JSON in this repository.

Console: https://console.firebase.google.com/project/after-zero-zombie-261112/overview

## Player behavior

Local gameplay and the existing save keys remain available without a network connection. The game reports local write failures and supports JSON backup/import. First-time players receive a short guide after confirming their character; character previews do not start or count a life.

Guest authentication is automatic when the online backend is available. Linking a new Google account keeps the Guest identity. Signing into a Google account that already exists offers a cloud/local choice when the saves differ. Both versions can be downloaded before choosing. The selection replaces the other version; histories are not silently merged.

Cloud saves use gzip, are limited to 900,000 base64 characters and 10 MiB before compression, and include the current character, world state, archive, echo IDs, and mutation milestones. Revision checks reject writes based on an older cloud revision. Unsent progress remains in the local save. Online reconnection or the account panel's retry button reads the current cloud revision again.

Logging out retains the local game. Players sharing a browser should understand that another person using that browser can continue the local life. The Google session is signed out; a former anonymous identity may be retained by the Firebase SDK solely to finish counting a Guest life carried into an existing Google account.

Standalone HTML is regenerated from each production build. Opening it using `file://` supports local play and JSON saves. Google Login, cloud saves, online feedback and global statistics require the hosted web game.

## Data and counters

| Path | Purpose | Client access |
| --- | --- | --- |
| `players/{uid}/cloud/current` | Compressed save, revision, server time | Owner only |
| `players/{uid}` | First counted-life timestamp | Owner read; constrained first creation |
| `players/{uid}/runs/{runId}` | Start and one final ending | Owner; counted with the aggregate transaction |
| `players/{uid}/endings/{endingId}` | Personal first discovery | Owner only |
| `statistics/global` | Accounts that started, lives started, lives completed | Authenticated aggregate read |
| `endingStatistics/{endingId}` | Accounts and lives that found that ending | Authenticated get; no list |
| `feedback/{id}` | Message and explicitly consented diagnostic/save attachments | Sender get; project administrators review in Console |
| `feedbackLimits/{uid}` | Last accepted submission | Owner; server-enforced 30-second interval |

"Players" counts Firebase identities that actually confirm a first life, not unique human beings. Guest storage resets and a separately existing Google account can represent the same person with different identities. A normal Guest-to-new-Google link preserves the identity. Lives and endings are idempotent by their owner/run ID. Imported unknown lives do not add new starts; known owned runs can continue after cloud restore. Offline endings are queued independently of cloud-save availability and recovered from the local archive.

These are playtest statistics, not a cheat-resistant leaderboard. The game executes in the browser. A shared aggregate document is suitable for the initial playtest; sustained write contention would require sharded counters or a server processor.

The ending collection derives discoveries from personal save records. Locked entries render only `???` and "ยังไม่ค้นพบ" and omit names, descriptions and requirements. Global ending totals are requested only for personally discovered entries.

Feedback diagnostics and save attachments default to off. Failed sends retain the text; a local draft survives reload when local storage is writable. Attachments can contain the player's chosen name and game history. Feedback is private to the sender and project administrators.

## Operations and verification

Use a Node/npm installation that provides `npx`; the Firebase plugin's MCP launcher depends on it. This machine initially lacked `npx`, so project provisioning used the installed Firebase CLI through pnpm instead. CLI login has been completed; installing the plugin alone does not log into Firebase.

```powershell
npx -y firebase-tools@latest deploy --only auth,firestore:rules --project after-zero-zombie-261112
pnpm build
pnpm exec tsc --noEmit
pnpm exec tsx scripts/test-player-services.ts
pnpm exec tsx scripts/test-playtest-ui.ts
```

Browser checks require Chrome (or `CHROME_PATH`) and a production preview at `127.0.0.1:4173`. The ordinary UI test intercepts backend configuration and never writes production statistics.

```powershell
npx -y firebase-tools@latest emulators:start --only auth,firestore --project demo-after-zero
pnpm exec tsx scripts/test-player-backend.ts
pnpm exec tsx scripts/test-cloud-ui.ts
```

The emulator needs Java 21. Local emulator configuration is accepted only on localhost/127.0.0.1 with a `demo-` project ID.

`scripts/test-live-backend.ts --live` deliberately creates a temporary anonymous identity, a private TEST connectivity save and a TEST feedback message. It verifies real ownership and delivery without creating any run/ending events. Do not run it as an ordinary unit test. The first successful live check produced feedback `OSzVBV0iBLz8rW2b42sk`.

Prototype Security Rules restrict saves and feedback to their owners, constrain schemas and require matching transaction proofs for counters. Emulator checks and a real rules compilation/deploy have run. Rules still require review before a broad public launch; these checks do not prove that no attack or quota issue is possible.

Release verification must distinguish emulator Google sign-in from an actual Google account completing OAuth on the published game domain. The latter needs a real browser/account confirmation after the frontend is available. Do not claim it was verified solely from provider provisioning or emulator tests.
