// electron-builder config for the GOG DRM-free build - GOG distributes a
// plain unpacked folder (they add their own installer wrapper on their
// end), so the "dir" target - just the raw win-unpacked/ folder containing
// the .exe and all resources - is exactly what they want. No auto-update
// checks, no online requirement of any kind. See package.json's
// build:gog script.
module.exports = {
  appId: 'com.irishpaddyvr.undeadhollow.gog',
  productName: 'Undead Hollow',
  directories: {
    output: 'dist/gog',
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
