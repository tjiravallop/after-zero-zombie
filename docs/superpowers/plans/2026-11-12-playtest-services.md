# AFTER ZERO playtest services implementation plan

> Execute inline using the existing worktree and preserve the animation changes already present.

The approved goal covers player-facing copy and onboarding, reliable local saves and downloads, Guest and Google authentication with cloud saves, server-backed feedback and counters, and a spoiler-free ending collection verified through the player interface.

## Architecture

Keep the GitHub Pages frontend. Firebase Authentication provides anonymous accounts and Google linking. Firestore stores private cloud saves and feedback and exposes aggregate statistics. Cloud operations require authenticated identities, server-enforced ownership, idempotent run IDs, and explicit conflict resolution. Local play remains available during network failure.

## Tasks

- [x] Clean developer-facing copy and download options. Add first-visit instructions and file-based save import.
- [x] Report local save success and failure. Preserve existing saves and export/import compatibility.
- [x] Build an ending collection from canonical reachable ending IDs and personal records. Locked entries reveal no names, descriptions, images, or requirements.
- [x] Configure Firebase and implement Guest, Google linking, account switching, and cloud save conflicts.
- [x] Implement feedback delivery with optional diagnostic consent and server-backed unique-player, run-start, and ending counters.
- [x] Verify Firestore ownership and counter rules, offline/retry behavior, existing saves, and new-player flows in Chrome.
- [ ] Verify the published frontend and have a real account complete Google OAuth. Automated Google flows use the emulator; real Anonymous/cloud-save/feedback connectivity has passed.

## Verification requirements

Exercise storage failure, malformed and old saves, repeated reloads, Google accounts with existing cloud saves, interrupted uploads, duplicate run events, locked ending accessibility text, and ending-gallery recovery after import. Preserve gameplay effects and conditions.

Firebase project `after-zero-zombie-261112`, Google/Anonymous providers, Standard Firestore in Singapore, and prototype rules have been provisioned. See `docs/playtest-services.md` for operations and `docs/playtest-verification-2026-11-12.md` for evidence and limitations. The publish step is a playtest candidate; a real Google account still needs to confirm OAuth on the published domain.
