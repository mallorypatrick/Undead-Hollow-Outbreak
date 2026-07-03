// electron-builder config for the Steam build. Steam doesn't use an
// installer either - you upload a folder of files to SteamPipe (Steam's
// content build tool) and Steam's own client handles installing/updating
// it, so this also uses the "dir" target, same idea as GOG's config.
//
// This does NOT yet include the actual Steamworks SDK - that requires a
// Steamworks Partner account and an approved App ID before Valve will even
// let you download the SDK. Once you have both:
//   1. `npm install steamworks.js` (a maintained native Node binding)
//   2. Wire real SteamUserStats/SteamRemoteStorage calls into
//      desktop/preload.js's unlockAchievement() stub (see the TODO there)
//   3. Add `extraResources` here for steam_appid.txt + the Steamworks
//      redistributable DLLs steamworks.js needs alongside the .exe
// src/platform/Platform.js already calls into that stub at the right
// moments (level complete, game complete, etc.) - nothing in the game
// code itself needs to change when you do this.
module.exports = {
  appId: 'com.irishpaddyvr.undeadhollow.steam',
  productName: 'Undead Hollow',
  directories: {
    output: 'dist/steam',
  },
  files: [
    'desktop/**/*',
    'src/**/*',
    'assets/**/*',
    'index.html',
    'styles.css',
    '!desktop/build/**',
  ],
  win: {
    target: 'dir',
  },
};
