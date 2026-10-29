# Awake Zombie prototype

This is a separate game from One Life in Sect. Canonical files are this directory's index.html, styles.css, app.js, engine.js and data/catalog.js. Never load the sect game's runtime or use its save keys.

Static actions/events/places/endings belong in data/catalog.js. State transitions, seeded randomness, requirements and save validation belong in engine.js. UI and procedural pixel art belong in app.js. One main action consumes one day; resolving an opening/morning event does not. A pending action-event must survive reload without repeating action rewards.

Run node tests/engine.cjs and the browser checks in tests/browser.cjs. No build or package installation is required to play. All assets are procedural and local.

Zombie hunger is fed by human flesh or blood, never human canned supplies. Looking for prey opens a choice and must never auto-feed, even at maximum hunger. Enduring hunger remains available everywhere. Eating humans does not directly remove sanity; empathy and trust are separate. Hunger pressure when helping is disclosed before choosing. Save schema v2 migrates old food to supplies and preserves pending events.
