# GAME DESIGN DOCUMENT

**Working Title:** *Last Light: Hollowbrook*
**Genre:** 2D top-down survival shooter
**Engine/Stack:** HTML5 Canvas, Vanilla JavaScript, no external frameworks
**Tone/Inspiration:** Slow-moving, shambling undead horror in the style of classic public-domain black-and-white zombie cinema — grainy dread, small-town isolation, radio broadcasts, and hordes that never stop coming. All characters, names, locations, dialogue, artwork, and music are original creations; nothing is copied or derived from any copyrighted film or game.

---

## 1. Gameplay Loop

**Core loop (moment to moment):**
1. Player spawns in a contained outdoor/small-town map with limited starting ammo and health.
2. Zombies spawn continuously from map edges, boarded-up buildings, and "hot zones" that grow more numerous over time.
3. Player moves and aims independently (WASD movement, mouse aim) to kite, funnel, and thin out the horde.
4. Player manages ammo economy: fire deliberately, reload manually during lulls, avoid getting caught empty in the open.
5. Player explores briefly between waves to loot supply points (ammo, medkits, weapon parts, barricade materials) while the horde regenerates pressure.
6. Player uses environment (chokepoints, barricades, sightlines) to survive increasingly dense and varied zombie compositions.
7. Loop escalates until the player dies (run ends) — score/time/kills are tallied for a "nights survived" style result screen.

**Session loop (run to run):**
- Each run is a single escalating siege on one map (no persistent meta-progression in v1 — see Roadmap for stretch goals).
- Death triggers a summary screen (time survived, zombies killed, headshot %, supplies looted) and a restart option.
- Optional light meta-hook for later versions: unlockable starting loadouts or map variants based on best performance (deferred to post-launch).

**Minute-to-minute tension design:**
- No safe rooms — the player is always exposed, so tension comes from pacing supply runs against horde density, not from "hiding."
- Zombies are individually slow but win through numbers, flanking, and noise-based aggro (gunfire attracts more of them), creating a constant risk/reward around every shot fired.

---

## 2. Story Premise

Set in **Hollowbrook**, a fictional isolated farming town, several days after an unexplained affliction began spreading through the population, turning the infected into slow, mindless, decaying revenants. There is no cure, no rescue confirmed, and no working phone lines — only a hand-crank emergency radio in the town square that occasionally crackles with fragmented, contradictory broadcasts from other survivors and static-drowned military instructions.

The player is a nameless, ordinary resident (a mechanic, a mail carrier, a groundskeeper — never a trained soldier) who was away from town when the outbreak began and returns to find Hollowbrook overrun. There is no chosen-one narrative and no combat expertise; survival is purely a matter of resourcefulness, scavenged weapons, and endurance. The implicit goal is simply to last through the night(s) and keep the radio powered, in the fading hope that the broadcasts mean help is still coming.

Tone: quiet dread, black-and-white newsreel framing (flavor text presented like grainy emergency bulletins), sparse and clinical rather than gory or shock-driven — echoing the atmosphere of early independent horror cinema rather than modern gore-horror.

---

## 3. Player Abilities

**Movement**
- 8-directional WASD movement at a fixed base speed, independent of aim direction (twin-stick style).
- Sprint (Shift) with a stamina meter — fast enough to outrun single zombies, not fast enough to ignore a horde; draining stamina increases sway/inaccuracy.
- Dodge-step (Space) — a short directional burst with brief invulnerability frames and a cooldown, used to escape a closing grab rather than to skip past danger casually.

**Combat**
- Free-aim with mouse; character/weapon rotates toward cursor independent of movement direction.
- Fire (LMB): semi-auto or full-auto depending on weapon.
- Manual reload (R): drops current magazine (partial mags are not restored — encourages not reloading too early... but reload canceling is not punished harshly, to stay fair).
- Melee bash (E or RMB): quick low-damage shove/strike with short range, free of ammo cost, used to create space or finish a staggered zombie.
- Headshot targeting is purely aim-based (no lock-on): hitting the zombie's head hitbox multiplies damage.

**Survival utility**
- Interact (F): loot containers, pick up dropped items, barricade doors/windows, revive downed status (if co-op is added later).
- Quick-use consumable slots (1–4): bandages/medkits, thrown noisemakers (distract zombies), thrown molotov/pipe-bomb style area items (crafted from found parts), and a flare/flashlight pulse for visibility in dark zones.
- Inventory is deliberately small (limited carry slots) to force choices between ammo, healing, and utility items.

