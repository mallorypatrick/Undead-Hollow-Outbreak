// electron-builder config for the "send it to friends" build - a single
// portable .exe, no installer, no admin rights needed, just double-click
// and play. See package.json's build:windows script.
module.exports = {
  appId: 'com.irishpaddyvr.undeadhollow',
  productName: 'Undead Hollow',
  directories: {
    output: 'dist/windows',
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
    target: 'portable',
  },
};
