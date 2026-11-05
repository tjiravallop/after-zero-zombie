# Graph Report - after-zero-zombie-main  (2026-11-05)

## Corpus Check
- 57 files · ~1,003,019 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 19 file(s) not represented in the graph (top: .exe 9, (none) 4, .bat 2)

## Summary
- 685 nodes · 1221 edges · 67 communities (41 shown, 26 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 78 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- App.tsx
- test-batch2-continuation-events.ts
- characterPool.ts
- externalEventsPack.ts
- after-zero-bundle.js
- deploy.yml
- test-ending-presentation.ts
- build
- package.json
- ZoneNpc
- Optional Route Guidance Implementation Plan
- AFTER ZERO — บัญชีข้อความสำหรับปรับตามวัย
- SoundManager
- compilerOptions
- Unified AI Skills Report
- dependencies
- บทสนทนาและปฏิกิริยาตามวัย — ข้อเสนอสำหรับตรวจแบบ
- StoryFeed.tsx
- Optional route guidance
- vite.config.ts
- scripts
- "../../tmp/after-zero-zombie/core/schema.js"
- build
- AFTER ZERO
- allowBuilds
- "../../tmp/after-zero-zombie/core/effects.js"
- "../../tmp/after-zero-zombie/next/start-profiles.js"
- "../../tmp/after-zero-zombie/systems/survival.js"
- "../../tmp/after-zero-zombie/systems/world.js"
- ZonePopulationState
- "../../tmp/after-zero-zombie/core/contract.js"
- "../../tmp/after-zero-zombie/core/state-utils.js"
- "../../tmp/after-zero-zombie/next/ui/consequence-summary.js"
- build
- Superpowers Usage Policy
- meets
- "../../tmp/after-zero-zombie/core/world-state.js"
- "../../tmp/after-zero-zombie/next/clinic-integration.js"
- "../../tmp/after-zero-zombie/next/presentation.js"
- "../../tmp/after-zero-zombie/systems/chronicle.js"
- "../../tmp/after-zero-zombie/systems/evolution.js"
- 2026-11-05-route-guidance-execution.md
- GEMINI.md
- "../../tmp/after-zero-zombie/core/modifiers.js"
- "../../tmp/after-zero-zombie/core/modules.js"
- "../../tmp/after-zero-zombie/core/random.js"
- "../../tmp/after-zero-zombie/core/trait-threat.js"
- "../../tmp/after-zero-zombie/core/view-model.js"
- freeze
- "../../tmp/after-zero-zombie/data/origins.js"
- "../../tmp/after-zero-zombie/data/survival.js"
- "../../tmp/after-zero-zombie/next/data/start-candidates.js"
- "../../tmp/after-zero-zombie/next/systems/director.js"
- "../../tmp/after-zero-zombie/systems/origins.js"
- "../../tmp/after-zero-zombie/ui/scene.js"
- react-dom
- ZonePopulationState
- eventEngine.ts
- export-narrative-pack.ts
- test-route-guidance-browser.mjs
- test-ui-tabs.mjs
- sync-bangkok-content.mjs
- test-route-guidance.ts
- scenario

## God Nodes (most connected - your core abstractions)
1. `App()` - 52 edges
2. `build()` - 29 edges
3. `SoundManager` - 18 edges
4. `compilerOptions` - 16 edges
5. `generateCharacter()` - 15 edges
6. `relationshipState()` - 12 edges
7. `buildFreeformNpcInteractionModal()` - 12 edges
8. `createCharacterState()` - 12 edges
9. `Optional Route Guidance Implementation Plan` - 12 edges
10. `AFTER ZERO — บัญชีข้อความสำหรับปรับตามวัย` - 12 edges

## Surprising Connections (you probably didn't know these)
- `งาน 3 — เกณฑ์ 75% และการเลือกงานถัดไป` --references--> `eligible()`  [INFERRED]
  docs/superpowers/plans/2026-11-05-optional-route-guidance.md → public/after-zero-bundle.js
- `characters` --calls--> `generateCharacter()`  [EXTRACTED]
  scripts/export-narrative-pack.ts → src/data/characterPool.ts
- `App()` --calls--> `PixelCityMap()`  [EXTRACTED]
  src/App.tsx → src/components/PixelCityMap.tsx
- `characters` --calls--> `createCharacterState()`  [EXTRACTED]
  scripts/export-narrative-pack.ts → src/data/characterPool.ts
- `characters` --calls--> `snapshotCharacter()`  [EXTRACTED]
  scripts/export-narrative-pack.ts → src/data/characterPool.ts

## Import Cycles
- None detected.

## Communities (67 total, 26 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.05
Nodes (88): c, marathonRuns, results, App(), AppMode, classifyActionLayer(), classifyEventLayer(), computeStateDeltas() (+80 more)

### Community 1 - "test-batch2-continuation-events.ts"
Cohesion: 0.07
Nodes (28): batch2Ids, ctx1_no, ctx1_ok, ctx2_no, ctx2_ok, ctxAwningLeft, ctxAwningSignaled, ctxAwningWaited (+20 more)

### Community 2 - "characterPool.ts"
Cohesion: 0.15
Nodes (17): eligibleOccupations(), generateCharacter(), getCharacterAgeGroup(), hairColors, hairStyles, Occupation, primary, profileId() (+9 more)

### Community 3 - "externalEventsPack.ts"
Cohesion: 0.18
Nodes (11): context, AI_COLLABORATION_PROMPTS, BangkokZoneId, EXTERNAL_AI_NPCS, EXTERNAL_AI_ROAM_EVENTS, ExternalEventEffects, ExternalGameEventTemplate, ExternalNpcTemplate (+3 more)

### Community 4 - "after-zero-bundle.js"
Cohesion: 0.07
Nodes (8): changeTrust(), dangerTrustMultiplier(), npcPosture(), previewTrust(), rebalanceRelationshipCatalog(), recordRescue(), relationshipState(), scaledTrust()

### Community 5 - "deploy.yml"
Cohesion: 0.07
Nodes (30): runs-on, steps, concurrency, cancel-in-progress, group, environment, needs, runs-on (+22 more)

### Community 6 - "test-ending-presentation.ts"
Cohesion: 0.06
Nodes (32): distDir, publicDir, rootDir, bundle, context, endings, forced, out (+24 more)

### Community 7 - "build"
Cohesion: 0.18
Nodes (29): "../../tmp/after-zero-zombie/engine.js"(), build(), act(), actions(), adjusted(), afterDecision(), choicePressure(), choiceReasons() (+21 more)

### Community 8 - "package.json"
Cohesion: 0.12
Nodes (23): devDependencies, autoprefixer@^10.4.21, puppeteer-core@^25.16.0, tailwindcss@^4.3.3, tsx@^4.21.0, @types/express@^4.17.21, @types/node@^22.14.0, @types/react@^19.3.0 (+15 more)

### Community 9 - "ZoneNpc"
Cohesion: 0.29
Nodes (6): COMMUNITY_DYNAMIC_EVENTS, COMMUNITY_ROAM_EVENTS, DynamicEventChoiceTemplate, DynamicNarrativeEventTemplate, EventConditionEvaluationResult, ZoneNpc

### Community 10 - "Optional Route Guidance Implementation Plan"
Cohesion: 0.12
Nodes (18): Global Constraints, Optional Route Guidance Implementation Plan, Review Focus, กติกาความคืบหน้า 75% ที่เสนอ, งาน 1 — สวิตช์และขอบเขตการซ่อนคู่มือ, งาน 2 — ปิดช่องเฉลยผ่านแผนที่, งาน 3 — เกณฑ์ 75% และการเลือกงานถัดไป, งาน 4 — การ์ด ปักหมุด และไฮไลต์ (+10 more)

### Community 11 - "AFTER ZERO — บัญชีข้อความสำหรับปรับตามวัย"
Cohesion: 0.11
Nodes (17): AFTER ZERO — บัญชีข้อความสำหรับปรับตามวัย, dynamic, endings, engine/travel/district/route, NPC/roam/timeline/ally/climax, past-life echoes, Pilot 12 ฉาก — มี ID จริงครบ, การตรวจเอกสารรอบนี้ (+9 more)

### Community 13 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+9 more)

### Community 14 - "Unified AI Skills Report"
Cohesion: 0.15
Nodes (12): Compatibility and activation, Follow-up installation: Graphify, UI/UX Pro Max, Impeccable, Graphify — installed, Impeccable — NOT INSTALLED, Installation, Installed skills, Notes, Safety and token policy (+4 more)

### Community 15 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, dotenv@^17.2.3, express@^4.21.2, @google/genai@^2.4.0, lucide-react@^0.546.0, motion@^12.23.24, dotenv, express (+3 more)

### Community 16 - "บทสนทนาและปฏิกิริยาตามวัย — ข้อเสนอสำหรับตรวจแบบ"
Cohesion: 0.18
Nodes (10): กติกางานเขียนร่วมกัน, การตรวจรับ, ขนาดที่ตรวจวัดได้, ความเสี่ยงที่ต้องแก้ก่อนเขียนเนื้อหาจำนวนมาก, บทสนทนาและปฏิกิริยาตามวัย — ข้อเสนอสำหรับตรวจแบบ, ลำดับงานหลังอนุมัติ, เป้าหมาย, แนวทางที่เลือกเสนอ (+2 more)

### Community 17 - "StoryFeed.tsx"
Cohesion: 0.14
Nodes (17): react@^19.0.1, react, history, log, labels, PixelCityMap(), positions, roads (+9 more)

### Community 18 - "Optional route guidance"
Cohesion: 0.25
Nodes (7): Approach, Detailed hints, Intent, Late-route navigation help, Optional route guidance, Persistence and integration, Verification

### Community 19 - "vite.config.ts"
Cohesion: 0.25
Nodes (6): @tailwindcss/vite@^4.3.3, vite@^8.3.0, @vitejs/plugin-react@^6.1.1, @tailwindcss/vite, vite, @vitejs/plugin-react

### Community 20 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, clean, dev, lint, prebuild, predev, preview

### Community 21 - ""../../tmp/after-zero-zombie/core/schema.js""
Cohesion: 0.50
Nodes (7): "../../tmp/after-zero-zombie/core/schema.js"(), create(), extensions(), newRunId(), pending(), unsafe(), validate()

### Community 22 - "build"
Cohesion: 0.40
Nodes (4): "../../tmp/after-zero-zombie/next/runtime.js"(), build(), describe(), situation()

### Community 23 - "AFTER ZERO"
Cohesion: 0.33
Nodes (5): AFTER ZERO, Deploy ขึ้น GitHub Pages, ตรวจสอบเวอร์ชันปัจจุบัน, พัฒนาและ build, ไฟล์หลัก

### Community 24 - "allowBuilds"
Cohesion: 0.40
Nodes (4): allowBuilds, esbuild, @google/genai, protobufjs

### Community 25 - ""../../tmp/after-zero-zombie/core/effects.js""
Cohesion: 0.60
Nodes (4): "../../tmp/after-zero-zombie/core/effects.js"(), apply(), record(), validate()

### Community 27 - ""../../tmp/after-zero-zombie/systems/survival.js""
Cohesion: 0.60
Nodes (4): "../../tmp/after-zero-zombie/systems/survival.js"(), adjustAction(), dayPolicy(), endDay()

### Community 28 - ""../../tmp/after-zero-zombie/systems/world.js""
Cohesion: 0.60
Nodes (4): "../../tmp/after-zero-zombie/systems/world.js"(), afterDecision(), choiceReasons(), encounter()

### Community 30 - "ZonePopulationState"
Cohesion: 0.33
Nodes (5): EventEvaluationContext, PastLifeRecord, ZonePopulationState, names, roles

### Community 31 - ""../../tmp/after-zero-zombie/core/contract.js""
Cohesion: 0.67
Nodes (3): "../../tmp/after-zero-zombie/core/contract.js"(), deepFreeze(), snapshot()

### Community 33 - ""../../tmp/after-zero-zombie/next/ui/consequence-summary.js""
Cohesion: 0.83
Nodes (4): "../../tmp/after-zero-zombie/next/ui/consequence-summary.js"(), deriveMilestones(), deriveTitle(), summarize()

### Community 36 - "meets"
Cohesion: 1.00
Nodes (3): "../../tmp/after-zero-zombie/core/conditions.js"(), meets(), validate()

### Community 37 - ""../../tmp/after-zero-zombie/core/world-state.js""
Cohesion: 1.00
Nodes (3): "../../tmp/after-zero-zombie/core/world-state.js"(), initialize(), initializeContent()

### Community 41 - ""../../tmp/after-zero-zombie/systems/evolution.js""
Cohesion: 1.00
Nodes (3): "../../tmp/after-zero-zombie/systems/evolution.js"(), behaviorDays(), evaluate()

### Community 59 - "ZonePopulationState"
Cohesion: 0.40
Nodes (4): BANGKOK_2026_BIOS, NewBio, residents, CharacterBioDossier

### Community 60 - "eventEngine.ts"
Cohesion: 0.23
Nodes (11): baseBio, buildLifeSimModalFromDynamicTemplate(), DYNAMIC_NARRATIVE_EVENTS, DynamicEventCategory, evaluateEventCondition(), EventTriggerCondition, findMatchingNpc(), getNextTriggeredDynamicEvent() (+3 more)

### Community 61 - "export-narrative-pack.ts"
Cohesion: 0.25
Nodes (10): characters, context, engineText, out, replacer(), sources, write(), CHARACTER_OCCUPATIONS (+2 more)

### Community 62 - "test-route-guidance-browser.mjs"
Cohesion: 0.23
Nodes (9): click(), count(), engine, enter(), keys, resolveMorningEvents(), state, tab() (+1 more)

### Community 64 - "test-ui-tabs.mjs"
Cohesion: 0.33
Nodes (4): engine, results, state, zones

### Community 65 - "sync-bangkok-content.mjs"
Cohesion: 0.22
Nodes (7): community, dialogues, engineVersion, relationshipSource, routes, rows, source

### Community 66 - "test-route-guidance.ts"
Cohesion: 0.25
Nodes (6): hidden, mapState, sandbox, shown, state, zones

### Community 68 - "scenario"
Cohesion: 0.53
Nodes (5): scenario(), check(), click(), snapshot(), tab()

## Knowledge Gaps
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `StoryFeed.tsx` to `package.json`, `App.tsx`, `test-ending-presentation.ts`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Are the 12 inferred relationships involving `build()` (e.g. with `act()` and `actions()`) actually correct?**
  _`build()` has 12 INFERRED edges - model-reasoned connections that need verification._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05259835893120135 - nodes in this community are weakly interconnected._
- **Why does `SoundManager` connect `SoundManager` to `test-ending-presentation.ts`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Should `test-batch2-continuation-events.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `dependencies` to `package.json`, `App.tsx`, `StoryFeed.tsx`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Should `after-zero-bundle.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07459677419354839 - nodes in this community are weakly interconnected._