# Unified AI Skills Report

## Installation

Shared skills are installed once under `.agents/skills/` for the shared project directory.

| Skill | Source | Path |
|---|---|---|
| Superpowers | `obra/superpowers` | `.agents/skills/superpowers` |
| Context Engineering | `muratcankoylan/Agent-Skills-for-Context-Engineering` | `.agents/skills/context-*`, `.agents/skills/filesystem-context`, `.agents/skills/memory-systems`, `.agents/skills/multi-agent-patterns` |
| Testing, audits | `khasky/awesome-agent-skills` | `.agents/skills/awesome-*` |
| Git checkpoint | `carthworks/ai-agent-skills` | `.agents/skills/git-vibe-checkpoint` |
| Session handoff | `hotalexnet/agent-checkpoint` | `.agents/skills/repo-checkpoint`, `.agents/skills/repo-resume` |

## Installed skills

- Superpowers: brainstorming, writing plans, TDD, systematic debugging, subagent-driven development, code review, verification, and related workflow skills.
- Context: context compression, optimization, degradation, filesystem context, memory systems, and multi-agent patterns.
- Audits: test writing, regression sweep, test gap, security, performance, dependency, and architecture audits.
- Git/session: safe checkpointing, diff inspection, rollback guidance, checkpoint, and resume.

Each installed skill contains `SKILL.md`. Ponytail and Caveman were not reinstalled or modified.

## Compatibility and activation

Skills use the Agent Skills `SKILL.md` format and are stored in the shared project directory. Codex reads project guidance from `AGENTS.md`; Antigravity reads `GEMINI.md`. Heavy workflows are selective, not automatic.

Use Brainstorming and Writing Plans for complex features, TDD for important logic, Systematic Debugging for difficult bugs, and review/verification for significant changes. Simple tasks work directly.

## Safety and token policy

Read only relevant files. Avoid duplicate tests, reviews, scans, and subagents. Preserve uncommitted changes. Inspect Git status before major work. Never commit, push, or perform destructive rollback without authorization.

## Update and uninstall

Update a source skill by reviewing its upstream changes first, then copying only the verified skill directory. Uninstall by removing only that skill directory after confirming it is not needed. Do not remove global Ponytail or Caveman.

## Notes

No gameplay source code was modified. Existing Git changes were preserved. Compatibility was checked by inspecting repository layout, valid `SKILL.md` files, and shared project paths; no agent-specific registration command was assumed.

## Follow-up installation: Graphify, UI/UX Pro Max, Impeccable

### Graphify — installed

- Repository: `Graphify-Labs/graphify`
- Method: official `uvx --from graphifyy graphify ... install --project`
- Codex: `.codex/skills/graphify/`, `.codex/hooks.json`, and Graphify section in `AGENTS.md`
- Antigravity: `.agents/skills/graphify/`, `.agents/rules/graphify.md`, `.agents/workflows/graphify.md`
- Strict enforcement was not enabled. No graph was built.

### UI/UX Pro Max — NOT INSTALLED

The official CLI requires `npx ui-ux-pro-max-cli init --ai ...`. This environment has Node and Python but no `npm` or `npx`. No global Node/npm installation was performed.

### Impeccable — NOT INSTALLED

The official project installer requires `npx impeccable install`. This environment has no `npx`, so installation stopped without a workaround or force overwrite.

### Verification status

- Graphify project-local files: verified present for Codex and Antigravity.
- UI/UX Pro Max: NOT VERIFIED / not installed.
- Impeccable: NOT VERIFIED / not installed.
- Existing application source was not modified.
- Existing global skills and configurations were not modified.
