# Graph Report - after-zero-zombie-main  (2026-11-08)

## Corpus Check
- 72 files · ~1,182,962 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 3, .cmd 2, .patch 1)

## Summary
- 873 nodes · 1549 edges · 78 communities (52 shown, 26 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 80 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `547e7a21`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.tsx
- test-batch2-continuation-events.ts
- characterPool.ts
- export-ending-review.ts
- after-zero-bundle.js
- deploy.yml
- test-tailored-pilot-endings.ts
- build
- package.json
- AFTER ZERO — รีวิวฉากจบเดิมทั้งหมด (23 ID)
- Optional Route Guidance Implementation Plan
- AFTER ZERO — บัญชีข้อความสำหรับปรับตามวัย
- SoundManager
- compilerOptions
- Unified AI Skills Report
- test-zombie-portrait.ts
- บทสนทนาและปฏิกิริยาตามวัย — ข้อเสนอสำหรับตรวจแบบ
- StoryFeed.tsx
- Optional route guidance
- npcInteractions.ts
- measure-progression.ts
- "../../tmp/after-zero-zombie/core/schema.js"
- build
- AFTER ZERO
- allowBuilds
- "../../tmp/after-zero-zombie/core/effects.js"
- "../../tmp/after-zero-zombie/next/start-profiles.js"
- "../../tmp/after-zero-zombie/systems/survival.js"
- "../../tmp/after-zero-zombie/systems/world.js"
- generate-people-roster-mockups.mjs
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
- mapLocations.ts
- "../../tmp/after-zero-zombie/data/survival.js"
- "../../tmp/after-zero-zombie/next/data/start-candidates.js"
- "../../tmp/after-zero-zombie/next/systems/director.js"
- "../../tmp/after-zero-zombie/systems/origins.js"
- "../../tmp/after-zero-zombie/ui/scene.js"
- export-narrative-pack.ts
- pastLifeEchoes.ts
- test-route-guidance-browser.mjs
- externalEventsPack.ts
- ref_node_path
- manifest.json
- eventEngine.ts
- sync-bangkok-content.mjs
- communityEvents.ts
- scenario
- update-pixel-map-dialog.mjs
- CharacterBioDossier
- capture-map-dialog-after.mjs
- test-route-guidance.ts
- build-export-bundles.mjs
- verify-journal-redesign.mjs
- test-ui-tabs.mjs
- capture-map-dialog-baseline.mjs
- createInitialZonePopulations

## God Nodes (most connected - your core abstractions)
1. `App()` - 54 edges
2. `build()` - 29 edges
3. `AFTER ZERO — รีวิวฉากจบเดิมทั้งหมด (23 ID)` - 25 edges
4. `generateCharacter()` - 23 edges
5. `SoundManager` - 18 edges
6. `createCharacterState()` - 17 edges
7. `compilerOptions` - 16 edges
8. `ZonePopulationState` - 13 edges
9. `deriveDeathEndingPresentation()` - 13 edges
10. `relationshipState()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `งาน 3 — เกณฑ์ 75% และการเลือกงานถัดไป` --references--> `eligible()`  [INFERRED]
  docs/superpowers/plans/2026-11-05-optional-route-guidance.md → public/after-zero-bundle.js
- `cardsHtml` --calls--> `computePortraitPixels()`  [EXTRACTED]
  scripts/verify-mobile-portraits.mjs → src/components/ZombiePortrait.tsx
- `characters` --calls--> `generateCharacter()`  [EXTRACTED]
  scripts/export-narrative-pack.ts → src/data/characterPool.ts
- `createMultiDayState()` --calls--> `generateCharacter()`  [EXTRACTED]
  scripts/verify-journal-redesign.mjs → src/data/characterPool.ts
- `cardsHtml` --calls--> `generateCharacter()`  [EXTRACTED]
  scripts/verify-mobile-portraits.mjs → src/data/characterPool.ts

## Import Cycles
- None detected.

## Communities (78 total, 26 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.10
Nodes (31): App(), classifyActionLayer(), computeStateDeltas(), CONDITIONAL_CARE_ACTION_IDS, DesktopSideTab, GameScreenStage, LEGACY_02_STORY_ACTION_IDS, MobileDrawerTab (+23 more)

### Community 1 - "test-batch2-continuation-events.ts"
Cohesion: 0.07
Nodes (28): batch2Ids, ctx1_no, ctx1_ok, ctx2_no, ctx2_ok, ctxAwningLeft, ctxAwningSignaled, ctxAwningWaited (+20 more)

### Community 2 - "characterPool.ts"
Cohesion: 0.15
Nodes (17): eligibleOccupations(), generateCharacter(), getCharacterAgeGroup(), hairColors, hairStyles, Occupation, primary, profileId() (+9 more)

### Community 3 - "export-ending-review.ts"
Cohesion: 0.22
Nodes (10): bundle, context, endings, forced, out, sources, stringify(), write() (+2 more)

### Community 4 - "after-zero-bundle.js"
Cohesion: 0.07
Nodes (9): changeTrust(), dangerTrustMultiplier(), npcPosture(), previewTrust(), rebalanceRelationshipCatalog(), recordRescue(), relationshipState(), scaledTrust() (+1 more)

### Community 5 - "deploy.yml"
Cohesion: 0.07
Nodes (30): runs-on, steps, concurrency, cancel-in-progress, group, environment, needs, runs-on (+22 more)

### Community 6 - "test-tailored-pilot-endings.ts"
Cohesion: 0.08
Nodes (37): react@^19.0.1, react-dom@^19.0.1, react, react-dom, bio, context, reviewDir, zones (+29 more)

### Community 7 - "build"
Cohesion: 0.19
Nodes (28): build(), act(), actions(), adjusted(), afterDecision(), choicePressure(), choiceReasons(), choose() (+20 more)

### Community 8 - "package.json"
Cohesion: 0.05
Nodes (47): dependencies, dotenv@^17.2.3, express@^4.21.2, @google/genai@^2.4.0, lucide-react@^0.546.0, motion@^12.23.24, @tailwindcss/vite@^4.3.3, vite@^8.3.0 (+39 more)

### Community 9 - "AFTER ZERO — รีวิวฉากจบเดิมทั้งหมด (23 ID)"
Cohesion: 0.04
Nodes (48): AFTER ZERO — รีวิวฉากจบเดิมทั้งหมด (23 ID), bkk_busyard.ending — ป้ายสุดท้ายยังมีคนรอ, bkk_cafe.ending — โต๊ะประจำของผู้ไร้ชีพจร, bkk_depot.ending — ถนนที่ยังดูแลกัน, bkk_market.ending — ครัวที่ยังมีที่ให้เจ้า, bkk_office.ending — เครือข่ายที่ยังจำชื่อกัน, bkk_pier.ending — ผู้เฝ้าท่าริมคลอง, bkk_power.ending — แสงเล็กในห้วยขวาง (+40 more)

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

### Community 15 - "test-zombie-portrait.ts"
Cohesion: 0.05
Nodes (42): adultLayout, allHairStyles, childLayout, elderlyLayout, elderlyMales, hairTypesSeen, hasClawsS1, hasClawsS2 (+34 more)

### Community 16 - "บทสนทนาและปฏิกิริยาตามวัย — ข้อเสนอสำหรับตรวจแบบ"
Cohesion: 0.18
Nodes (10): กติกางานเขียนร่วมกัน, การตรวจรับ, ขนาดที่ตรวจวัดได้, ความเสี่ยงที่ต้องแก้ก่อนเขียนเนื้อหาจำนวนมาก, บทสนทนาและปฏิกิริยาตามวัย — ข้อเสนอสำหรับตรวจแบบ, ลำดับงานหลังอนุมัติ, เป้าหมาย, แนวทางที่เลือกเสนอ (+2 more)

### Community 17 - "StoryFeed.tsx"
Cohesion: 0.16
Nodes (15): history, log, cssContent, cssFiles, getRoleIcon(), PIXEL_ROLE_ICONS, renderScenarioHtml(), scenarios (+7 more)

### Community 18 - "Optional route guidance"
Cohesion: 0.25
Nodes (7): Approach, Detailed hints, Intent, Late-route navigation help, Optional route guidance, Persistence and integration, Verification

### Community 19 - "npcInteractions.ts"
Cohesion: 0.18
Nodes (24): applyNpcRelationships(), kindOf(), migrateSavedRelationships(), npcChoiceReason(), npcEncounterWitnesses(), prepareNpcModal(), RelationshipChoice, validateZoneRelationships() (+16 more)

### Community 20 - "measure-progression.ts"
Cohesion: 0.13
Nodes (11): c, marathonRuns, results, LATE_GAME_CITY_CRISIS_EVENTS, LATE_GAME_ROAM_FOLLOWUP_EVENTS, buildActionClimaxDecisionModal(), CHARACTER_BIO_DOSSIERS, getMidGameHorizonClues() (+3 more)

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

### Community 30 - "generate-people-roster-mockups.mjs"
Cohesion: 0.27
Nodes (10): cssPath, getRoleIcon(), PIXEL_ROLE_ICONS, renderBeforeHtml(), renderComparisonHtml(), renderOption1Html(), renderOption2Html(), run() (+2 more)

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

### Community 50 - "mapLocations.ts"
Cohesion: 0.23
Nodes (11): arterialSpurs, edgePath(), PixelCityMap(), ROAD_PATHS, canonicalRouteKey(), findMapRoute(), MAP_LABELS, MAP_POSITIONS (+3 more)

### Community 58 - "export-narrative-pack.ts"
Cohesion: 0.23
Nodes (11): characters, context, engineText, out, replacer(), sources, write(), createMultiDayState() (+3 more)

### Community 59 - "pastLifeEchoes.ts"
Cohesion: 0.11
Nodes (25): sampleBio, applyEngineSurvivalEndDayToState(), applyLifeSimModalEffectsToState(), CauseOfDeathInfo, collectEngineSurvivalModifiers(), computeEngineSurvivalDayPolicy(), DailyWeatherAndZoneHazardInfo, DANGER_HUMAN_ATTACK_SCENARIOS (+17 more)

### Community 60 - "test-route-guidance-browser.mjs"
Cohesion: 0.23
Nodes (9): click(), count(), engine, enter(), keys, resolveMorningEvents(), state, tab() (+1 more)

### Community 61 - "externalEventsPack.ts"
Cohesion: 0.24
Nodes (9): context, AI_COLLABORATION_PROMPTS, BangkokZoneId, EXTERNAL_AI_NPCS, EXTERNAL_AI_ROAM_EVENTS, ExternalEventEffects, ExternalGameEventTemplate, ExternalNpcTemplate (+1 more)

### Community 62 - "ref_node_path"
Cohesion: 0.22
Nodes (7): puppeteer-core, afterImageBase64, beforeImageBase64, cardsHtml, htmlPath, renderSvgString(), testCases

### Community 63 - "manifest.json"
Cohesion: 0.40
Nodes (4): endingCount, endingIds, exportedAt, sources

### Community 64 - "eventEngine.ts"
Cohesion: 0.17
Nodes (17): baseBio, buildLifeSimModalFromDynamicTemplate(), DYNAMIC_NARRATIVE_EVENTS, DynamicEventCategory, DynamicEventChoiceTemplate, DynamicNarrativeEventTemplate, evaluateEventCondition(), EventConditionEvaluationResult (+9 more)

### Community 65 - "sync-bangkok-content.mjs"
Cohesion: 0.18
Nodes (9): community, currentIndex, dialogues, engineVersion, nextIndex, relationshipSource, routes, rows (+1 more)

### Community 68 - "scenario"
Cohesion: 0.53
Nodes (5): scenario(), check(), click(), snapshot(), tab()

### Community 69 - "update-pixel-map-dialog.mjs"
Cohesion: 0.33
Nodes (4): altEndIndex, content, endIndex, startIndex

### Community 70 - "CharacterBioDossier"
Cohesion: 0.25
Nodes (7): BANGKOK_2026_BIOS, NewBio, residents, EventEvaluationContext, CharacterBioDossier, PastLifeRecord, ZonePopulationState

### Community 71 - "capture-map-dialog-after.mjs"
Cohesion: 0.25
Nodes (8): assetFiles, cssContent, cssFile, cssPath, MAP_LABELS, renderAfterDialogHtml(), run(), scenarios

### Community 72 - "test-route-guidance.ts"
Cohesion: 0.22
Nodes (7): allPlaceIds, hidden, mapState, sandbox, shown, state, zones

### Community 73 - "build-export-bundles.mjs"
Cohesion: 0.29
Nodes (3): distDir, publicDir, rootDir

### Community 74 - "verify-journal-redesign.mjs"
Cohesion: 0.29
Nodes (3): engine, report, zones

### Community 75 - "test-ui-tabs.mjs"
Cohesion: 0.33
Nodes (4): engine, results, state, zones

### Community 76 - "capture-map-dialog-baseline.mjs"
Cohesion: 0.40
Nodes (5): cssContent, cssPath, renderCurrentDialogHtml(), run(), scenarios

### Community 77 - "createInitialZonePopulations"
Cohesion: 0.40
Nodes (5): createInitialZonePopulations(), syncZonePopulationsWithEngineState(), materializeZoneResidents(), names, roles

## Knowledge Gaps
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `puppeteer-core` connect `ref_node_path` to `capture-map-dialog-after.mjs`, `package.json`, `verify-journal-redesign.mjs`, `test-ui-tabs.mjs`, `capture-map-dialog-baseline.mjs`, `StoryFeed.tsx`, `test-route-guidance-browser.mjs`, `generate-people-roster-mockups.mjs`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Are the 12 inferred relationships involving `build()` (e.g. with `act()` and `actions()`) actually correct?**
  _`build()` has 12 INFERRED edges - model-reasoned connections that need verification._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10252100840336134 - nodes in this community are weakly interconnected._
- **Why does `react` connect `test-tailored-pilot-endings.ts` to `package.json`, `App.tsx`, `mapLocations.ts`, `StoryFeed.tsx`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Should `test-batch2-continuation-events.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Why does `SoundManager` connect `SoundManager` to `test-tailored-pilot-endings.ts`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Should `after-zero-bundle.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07196969696969698 - nodes in this community are weakly interconnected._