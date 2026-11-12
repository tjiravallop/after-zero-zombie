# Playtest verification — 2026-11-12

Scope: player onboarding/copy, saves/downloads, Firebase accounts and private cloud saves, feedback/counters, and spoiler-free ending collection. These are targeted release checks, not a full narrative-content audit.

The initial-release checks below are historical. The owner follow-up dated 2026-11-13 supersedes the standalone-distribution policy and records the subsequent real Google-session confirmation.

| Check | Evidence/result |
| --- | --- |
| Production build | Passed; regenerated the standalone HTML from the current JavaScript/CSS/engine bundle |
| TypeScript | `tsc --noEmit` passed |
| Player logic | `test-player-services.ts` passed: hidden locked metadata, duplicate discoveries, Thai save compression round-trip, malformed/oversized payload rejection, idempotent life queue and bulk archive recovery |
| Firestore emulator | `test-player-backend.ts` passed: private ownership, revisions/conflicts, duplicate start/end rejection, achievements, immutable runs, invalid schema/counter writes, feedback ownership/cooldown |
| Fresh-player browser | `test-playtest-ui.ts` passed: 23 locked slots without titles, first-life guide, previews not counted, reload continuity, 390 px layout, corrupt-file feedback, valid ending import, ending collection after reload, storage failure warning, retained unsent feedback draft, standalone file opening |
| Account/cloud browser | `test-cloud-ui.ts` passed: Guest-to-new-Google link, Guest-to-existing-Google fallback, fresh browser restoring the same life/name, explicit conflict choice, former anonymous identity surviving reload, offline ending delivered once after a new life starts |
| Feedback browser | The same cloud UI check submitted a message through the form and verified the emulator document; optional diagnostics/save defaulted off, only version was included, and attachment was empty |
| Real backend | `test-live-backend.ts --live` passed against `after-zero-zombie-261112`: Anonymous sign-in, private cloud save write/read, denied other-owner read, accepted TEST feedback, unchanged global run/ending counters |
| Existing narrative/ending regressions | Earlier in this change: age dialogue pilot 14 test sets and ending presentation for 23 endings passed. Their source dialogue/effects were not changed by this work |
| Rules deployment | Real Firestore rules compilation, dry run, and deploy succeeded; Standard `(default)` database in Singapore confirmed |

## Defects corrected during verification

- Malformed save feedback was invisible in the hub because its status was rendered only in the journal.
- Existing Google accounts could report `auth/email-already-in-use` rather than `auth/credential-already-in-use`; both supported credential-bearing collision paths are handled.
- Offline endings depended on a ready cloud connection and could be lost when the next life started. Completion capture now runs independently and recovers known run IDs from the archive.
- An already-counted Guest run became stranded after signing into an existing Google account. The Firebase SDK retains that former anonymous identity separately, and the original run can finish without an extra start.
- Cloud/local conflict choice offered no way to back up the cloud copy. Both copies can now be downloaded before replacement.
- Imported player names did not update the title form or local profile. Both are restored and persisted.
- Player-facing errors exposed raw SDK/parser messages. Unknown errors now use Thai recovery instructions.
- Downloaded source/deploy standalone copies could diverge. Each build now regenerates both, and the UI test checks equality.

## Limits and remaining human check

Google UI tests used Firebase's isolated Authentication emulator. The real backend check used Anonymous authentication. An actual Google account must still complete OAuth in the published game; provider provisioning and emulator success are not a substitute for this check.

The independent reviewer identified the counter/backup issues above, which were fixed and exercised. Its turn ended at a usage limit before a final verdict, so this is not a completed independent security audit. Prototype rules still merit review before a broad public launch.

Windows intermittently locked different shared `lucide-react` dependency files during parallel builds (`os error 32`). A build with `$env:RAYON_NUM_THREADS='1'` succeeded. This is a local filesystem/build limitation; no game logic was changed to mask it. The CI uses Node 24 and a frozen pnpm lockfile.

`graphify update .` was attempted but the command is unavailable on this machine. No graph rebuild is claimed.

Counters identify Firebase accounts, not unique human beings, and do not prove honest gameplay. Guest browser resets can create new identities. Unknown imported runs do not create starts. Large-scale write contention on the aggregate document has not been load-tested.

No Google password, authorization code, CLI token, or service-account key was added to source or configuration. Public Web SDK configuration is intentionally committed.

## Owner follow-up — 2026-11-13

The owner rejected full-game download distribution and reported unclear Google sign-in feedback. The earlier standalone checks describe the initial release, not the updated distribution policy.

- Removed all three game-download entry points, their modal/handler, the committed standalone file and the export script/postbuild hook. Save JSON backup/import remains. CI now rejects the former game-package filenames in the deployment directory.
- Added a persistent explicit Google signed-in label, separate success confirmation and account name/email in the account panel. A successful credential result updates the displayed user directly; cloud-save status no longer has to double as sign-in feedback. Account changes are visibly disabled during uploads.
- The open real user session was inspected read-only. Its account panel had the Google logout control and an owned cloud-save conflict. This confirms a real Google session; no save choice or credentials were changed by the assistant.
- Before the fixes, the new no-distribution assertion failed and the explicit-sign-in-indicator assertion timed out. After the fixes, typecheck, build, fresh-player/no-distribution UI checks and the Google new/existing-account/cloud UI checks passed.
- The source repo is still Public. Preparing the separately requested Private + Firebase Hosting plan does not authorize or claim a visibility/hosting change. Browser-required game assets and previously obtained copies are a separate limitation.
