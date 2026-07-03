# Asset conventions

## Character/weapon art (assets/player/<weapon>/...)
Art is single-direction: drawn facing "up" (North), as a small round
top-down character. There are no per-direction sheets - `AnimationManager`
rotates the whole frame at draw time to match the player's aim angle.

Each animation state is a *list of individual frame files* (not a grid
sheet), e.g. the chainsaw's `idle_running` state is
`assets/player/chainsaw/idle_running/frame_01.png` ... `frame_09.png`.
Exact file lists and frame timing are defined per weapon in
`src/config/WeaponConfig.js`. Frames are drawn at 60x60 (`Player.drawSize` /
`Zombie.drawSize`) regardless of source resolution.

Until a listed file exists on disk, the game renders a procedurally
generated placeholder frame in its place - drop the real PNG in at the
exact configured path and it takes over automatically, no code changes
needed.

Weapons that currently only have a single authored pose (handgun, rifle,
smg, shotgun, unarmed) reuse that one image across all their generic
states (idle/walk/run/etc.) via `singlePoseAnimations()` in
`WeaponConfig.js`. Add more numbered frames and a dedicated animation entry
to give them real walk/run/shoot cycles later - no other file needs to
change.

## Pickup icons (assets/items/<weapon>/icon.png)
A single static icon per weapon, shown bobbing on the ground and in the HUD
inventory bar. Any size works. Falls back to a procedural placeholder until
the file exists.

## Sound effects (assets/audio/sfx/<key>.wav)
Every sound is synthesized at runtime by default (`src/systems/AudioManager.js`).
Any key can be upgraded to a real recorded clip by adding it to
`REAL_SFX_FILES` in that file and dropping the matching file in
`assets/audio/sfx/`. Until the file loads, the synthesized version keeps
playing - same drop-in fallback pattern as the sprites.

## Adding a new weapon
1. Add a folder under `assets/player/<id>/` with its animation frames.
2. Add `assets/items/<id>/icon.png`.
3. Add one entry to `WeaponConfig` in `src/config/WeaponConfig.js`.
No other file needs to change.
