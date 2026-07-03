// Single point of contact between the game and whatever it's actually
// running under - a plain browser tab (dev/preview), or one of the
// Electron desktop builds (windows/gog/steam - see desktop/build-target.json
// and desktop/preload.js). Everything here is safe to call unconditionally
// from anywhere in src/ - it no-ops if the platform bridge isn't present
// (browser) or the current build target doesn't support a given feature
// (achievements/cloud saves only mean anything on the Steam build).
//
// The existing localStorage-based save system in AppController.js is left
// completely untouched - it already works identically inside Electron's
// renderer process. This module only adds the extra Steam-only layer
// (achievements, cloud sync) on top of it.

// `window.platform` is only defined inside the Electron shell - see
// desktop/preload.js. A plain browser tab (npm-free dev/preview) has no
// such bridge, so every function below degrades gracefully to a no-op.
function bridge() {
  return typeof window !== 'undefined' ? window.platform : undefined;
}

export function isDesktop() {
  return !!bridge()?.isDesktop;
}

// 'web' | 'windows' | 'gog' | 'steam'
export function getBuildTarget() {
  return bridge()?.buildTarget || 'web';
}

export function isSteamBuild() {
  return getBuildTarget() === 'steam';
}

// Achievement IDs the game actually calls - register these same string IDs
// on the Steamworks partner site once you have an App ID, and the calls
// below start doing something real with zero changes needed here. See
// desktop/preload.js's unlockAchievement TODO for the other half of this.
export const ACHIEVEMENTS = {
  FIRST_BLOOD: 'ACH_FIRST_BLOOD', // first zombie kill
  LEVEL_1_COMPLETE: 'ACH_LEVEL_1_COMPLETE',
  CAMPAIGN_COMPLETE_CURE: 'ACH_CAMPAIGN_COMPLETE_CURE',
  CAMPAIGN_COMPLETE_SUCCUMB: 'ACH_CAMPAIGN_COMPLETE_SUCCUMB',
  ARSENAL_COMPLETE: 'ACH_ARSENAL_COMPLETE', // picked up every weapon at least once
  SURVIVE_10_WAVES: 'ACH_SURVIVE_10_WAVES',
};

export function unlockAchievement(achievementId) {
  bridge()?.unlockAchievement?.(achievementId);
}

// Stub for future Steam Cloud sync - intentionally does nothing yet. The
// existing localStorage save already IS the local save for every build;
// this just needs its body filled in (push `data` to
// SteamRemoteStorage.FileWrite) once Steamworks is wired into
// desktop/preload.js. Safe to call now from anywhere that saves.
export function syncSaveToCloud(data) {
  if (!isSteamBuild()) return;
  // TODO once Steamworks is wired in.
}