**Progression within a run**
- No XP/leveling; power comes from what the player finds and how well they manage it (weapon upgrades, barricade materials, better ammo caches).
- Optional light perks tied to survival milestones (e.g., surviving to a time threshold unlocks a temporary buff like faster reload) to reward endurance without becoming a stat-check power fantasy.

---

## 4. Zombie Types

All zombies are slow-walking by baseline (true to the classic shambler archetype) — danger comes from numbers, encirclement, and specialized variants, not from individual zombie speed.

| Type | Behavior | Threat Profile |
|---|---|---|
| **Shambler** (baseline) | Slow, direct-line pursuit toward the player's last known position. | Low individually; the "filler" horde unit. Weak to headshots. |
| **Crawler** | Legless/damaged zombie that drags itself; very slow but very low profile, hard to spot in grass/rubble, ambushes near cover. | Low damage, high surprise factor; rewards attentiveness. |
| **Bloated** | Slow, tankier zombie that bursts into a short-range gas/damage cloud on death, forcing the player to finish it at range. | Area denial on death; punishes melee finishing. |
| **Screecher** | Fragile but emits a shriek when it spots the player, drawing every nearby zombie toward that location. | Priority kill target; turns stealth positioning into a real mechanic. |
| **Brute** | Larger, heavily damaged-looking zombie with high health and a short lunge attack; still slow-walking otherwise. | Absorbs ammo; best handled with headshots or environmental funneling. |
| **Swarm Child** *(handle with care — see note)* | Small, fast-shuffling pack unit that only appears in groups of 3–4; individually weak but flanks quickly. | Introduces the only "fast" threat, always in a pack, to create panic moments without breaking the "slow zombie" identity of the genre. |

