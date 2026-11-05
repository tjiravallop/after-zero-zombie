# Optional route guidance

Status: approved by the user on 2026-11-05; implementation and verification are recorded in the execution ledger.

## Intent

Preserve exploration and discovery. Players can independently opt into detailed route hints or late-route navigation help. Existing numeric outcome settings remain independent.

## Approach

Use two persistent, default-off preferences in the existing collapsed advanced settings under the journal. A single combined switch would prevent players from using navigation help without reading ending requirements. Always-on guidance would undermine the requested exploration experience.

## Detailed hints

- Label: “แสดงเบาะแสและเงื่อนไขเส้นทาง”.
- Off by default, including existing saves without this preference.
- Gate the route checklist, personal-ending guide, and detailed horizon clues behind this setting. Hide pre-emptive ending names and route-ending requirement explanations in guidance surfaces when disabled.
- Preserve actual story dialogue, discovered events, NPC crises, ordinary travel information, and explanations required to understand unavailable actions.
- Numeric action outcomes remain controlled by the existing numeric setting; turning that on does not turn hints on.

## Late-route navigation help

- Label: “ช่วยแนะนำและปักหมุดเส้นทางช่วงท้าย”.
- Off by default and independent of detailed hints.
- Proposed threshold: at least 75% readiness, plus two of the route’s three preparation steps completed. This requires deliberate route actions, rather than high starting stats alone.
- Readiness is the average of preparation completion, each required stat’s capped current/target ratio, and the sample ratio when samples are required. Do not include current location: arriving at the destination is a navigation task, not a prerequisite for offering help.
- Use the existing three preparation routes. Personal endings remain outside automatic recommendations until their progress has a defined model.
- Show a non-blocking suggestion card on the play screen. Do not open a modal, navigate automatically, or reveal the ending’s name, requirements, or exact readiness percentage.
- Players explicitly pin a suggested route. Only one route is pinned at a time.
- Show the next incomplete preparation task and highlight its map destination and matching action. After all preparation tasks are complete, show the destination only when other requirements are satisfied; otherwise describe the remaining preparation broadly without numeric thresholds.
- Re-evaluate after actions. Never highlight an unavailable action as actionable. Clear a pin when its run changes or the game ends. Allow unpinning and dismissing a route suggestion for the current run.
- Turning assistance off immediately removes suggestion cards and highlights, including any active pin. Detailed hints do not turn it back on.

## Persistence and integration

- Store preferences separately from character saves, following the existing localStorage preference pattern. They persist across reloads and new characters.
- Scope pins and dismissed suggestions to the current run so imported or newly rolled characters cannot inherit stale objectives.
- Reuse progressionRoutes.json, existing action IDs, the current map, and the journal settings. Add no dependencies or changes to survival balance.

## Verification

- Both preferences default off and remain independent after reload.
- With hints off, the checklist, personal-ending guide, and horizon spoilers are absent even when numeric outcomes are enabled.
- Assistance never offers a route before two preparation steps or below 75% readiness.
- Crossing the threshold offers help without opening a modal or pinning automatically.
- Pinning highlights the intended next task and location; completion advances the target.
- Switching assistance off, ending the game, changing runs, and importing another run remove stale guidance.
- Existing travel, story events, and NPC crisis information continue to work.
