// Runs in an isolated context with access to Node APIs, but the renderer
// (the actual game code in src/) only ever sees whatever is explicitly
// exposed here via contextBridge - keeps nodeIntegration off in the
// BrowserWindow while still letting the game detect which build it's
// running as.
//
// buildTarget comes from build-target.json, which each `npm run build:*`
// script overwrites right before packaging (see set-target.js) - so the
// SAME game code works for every target, it just reads a different value
// once packaged. Defaults to 'windows' for local `npm run dev`.
const { contextBridge } = require('electron');
const fs = require('fs');
const path = require('path');

function readBuildTarget() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'build-target.json'), 'utf8');
    return JSON.parse(raw).target || 'windows';
  } catch {
    return 'windows';
  }
}

contextBridge.exposeInMainWorld('platform', {
  isDesktop: true,
  buildTarget: readBuildTarget(),

  // Steamworks hookup point - deliberately a no-op stub until a real
  // Steamworks binding (e.g. `steamworks.js`) is wired in here once you
  // have a Steamworks Partner account + App ID. src/platform/Platform.js
  // calls this unconditionally; it's harmless on every non-Steam build.
  unlockAchievement(achievementId) {
    if (readBuildTarget() !== 'steam') return;
    // TODO once Steamworks is wired in: forward to the main process via
    // ipcRenderer and call SteamUserStats.SetAchievement() there.
    console.log(`[Steam] would unlock achievement: ${achievementId}`);
  },
});