*(Design note: "Swarm Child" naming/theme will be revisited to ensure it reads as clearly fictional and non-exploitative — likely reskinned as a "Feral" fast-shambler type, e.g. a zombie that recently turned and hasn't fully stiffened up, to keep an in-universe justification for the one faster enemy archetype.)*

**Spawn behavior:** zombies spawn off-screen at map-edge spawn markers and from designated "nests" (collapsed buildings, the cemetery, the grain silo) that activate progressively as difficulty increases.

---

## 5. Weapon Categories

Weapons are entirely original/fictional models — generic archetypes rather than real-world branded firearms — consistent with an indie, public-domain-inspired aesthetic.

| Category | Examples (fictional) | Role |
|---|---|---|
| **Melee** | Fire axe, tire iron, kitchen cleaver | Infinite use, no ammo, low DPS, high risk (close range), best for staggering single crawlers. |
| **Sidearm** | Revolver, worn service pistol | Reliable, moderate ammo economy, always-available fallback. |
| **Shotgun** | Sawed-off, pump-action | High close-range burst damage, wide spread, great vs. surrounding hordes, poor at range. |
| **Rifle** | Bolt-action hunting rifle, salvaged carbine | High single-target damage, best headshot weapon, slower fire rate. |
| **SMG/Auto** | Improvised auto-carbine | High fire rate, mediocre accuracy, ammo-hungry, good for crowd suppression. |
| **Thrown/Utility** | Noisemaker (glass bottle), Molotov-style incendiary, pipe-bomb | Crowd control, distraction, area denial rather than raw kill efficiency. |

**Shared systems:**
- Manual reload only, magazine-based, with a visible reload animation/timer the player must respect.
- Ammo is weapon-category-based (pistol rounds, rifle rounds, shells, etc.) so scavenging has real tradeoffs.
- Weapon condition/jamming is a stretch goal (post-MVP) to reinforce scarcity without being punishing in v1.

---

## 6. Map Ideas

All maps are original fictional locations sized to fit the 1920x1080 internal resolution with camera-follow scrolling over a larger world space.

1. **Hollowbrook Town Square** *(first/tutorial map)* — Main street, general store, boarded church, the emergency radio tower at the center as a focal landmark and light objective (keep it powered). Mostly open with building-based chokepoints.
2. **Millbrook Farmstead** — Open fields, a barn, silo (zombie nest), farmhouse with limited interior rooms; long sightlines reward rifles, but crop rows provide zombie concealment.
3. **Cedar Hollow Cemetery & Chapel** — Tight, maze-like headstone rows and a small chapel; claustrophobic, melee/shotgun-favored map with poor visibility (fits the black-and-white horror atmosphere strongly).
4. **Riverside Mill District** — Industrial map with a river splitting the map (choke bridges), a lumber mill interior, and multiple elevation-implied catwalks (rendered via layered sprites, still 2D top-down).
5. **Interstate Rest Stop** *(late-game/hardest map)* — Gas station, diner, and stalled vehicles on a highway stretch; very open with minimal cover, designed for high horde density and skilled kiting.

Each map includes: 3–5 supply spawn points, 1–2 barricade-able structures, a landmark objective (radio, generator, signal flare) tied to score/survival bonuses, and edge-based zombie spawn markers that scale in count/frequency over time.

---

## 7. Difficulty Progression

Progression is time-based and wave-flavored but continuous (no hard stop-and-restart waves) to preserve the "overwhelming siege" feeling rather than a discrete wave-shooter feeling.

- **Phase 1 – Uneasy Quiet (0–2 min):** Sparse shamblers only, generous supply spawns, teaches controls/map layout.
- **Phase 2 – The Horde Gathers (2–6 min):** Spawn rate increases, Crawlers and Bloated introduced, supply respawn rate slows.
- **Phase 3 – Surrounded (6–12 min):** Screechers introduced (alerting mechanic becomes relevant), multiple simultaneous spawn nests active, player is pushed to rotate across the map instead of holding one spot.
- **Phase 4 – Breaking Point (12–20 min):** Brutes and Feral/fast variants introduced, spawn density approaches a soft cap, ammo scarcity peaks, forcing melee/utility item reliance.
- **Phase 5 – Endless Night (20+ min):** All zombie types spawn in escalating fixed-interval density increases indefinitely; this is the "how long can you last" endgame test, with difficulty scaling primarily through spawn rate and multi-nest activation rather than unbeatable stat bloat, keeping it always technically survivable by a skilled player.

Difficulty scaling levers (tunable): spawn interval, concurrent zombie cap, nest activation count, type-mix weighting, supply spawn rate/quality.

---

## 8. UI Layout

Design target: internal 1920x1080 canvas, clean diegetic-adjacent HUD readable at a glance, minimal clutter to preserve horror atmosphere.

- **Bottom-left:** Health bar (segmented) + stamina bar beneath it.
- **Bottom-right:** Current weapon icon, magazine count / reserve ammo (e.g. `7 / 42`), reload prompt indicator.
- **Bottom-center:** Quick-use item slots (1–4) with icons and cooldown/quantity overlays.
- **Top-center:** Survival timer ("Time Survived: 04:32") and current phase/threat indicator (subtle, e.g. a small escalating icon rather than text banner).
- **Top-right:** Kill counter and headshot percentage (feeds end-of-run stats).
- **Top-left:** Minimal directional audio cue indicator (e.g., a faint compass ping toward loud noise sources like a Screecher) — supports positional awareness without a full minimap, keeping tension high.
- **Center screen (contextual only):** Interaction prompt ("Hold F to Barricade"), low-health vignette, low-ammo warning flash.
- **Full-screen states:** Main menu (title, start, options, credits — original title art only), Pause menu, Death/Results screen (time survived, kills, headshots, supplies found, restart/menu buttons).
- **Visual style:** Desaturated/near-monochrome palette with limited high-contrast accent color (e.g., muted red only for health/blood-critical cues) to reinforce the black-and-white cinema homage while keeping key feedback readable.

---

## 9. Project Folder Structure

```
undead-hollow/
├── docs/
│   └── GDD.md
├── index.html
├── src/
│   ├── main.js                # entry point, game loop bootstrap
│   ├── core/
│   │   ├── engine.js           # game loop, fixed-timestep update/render
│   │   ├── input.js             # keyboard/mouse handling
│   │   ├── canvas.js             # canvas setup, internal 1920x1080 -> responsive scaling
│   │   ├── camera.js              # camera follow / world-to-screen transform
│   │   └── assetLoader.js          # sprite/audio loading & caching
│   ├── entities/
│   │   ├── player.js
│   │   ├── zombie.js
│   │   ├── zombieTypes/
│   │   │   ├── shambler.js
│   │   │   ├── crawler.js
│   │   │   ├── bloated.js
│   │   │   ├── screecher.js
│   │   │   ├── brute.js
│   │   │   └── feral.js
│   │   ├── projectile.js
│   │   └── item.js
│   ├── weapons/
│   │   ├── weaponBase.js
│   │   ├── melee.js
│   │   ├── sidearm.js
│   │   ├── shotgun.js
│   │   ├── rifle.js
│   │   ├── smg.js
│   │   └── thrown.js
│   ├── systems/
│   │   ├── spawnManager.js        # difficulty phases, nest activation
│   │   ├── lootManager.js
│   │   ├── collision.js
│   │   ├── combat.js               # damage calc, headshot logic
│   │   ├── audioAlert.js            # noise-based zombie aggro
│   │   └── difficultyDirector.js
│   ├── maps/
│   │   ├── mapBase.js
│   │   ├── townSquare.js
│   │   ├── farmstead.js
│   │   ├── cemetery.js
│   │   ├── millDistrict.js
│   │   └── restStop.js
│   ├── ui/
│   │   ├── hud.js
│   │   ├── menu.js
│   │   ├── pauseMenu.js
│   │   └── resultsScreen.js
│   └── state/
│       └── gameState.js            # global run state, save/reset
├── assets/
│   ├── sprites/
│   │   ├── player/
│   │   ├── zombies/
│   │   ├── weapons/
│   │   ├── items/
│   │   └── tiles/
│   │       (all source sprites authored at 182x182 per unit frame)
│   ├── audio/
│   │   ├── sfx/
│   │   └── music/
│   └── fonts/
├── styles/
│   └── main.css
└── README.md
```

---

## 10. Development Roadmap

**Milestone 0 — Project Scaffold**
- Repo structure, `index.html` + canvas boilerplate, responsive scaling of 1920x1080 internal resolution, fixed-timestep game loop, input handling (WASD + mouse).

**Milestone 1 — Core Movement & Camera**
- Player entity movement, sprite placeholder rendering at 182x182 source, camera-follow on a map larger than the viewport, basic collision with map bounds/obstacles.

**Milestone 2 — Shooting & Combat Base**
- Mouse-aim rotation, LMB firing, projectile/hitscan resolution, manual reload system, ammo counter, one baseline weapon (sidearm) fully working end-to-end.

**Milestone 3 — Zombies v1**
- Shambler zombie with pathing/pursuit AI, health/damage, death handling, headshot hitbox and bonus damage, basic spawn manager (fixed interval, single nest).

**Milestone 4 — Encirclement & Difficulty Director**
- Multiple spawn nests, phase-based difficulty scaling, additional zombie types (Crawler, Bloated, Screecher) with distinct AI behaviors, noise-based aggro system.

**Milestone 5 — Weapons Expansion**
- Shotgun, rifle, SMG, melee bash, thrown utility items, weapon-switching UI, per-category ammo pools.

**Milestone 6 — Supplies & Survival Systems**
- Loot spawning/pickup, medkits/healing, barricade interaction, stamina/sprint/dodge-step.

**Milestone 7 — Full HUD & Menus**
- Complete HUD per section 8, main menu, pause menu, results/death screen, run stats tracking (time, kills, headshot %).

**Milestone 8 — First Full Map (Hollowbrook Town Square)**
- Full art pass (original 182x182 sprites), map-specific supply/barricade/objective placement, audio pass (original SFX/music only).

**Milestone 9 — Additional Maps & Zombie Roster Completion**
- Farmstead, Cemetery, Mill District, Rest Stop; Brute and Feral zombie types; per-map tuning of difficulty director.

**Milestone 10 — Polish & Balance Pass**
- Full playtesting balance for spawn curves/ammo economy, screen-shake/juice/audio-visual feedback, performance profiling for large zombie counts, accessibility options (colorblind-safe accent, remappable keys, volume controls).

**Post-Launch / Stretch Goals**
- Meta-progression (unlockable loadouts/maps based on best runs), co-op support, weapon condition/jamming system, additional maps, daily-challenge seeded runs.

---

*End of Game Design Document. No implementation code has been written. Awaiting approval/direction before beginning Milestone 0.*
