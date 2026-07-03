// Canvas-drawn menu screens (main menu, settings, credits, pause, quit),
// all sharing the same video background. Buttons are drawn here and their
// rects exported so AppController can hit-test clicks with the same
// coordinates that were actually drawn.
import { GRAPHICS_STYLES, GRAPHICS_STYLE_ORDER } from './GraphicsFilter.js';

export { GRAPHICS_STYLES, GRAPHICS_STYLE_ORDER };

export function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function drawButton(ctx, rect, label, hovered, disabled = false) {
  ctx.save();
  if (disabled) ctx.globalAlpha = 0.35;
  ctx.fillStyle = hovered ? 'rgba(201,74,58,0.55)' : 'rgba(10,10,10,0.55)';
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.strokeStyle = hovered ? '#e8664f' : 'rgba(216,212,200,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

  ctx.fillStyle = '#e8e4d8';
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, rect.x + rect.width / 2, rect.y + rect.height / 2 + 2);
  ctx.restore();
}

export const MAIN_MENU_BUTTONS = {
  play: { x: 810, y: 560, width: 300, height: 64, label: 'PLAY' },
  settings: { x: 810, y: 640, width: 300, height: 64, label: 'SETTINGS' },
  credits: { x: 810, y: 720, width: 300, height: 64, label: 'CREDITS' },
  quit: { x: 810, y: 800, width: 300, height: 64, label: 'QUIT' },
};

export const MODE_SELECT_BUTTONS = {
  story: { x: 810, y: 560, width: 300, height: 64, label: 'STORY MODE' },
  survive: { x: 810, y: 640, width: 300, height: 64, label: 'SURVIVE IF YOU CAN' },
};

export const LEVEL_SELECT_BUTTONS = {
  continueGame: { x: 810, y: 560, width: 300, height: 64, label: 'CONTINUE' },
  restart: { x: 810, y: 640, width: 300, height: 64, label: 'START FROM LEVEL 1' },
};

export const PAUSE_BUTTONS = {
  resume: { x: 810, y: 460, width: 300, height: 60, label: 'RESUME' },
  settings: { x: 810, y: 532, width: 300, height: 60, label: 'SETTINGS' },
  // Campaign-only (see AppController._updatePause/drawPauseOverlay) - Survive
  // mode has no level to save, it just tracks a best-wave high score.
  save: { x: 810, y: 604, width: 300, height: 60, label: 'SAVE GAME' },
  mainMenu: { x: 810, y: 676, width: 300, height: 60, label: 'MAIN MENU' },
  cheats: { x: 810, y: 748, width: 300, height: 60, label: 'CHEATS' },
};

export const BACK_BUTTON = { x: 60, y: 60, width: 160, height: 52, label: 'BACK' };

// Labels are computed at draw time (e.g. "GOD MODE: ON") since they reflect
// live player state, but the rects themselves are fixed layout.
export const CHEAT_BUTTONS = {
  godMode: { x: 710, y: 380, width: 500, height: 56 },
  infiniteAmmo: { x: 710, y: 448, width: 500, height: 56 },
  unlockWeapons: { x: 710, y: 516, width: 500, height: 56, label: 'UNLOCK ALL WEAPONS' },
  healFull: { x: 710, y: 584, width: 500, height: 56, label: 'HEAL TO FULL' },
  killAllZombies: { x: 710, y: 652, width: 500, height: 56, label: 'KILL ALL ZOMBIES' },
};

export const GRAPHICS_BUTTON = { x: 660, y: 630, width: 280, height: 56, label: 'GRAPHICS' };
export const CONTROLS_BUTTON = { x: 980, y: 630, width: 280, height: 56, label: 'CONTROLS' };
export const MASTER_SETTINGS_BUTTON = { x: 810, y: 702, width: 300, height: 56, label: 'MASTER SETTINGS' };
export const MUSIC_TOGGLE_BUTTON = { x: 660, y: 400, width: 280, height: 56 };
export const SOUND_TOGGLE_BUTTON = { x: 980, y: 400, width: 280, height: 56 };

// Master Settings panel - day/night, flashlight, and (moved here from
// Graphics) bullet sprites. Systems not built yet (weather, night vision,
// water) deliberately have no button here - see MASTER_SETTINGS.md notes
// in the project summary for what's still to come, rather than shipping
// checkboxes that don't do anything.
export const DAY_NIGHT_BUTTON = { x: 660, y: 300, width: 280, height: 56 };
export const FLASHLIGHT_TOGGLE_BUTTON = { x: 980, y: 300, width: 280, height: 56 };

// Two rows of "buttons within buttons": display style (PC/16-bit/8-bit/
// GBA/GBC/GB) on top, quality tier below, laid out on the graphics panel.
export const STYLE_BUTTONS = {};
{
  const w = 280, h = 56, gap = 16;
  const totalW = GRAPHICS_STYLE_ORDER.length * w + (GRAPHICS_STYLE_ORDER.length - 1) * gap;
  let x = 960 - totalW / 2;
  for (const id of GRAPHICS_STYLE_ORDER) {
    STYLE_BUTTONS[id] = { x, y: 280, width: w, height: h };
    x += w + gap;
  }
}

export const QUALITY_BUTTONS = {
  low: { x: 660, y: 500, width: 180, height: 56 },
  medium: { x: 870, y: 500, width: 180, height: 56 },
  high: { x: 1080, y: 500, width: 180, height: 56 },
};

export const FULLSCREEN_BUTTON = { x: 660, y: 610, width: 280, height: 56 };
// Lives in the Master Settings panel now, not Graphics - see below.
export const BULLET_SPRITE_BUTTON = { x: 660, y: 380, width: 280, height: 56 };

const CREDITS_LINES = [
  { text: 'UNDEAD HOLLOW', size: 40, gap: 60 },
  { text: 'Created By', size: 20, gap: 30 },
  { text: 'Patrick Mallory (Doomguy)', size: 20, gap: 50 },

  { text: 'STUDIO', size: 26, gap: 50 },
  { text: 'IrishPaddyVR Galactic Dreams Entertainment Studios LLC', size: 20, gap: 60 },

  { text: 'CORE DEVELOPMENT TEAM', size: 26, gap: 50 },
  { text: 'Game Director — Patrick Mallory (Doomguy)', size: 20, gap: 34 },
  { text: 'Lead Game Designer — Patrick Mallory (Doomguy)', size: 20, gap: 34 },
  { text: 'Lead Gameplay Programmer — Patrick Mallory (Doomguy)', size: 20, gap: 34 },
  { text: 'Game Developer — Patrick Mallory (Doomguy)', size: 20, gap: 34 },
  { text: 'Game Tester — Patrick Mallory (Doomguy)', size: 20, gap: 34 },
  { text: 'Level Designer — Patrick Mallory (Doomguy)', size: 20, gap: 34 },
  { text: 'Environment Artist — Patrick Mallory (Doomguy)', size: 20, gap: 34 },
  { text: 'UI/UX Designer — Patrick Mallory (Doomguy)', size: 20, gap: 34 },
  { text: 'Technical Designer — Patrick Mallory (Doomguy)', size: 20, gap: 34 },
  { text: 'Sound Designer — Patrick Mallory (Doomguy)', size: 20, gap: 34 },
  { text: 'Producer — Patrick Mallory (Doomguy)', size: 20, gap: 34 },
  { text: 'Creative Director — Patrick Mallory (Doomguy)', size: 20, gap: 60 },

  { text: 'MUSIC & AUDIO', size: 26, gap: 50 },
  { text: 'Audio by Patrick Mallory (Doomguy)', size: 20, gap: 34 },
  { text: 'Music by Karl Casey @ White Bat Audio', size: 20, gap: 60 },

  { text: 'CONTRIBUTORS', size: 26, gap: 50 },
  { text: 'miss_slaughter', size: 20, gap: 34 },
  { text: 'edtheroach', size: 20, gap: 34 },
  { text: 'Death', size: 20, gap: 34 },
  { text: 'DP', size: 20, gap: 34 },
  { text: 'Mr. Running Target', size: 20, gap: 34 },
  { text: 'Walking Zero', size: 20, gap: 34 },
  { text: 'Indie', size: 20, gap: 34 },
  { text: 'SheaBay Cupcake', size: 20, gap: 34 },
  { text: 'Diana', size: 20, gap: 34 },
  { text: 'F.A.E.R.I.E', size: 20, gap: 34 },
  { text: 'Pasta', size: 20, gap: 34 },
  { text: 'Toxic Serenity', size: 20, gap: 34 },
  { text: 'Danny', size: 20, gap: 34 },
  { text: 'MITSUMYKE (Game Croft / QRAFT Gam)', size: 20, gap: 34 },
  { text: 'Matthew Medore', size: 20, gap: 60 },

  { text: 'SPECIAL THANKS', size: 26, gap: 50 },
  { text: 'Indie, edtheroach, miss_slaughter, Death, DP,', size: 20, gap: 34 },
  { text: 'Mr. Running Target, Walking Zero, SheaBay Cupcake,', size: 20, gap: 34 },
  { text: 'Diana, F.A.E.R.I.E, Pasta', size: 20, gap: 34 },
  { text: 'John Romero, John Carmack, Adrian Carmack', size: 20, gap: 34 },
  { text: 'Tom Hall, Tim Willits', size: 20, gap: 34 },
  { text: 'id Software, Bethesda, QuakeCon', size: 20, gap: 34 },
  { text: 'GOG and Steam', size: 20, gap: 34 },
  { text: 'Dubby.gg', size: 20, gap: 50 },
  { text: 'This game is a part of GOG and Steam.', size: 18, gap: 60 },

  { text: 'To my family and friends for their encouragement', size: 20, gap: 34 },
  { text: 'and support.', size: 20, gap: 40 },
  { text: 'To everyone who has supported my journey as an', size: 20, gap: 34 },
  { text: 'independent game developer.', size: 20, gap: 40 },
  { text: 'To the gaming community for inspiring me to', size: 20, gap: 34 },
  { text: 'continue creating games.', size: 20, gap: 60 },

  { text: 'TECHNOLOGY', size: 26, gap: 50 },
  { text: 'Game Engine — Custom (HTML5 Canvas, JavaScript)', size: 20, gap: 34 },
  { text: 'Programming Language — JavaScript (ES6+), Python', size: 20, gap: 34 },
  { text: 'Audio Tools — Audacity', size: 20, gap: 34 },
  { text: 'Version Control — Git', size: 20, gap: 34 },
  { text: 'AI Development Assistance — Patrick G Mallory (Doomguy)', size: 20, gap: 60 },

  { text: 'THIRD-PARTY ASSETS', size: 26, gap: 50 },
  { text: 'Zombie Apocalypse Tileset', size: 20, gap: 34 },
  { text: 'Happy Harvest 16x16 Farming Asset Pack (Guniism)', size: 20, gap: 34 },
  { text: 'Life Asset Pack', size: 20, gap: 60 },

  { text: 'VOICE CAST', size: 26, gap: 50 },
  { text: 'Zombie Sounds — Matthew Medore, SheaBay Cupcake', size: 20, gap: 34 },
  { text: 'Player Hit/Death Sounds — Patrick Mallory (Doomguy)', size: 20, gap: 60 },

  { text: 'MOTION CAPTURE', size: 26, gap: 50 },
  { text: 'Patrick Mallory (Doomguy)', size: 20, gap: 60 },

  { text: 'QUALITY ASSURANCE', size: 26, gap: 50 },
  { text: 'Lead QA — Patrick Mallory (Doomguy)', size: 20, gap: 34 },
  { text: 'Internal Testers — Patrick Mallory (Doomguy)', size: 20, gap: 34 },
  { text: 'External Testers — Patrick Mallory (Doomguy)', size: 20, gap: 34 },
  { text: 'Community Testers — Patrick Mallory (Doomguy)', size: 20, gap: 60 },

  { text: 'LOCALIZATION', size: 26, gap: 50 },
  { text: 'English — Patrick Mallory (Doomguy)', size: 20, gap: 34 },
  { text: 'Additional Languages — Patrick Mallory (Doomguy)', size: 20, gap: 34 },
  { text: 'Localization Testing — Patrick Mallory (Doomguy)', size: 20, gap: 60 },

  { text: 'ACCESSIBILITY', size: 26, gap: 50 },
  { text: 'Accessibility Review — Patrick Mallory (Doomguy)', size: 20, gap: 34 },
  { text: 'Accessibility Testing — Patrick Mallory (Doomguy)', size: 20, gap: 60 },

  { text: 'LEGAL', size: 26, gap: 50 },
  { text: 'Patrick Mallory (Doomguy)', size: 20, gap: 34 },
  { text: 'IrishPaddyVR Galactic Dreams Entertainment Studios LLC', size: 20, gap: 40 },
  { text: 'All trademarks are the property of their respective owners.', size: 18, gap: 34 },
  { text: 'This game may use third-party software distributed', size: 18, gap: 30 },
  { text: 'under their respective licenses.', size: 18, gap: 34 },
  { text: 'All rights reserved.', size: 18, gap: 60 },

  { text: 'COPYRIGHT', size: 26, gap: 50 },
  { text: '© 2026 IrishPaddyVR Galactic Dreams Entertainment Studios LLC', size: 18, gap: 40 },
  { text: 'Created and Developed by', size: 20, gap: 34 },
  { text: 'Patrick Mallory (Doomguy)', size: 20, gap: 60 },

  { text: 'THANK YOU', size: 32, gap: 60 },
  { text: 'Thank you for playing Undead Hollow.', size: 20, gap: 34 },
  { text: 'Your support makes independent game development', size: 20, gap: 34 },
  { text: 'possible.', size: 20, gap: 40 },
  { text: 'See you in the next adventure.', size: 20, gap: 60 },

  { text: 'THE END', size: 32, gap: 60 },
  { text: '', size: 20, gap: 200 },
];

const CREDITS_SCROLL_SPEED = 40; // px/sec
const CREDITS_TOTAL_HEIGHT = CREDITS_LINES.reduce((sum, l) => sum + l.gap, 0);

// The two level-39 endings - branching off the CURE HER / LET HER LIVE
// choice once The Fallen is downed. Same auto-scroll presentation as the
// credits screen, just a different story beat.
const ENDING_CURE_LINES = [
  { text: 'THE FALLEN', size: 40, gap: 70 },
  { text: '', size: 20, gap: 30 },
  { text: 'You lower the weapon meant to finish her.', size: 22, gap: 40 },
  { text: 'The sample in her pack - the one she died', size: 22, gap: 34 },
  { text: 'protecting - was the cure all along.', size: 22, gap: 50 },
  { text: 'You get it into her before the infection', size: 22, gap: 34 },
  { text: 'finishes what Area 51 started.', size: 22, gap: 50 },
  { text: 'She comes back. Not everything does.', size: 22, gap: 60 },
  { text: 'But she does.', size: 26, gap: 80 },
  { text: 'THE END', size: 32, gap: 60 },
  { text: '', size: 20, gap: 200 },
];

const ENDING_SUCCUMB_LINES = [
  { text: 'THE FALLEN', size: 40, gap: 70 },
  { text: '', size: 20, gap: 30 },
  { text: 'You can not do it.', size: 22, gap: 40 },
  { text: 'Not to her. Not after everything.', size: 22, gap: 50 },
  { text: 'You lower the weapon and hold her instead,', size: 22, gap: 34 },
  { text: 'the way you would have on the day you never', size: 22, gap: 34 },
  { text: "got to ask her the question you'd planned.", size: 22, gap: 50 },
  { text: 'Area 51 does not stay quiet for long.', size: 22, gap: 60 },
  { text: 'Some things are worth losing to.', size: 26, gap: 80 },
  { text: 'THE END', size: 32, gap: 60 },
  { text: '', size: 20, gap: 200 },
];
const ENDING_CURE_HEIGHT = ENDING_CURE_LINES.reduce((sum, l) => sum + l.gap, 0);
const ENDING_SUCCUMB_HEIGHT = ENDING_SUCCUMB_LINES.reduce((sum, l) => sum + l.gap, 0);

// The opening story crawl, shown once before a fresh campaign run starts
// (see AppController's story_intro state) - plain scrolling text over the
// main menu's video background, deliberately NOT styled like the Star Wars
// opening crawl (no perspective tilt, no gold color, no intro text) - same
// visual language as the credits/ending screens elsewhere in this file.
// Covers only the setup leading into Level 1 - what happens after is the
// game itself.
const STORY_INTRO_LINES = [
  { text: 'UNDEAD HOLLOW: OUTBREAK', size: 40, gap: 90 },
  { text: '', size: 20, gap: 20 },
  { text: 'Mason Reed grew up in Las Dunas, New Mexico, but', size: 22, gap: 34 },
  { text: 'built his life in Dallas, Texas, where he spent', size: 22, gap: 34 },
  { text: 'nearly nineteen years in the gaming industry - a', size: 22, gap: 34 },
  { text: 'designer, developer, and tester who shipped more', size: 22, gap: 34 },
  { text: 'titles than he could count.', size: 22, gap: 50 },

  { text: 'A lifelong fan of horror and zombie games, he always', size: 22, gap: 34 },
  { text: 'believed in being prepared for the unexpected.', size: 22, gap: 60 },

  { text: 'He met Jennifer Reed at a gaming convention in', size: 22, gap: 34 },
  { text: 'Dallas, where they were both working. She loved', size: 22, gap: 34 },
  { text: 'games as much as he did, along with fast cars,', size: 22, gap: 34 },
  { text: 'dinosaurs, and the discipline of military life. It', size: 22, gap: 34 },
  { text: 'was not long before they built a life together.', size: 22, gap: 60 },

  { text: 'Their daughter, Emma Reed, was born while Jennifer', size: 22, gap: 34 },
  { text: 'was stationed near Area 51. An evacuation scare not', size: 22, gap: 34 },
  { text: 'long after separated them for a while - but Mason', size: 22, gap: 34 },
  { text: 'got Emma out safely, and the two of them were', size: 22, gap: 34 },
  { text: 'reunited long before any of this began.', size: 22, gap: 60 },

  { text: 'Jennifer serves in the military. When she is', size: 22, gap: 34 },
  { text: 'reassigned back to New Mexico, she starts noticing', size: 22, gap: 34 },
  { text: 'something wrong - reports of people attacking each', size: 22, gap: 34 },
  { text: 'other, acting violently, displaying behavior no one', size: 22, gap: 34 },
  { text: 'can explain.', size: 22, gap: 60 },

  { text: 'She shows Mason a video from a birthday party', size: 22, gap: 34 },
  { text: 'gone wrong.', size: 22, gap: 50 },

  { text: 'A well-dressed stranger, mistaken at first for', size: 22, gap: 34 },
  { text: 'someone homeless, attacks a young woman celebrating', size: 22, gap: 34 },
  { text: 'her thirtieth birthday. He bites her. Within', size: 22, gap: 34 },
  { text: 'moments, she is one of them.', size: 22, gap: 50 },

  { text: 'The footage shows the party collapsing into chaos.', size: 22, gap: 34 },
  { text: 'One by one, the guests are attacked. The person', size: 22, gap: 34 },
  { text: 'recording is the last one seen before the footage', size: 22, gap: 34 },
  { text: 'cuts out.', size: 22, gap: 60 },

  { text: 'Mason has seen enough of these games to know how', size: 22, gap: 34 },
  { text: 'this story goes. He never thought he would end up', size: 22, gap: 34 },
  { text: 'living it.', size: 22, gap: 60 },

  { text: 'He travels with Jennifer back to New Mexico - his', size: 22, gap: 34 },
  { text: 'home - not knowing it will be the last quiet drive', size: 22, gap: 34 },
  { text: 'they take together for a long time.', size: 22, gap: 60 },

  { text: 'At the base, Jennifer is called away on a classified', size: 22, gap: 34 },
  { text: 'mission. Mason and Emma are left behind at a', size: 22, gap: 34 },
  { text: 'separate installation - self-sufficient, with', size: 22, gap: 34 },
  { text: 'farmland and livestock, built to survive if the', size: 22, gap: 34 },
  { text: 'world outside falls apart.', size: 22, gap: 60 },

  { text: 'He has no idea how soon he will need it to.', size: 26, gap: 90 },
  { text: '', size: 20, gap: 300 },
];
export const STORY_INTRO_TOTAL_HEIGHT = STORY_INTRO_LINES.reduce((sum, l) => sum + l.gap, 0);
const STORY_INTRO_SCROLL_SPEED = 38; // px/sec - slightly slower than credits, this one's meant to be read

export class MenuSystem {
  constructor() {
    this.creditsScroll = 0;
    this.endingScroll = 0;
    // Reset to 0 by AppController each time story_intro is (re-)entered -
    // unlike credits/endings, this one plays once through and then hands
    // off to gameplay, so it doesn't loop.
    this.storyIntroScroll = 0;
  }

  update(dt) {
    this.creditsScroll += dt * CREDITS_SCROLL_SPEED;
    if (this.creditsScroll > CREDITS_TOTAL_HEIGHT) this.creditsScroll = 0;

    this.endingScroll += dt * CREDITS_SCROLL_SPEED;
    this.storyIntroScroll += dt * STORY_INTRO_SCROLL_SPEED;
  }

  drawVideoBackground(ctx, videoEl) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 1920, 1080);
    if (videoEl && videoEl.readyState >= 2) {
      ctx.drawImage(videoEl, 0, 0, 1920, 1080);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, 1920, 1080);
  }

  drawTitle(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c94a3a';
    ctx.font = 'bold 84px monospace';
    ctx.fillText('UNDEAD HOLLOW', 960, 260);
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '32px monospace';
    ctx.fillText('OUTBREAK', 960, 310);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  drawMainMenu(ctx, videoEl, mouseScreen) {
    this.drawVideoBackground(ctx, videoEl);
    this.drawTitle(ctx);
    for (const btn of Object.values(MAIN_MENU_BUTTONS)) {
      drawButton(ctx, btn, btn.label, pointInRect(mouseScreen.x, mouseScreen.y, btn));
    }
  }

  drawSettings(ctx, videoEl, mouseScreen, settings) {
    this.drawVideoBackground(ctx, videoEl);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8e4d8';
    ctx.font = 'bold 48px monospace';
    ctx.fillText('SETTINGS', 960, 220);

    ctx.font = '24px monospace';
    ctx.fillText(`Master Volume: ${Math.round(settings.volume * 100)}%`, 960, 320);
    ctx.textAlign = 'left';
    ctx.restore();

    const barX = 760, barY = 350, barW = 400, barH = 20;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = '#c94a3a';
    ctx.fillRect(barX, barY, barW * settings.volume, barH);
    ctx.strokeStyle = 'rgba(216,212,200,0.6)';
    ctx.strokeRect(barX, barY, barW, barH);

    drawButton(ctx, MUSIC_TOGGLE_BUTTON, `MUSIC: ${settings.musicOn ? 'ON' : 'OFF'}`, pointInRect(mouseScreen.x, mouseScreen.y, MUSIC_TOGGLE_BUTTON));
    drawButton(ctx, SOUND_TOGGLE_BUTTON, `SOUND: ${settings.soundOn ? 'ON' : 'OFF'}`, pointInRect(mouseScreen.x, mouseScreen.y, SOUND_TOGGLE_BUTTON));

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(216,212,200,0.7)';
    ctx.font = '18px monospace';
    ctx.fillText('Click the bar to set volume', 960, 500);
    ctx.fillText('WASD move   Mouse aim   LMB use weapon   R reload', 960, 530);
    ctx.fillText('1-9 switch weapons   Shift sprint   Esc pause   ` cheats', 960, 560);
    ctx.textAlign = 'left';
    ctx.restore();

    drawButton(ctx, GRAPHICS_BUTTON, GRAPHICS_BUTTON.label, pointInRect(mouseScreen.x, mouseScreen.y, GRAPHICS_BUTTON));
    drawButton(ctx, CONTROLS_BUTTON, CONTROLS_BUTTON.label, pointInRect(mouseScreen.x, mouseScreen.y, CONTROLS_BUTTON));
    drawButton(ctx, MASTER_SETTINGS_BUTTON, MASTER_SETTINGS_BUTTON.label, pointInRect(mouseScreen.x, mouseScreen.y, MASTER_SETTINGS_BUTTON));
    drawButton(ctx, BACK_BUTTON, BACK_BUTTON.label, pointInRect(mouseScreen.x, mouseScreen.y, BACK_BUTTON));

    return { volumeBar: { x: barX, y: barY, width: barW, height: barH } };
  }

  drawGraphicsPanel(ctx, videoEl, mouseScreen, settings) {
    this.drawVideoBackground(ctx, videoEl);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8e4d8';
    ctx.font = 'bold 48px monospace';
    ctx.fillText('GRAPHICS', 960, 190);

    ctx.font = '20px monospace';
    ctx.fillStyle = 'rgba(216,212,200,0.75)';
    ctx.fillText('Display Style', 960, 250);
    ctx.fillText('Quality', 960, 470);
    ctx.textAlign = 'left';
    ctx.restore();

    for (const id of GRAPHICS_STYLE_ORDER) {
      const btn = STYLE_BUTTONS[id];
      const active = settings.graphicsStyle === id;
      drawButton(ctx, btn, GRAPHICS_STYLES[id].label, active || pointInRect(mouseScreen.x, mouseScreen.y, btn));
    }

    for (const tier of ['low', 'medium', 'high']) {
      const btn = QUALITY_BUTTONS[tier];
      const active = settings.quality === tier;
      drawButton(ctx, btn, tier.toUpperCase(), active || pointInRect(mouseScreen.x, mouseScreen.y, btn));
    }

    const fsLabel = `FULLSCREEN: ${settings.fullscreen ? 'ON' : 'OFF'}`;
    drawButton(ctx, FULLSCREEN_BUTTON, fsLabel, pointInRect(mouseScreen.x, mouseScreen.y, FULLSCREEN_BUTTON));

    drawButton(ctx, BACK_BUTTON, BACK_BUTTON.label, pointInRect(mouseScreen.x, mouseScreen.y, BACK_BUTTON));
  }

  // Day/night, flashlight, and bullet sprites (moved here from Graphics) -
  // same video background as every other settings screen. More toggles
  // (weather, night vision, water) land here once those systems exist.
  drawMasterSettingsPanel(ctx, videoEl, mouseScreen, settings) {
    this.drawVideoBackground(ctx, videoEl);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8e4d8';
    ctx.font = 'bold 48px monospace';
    ctx.fillText('MASTER SETTINGS', 960, 190);

    ctx.font = '20px monospace';
    ctx.fillStyle = 'rgba(216,212,200,0.75)';
    ctx.fillText('Environment', 960, 250);
    ctx.textAlign = 'left';
    ctx.restore();

    const dayNightLabel = `TIME OF DAY: ${settings.dayNight === 'night' ? 'NIGHT' : 'DAY'}`;
    drawButton(ctx, DAY_NIGHT_BUTTON, dayNightLabel, pointInRect(mouseScreen.x, mouseScreen.y, DAY_NIGHT_BUTTON));

    const flashlightLabel = `FLASHLIGHT: ${settings.flashlightEnabled ? 'ON' : 'OFF'}`;
    drawButton(ctx, FLASHLIGHT_TOGGLE_BUTTON, flashlightLabel, pointInRect(mouseScreen.x, mouseScreen.y, FLASHLIGHT_TOGGLE_BUTTON));

    const bulletLabel = `BULLET SPRITES: ${settings.realBulletSprites ? 'ON' : 'OFF'}`;
    drawButton(ctx, BULLET_SPRITE_BUTTON, bulletLabel, pointInRect(mouseScreen.x, mouseScreen.y, BULLET_SPRITE_BUTTON));

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(216,212,200,0.6)';
    ctx.font = '16px monospace';
    ctx.fillText('Press F (or the Y/Triangle button) in-game to switch the flashlight on/off at night.', 960, 460);
    ctx.textAlign = 'left';
    ctx.restore();

    drawButton(ctx, BACK_BUTTON, BACK_BUTTON.label, pointInRect(mouseScreen.x, mouseScreen.y, BACK_BUTTON));
  }

  // Two side-by-side reference columns - keyboard/mouse (the scheme this
  // build actually plays with) and controller (the intended Xbox-style
  // mapping) - purely informational, same video background as every other
  // menu screen.
  drawControlsPanel(ctx, videoEl, mouseScreen) {
    this.drawVideoBackground(ctx, videoEl);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8e4d8';
    ctx.font = 'bold 48px monospace';
    ctx.fillText('CONTROLS', 960, 170);
    ctx.restore();

    const columns = [
      {
        x: 560,
        title: 'KEYBOARD & MOUSE',
        rows: [
          ['Move', 'W A S D'],
          ['Aim', 'Mouse'],
          ['Fire / Attack', 'Left Mouse Button'],
          ['Reload', 'R'],
          ['Switch Weapon', '1 - 9'],
          ['Sprint', 'Shift'],
          ['Flashlight', 'F'],
          ['Pause', 'Esc'],
          ['Cheats Menu', '` (Backtick)'],
        ],
      },
      {
        x: 1360,
        title: 'CONTROLLER',
        rows: [
          ['Move', 'Left Stick'],
          ['Aim', 'Right Stick'],
          ['Fire / Attack', 'Right Trigger'],
          ['Reload', 'X Button'],
          ['Switch Weapon', 'Bumpers'],
          ['Sprint', 'Left Stick Click'],
          ['Flashlight', 'Y Button'],
          ['Pause', 'Start Button'],
          ['Cheats Menu', 'Back / Select'],
        ],
      },
    ];

    for (const col of columns) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#c94a3a';
      ctx.font = 'bold 26px monospace';
      ctx.fillText(col.title, col.x, 260);

      let y = 320;
      for (const [action, binding] of col.rows) {
        ctx.font = '20px monospace';
        ctx.fillStyle = 'rgba(216,212,200,0.75)';
        ctx.fillText(action, col.x, y);
        ctx.font = 'bold 20px monospace';
        ctx.fillStyle = '#e8e4d8';
        ctx.fillText(binding, col.x, y + 28);
        y += 74;
      }
      ctx.restore();
    }

    drawButton(ctx, BACK_BUTTON, BACK_BUTTON.label, pointInRect(mouseScreen.x, mouseScreen.y, BACK_BUTTON));
  }

  drawCredits(ctx, videoEl, mouseScreen) {
    this.drawVideoBackground(ctx, videoEl);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 140, 1920, 800);
    ctx.clip();

    let y = 1080 - this.creditsScroll;
    ctx.textAlign = 'center';
    for (const line of CREDITS_LINES) {
      if (y > 100 && y < 1000) {
        ctx.font = `${line.size}px monospace`;
        ctx.fillStyle = line.size >= 26 ? '#c94a3a' : '#e8e4d8';
        ctx.fillText(line.text, 960, y);
      }
      y += line.gap;
    }
    ctx.textAlign = 'left';
    ctx.restore();

    drawButton(ctx, BACK_BUTTON, BACK_BUTTON.label, pointInRect(mouseScreen.x, mouseScreen.y, BACK_BUTTON));
  }

  drawModeSelect(ctx, videoEl, mouseScreen) {
    this.drawVideoBackground(ctx, videoEl);
    this.drawTitle(ctx);
    for (const btn of Object.values(MODE_SELECT_BUTTONS)) {
      drawButton(ctx, btn, btn.label, pointInRect(mouseScreen.x, mouseScreen.y, btn));
    }
    drawButton(ctx, BACK_BUTTON, BACK_BUTTON.label, pointInRect(mouseScreen.x, mouseScreen.y, BACK_BUTTON));
  }

  drawLevelSelect(ctx, videoEl, mouseScreen, progress) {
    this.drawVideoBackground(ctx, videoEl);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8e4d8';
    ctx.font = 'bold 48px monospace';
    ctx.fillText('STORY MODE', 960, 300);
    ctx.font = '24px monospace';
    ctx.fillStyle = 'rgba(216,212,200,0.85)';
    ctx.fillText(
      progress.savedLevel ? `Saved game: Level ${progress.savedLevel} - ${progress.savedLevelName}` : 'No saved game yet.',
      960, 360
    );
    ctx.textAlign = 'left';
    ctx.restore();

    for (const [key, btn] of Object.entries(LEVEL_SELECT_BUTTONS)) {
      const disabled = key === 'continueGame' && !progress.savedLevel;
      drawButton(ctx, btn, btn.label, !disabled && pointInRect(mouseScreen.x, mouseScreen.y, btn), disabled);
    }
    drawButton(ctx, BACK_BUTTON, BACK_BUTTON.label, pointInRect(mouseScreen.x, mouseScreen.y, BACK_BUTTON));
  }

  drawEndingCure(ctx, videoEl, mouseScreen) {
    const scroll = this.endingScroll % (ENDING_CURE_HEIGHT + 400);
    this._drawScrollText(ctx, videoEl, mouseScreen, ENDING_CURE_LINES, scroll, 'MAIN MENU');
  }

  drawEndingSuccumb(ctx, videoEl, mouseScreen) {
    const scroll = this.endingScroll % (ENDING_SUCCUMB_HEIGHT + 400);
    this._drawScrollText(ctx, videoEl, mouseScreen, ENDING_SUCCUMB_LINES, scroll, 'MAIN MENU');
  }

  // The opening story crawl - same rendering as the endings below, but a
  // non-looping scroll value AppController tracks to know when it's
  // finished (see STORY_INTRO_TOTAL_HEIGHT) so it can hand off to gameplay.
  drawStoryIntro(ctx, videoEl, mouseScreen) {
    this._drawScrollText(ctx, videoEl, mouseScreen, STORY_INTRO_LINES, this.storyIntroScroll, 'SKIP');
  }

  // Plain vertical auto-scroll over the shared video background - deliberately
  // NOT a Star Wars-style crawl (no perspective, no gold text), just simple
  // centered text scrolling bottom-to-top. Shared by credits/endings/the
  // opening story crawl, which only differ in their lines and scroll value.
  _drawScrollText(ctx, videoEl, mouseScreen, lines, scroll, backLabel) {
    this.drawVideoBackground(ctx, videoEl);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 140, 1920, 800);
    ctx.clip();

    let y = 1080 - scroll;
    ctx.textAlign = 'center';
    for (const line of lines) {
      if (y > 100 && y < 1000) {
        ctx.font = `${line.size}px monospace`;
        ctx.fillStyle = line.size >= 32 ? '#c94a3a' : '#e8e4d8';
        ctx.fillText(line.text, 960, y);
      }
      y += line.gap;
    }
    ctx.textAlign = 'left';
    ctx.restore();

    drawButton(ctx, BACK_BUTTON, backLabel, pointInRect(mouseScreen.x, mouseScreen.y, BACK_BUTTON));
  }

  drawPauseOverlay(ctx, mouseScreen, isCampaign) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, 1920, 1080);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8e4d8';
    ctx.font = 'bold 56px monospace';
    ctx.fillText('PAUSED', 960, 380);
    ctx.textAlign = 'left';
    ctx.restore();

    for (const [key, btn] of Object.entries(PAUSE_BUTTONS)) {
      if (key === 'save' && !isCampaign) continue; // no level to save in Survive mode
      drawButton(ctx, btn, btn.label, pointInRect(mouseScreen.x, mouseScreen.y, btn));
    }
  }

  drawCheatsPanel(ctx, mouseScreen, player) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, 1920, 1080);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8e4d8';
    ctx.font = 'bold 48px monospace';
    ctx.fillText('CHEATS', 960, 300);
    ctx.font = '18px monospace';
    ctx.fillStyle = 'rgba(216,212,200,0.7)';
    ctx.fillText('Typed codes also work anywhere in-game: IDDQD (god mode), IDKFA (all weapons + ammo)', 960, 340);
    ctx.textAlign = 'left';
    ctx.restore();

    const godLabel = `GOD MODE: ${player.godMode ? 'ON' : 'OFF'}`;
    const ammoLabel = `INFINITE AMMO: ${player.infiniteAmmo ? 'ON' : 'OFF'}`;

    drawButton(ctx, CHEAT_BUTTONS.godMode, godLabel, pointInRect(mouseScreen.x, mouseScreen.y, CHEAT_BUTTONS.godMode));
    drawButton(ctx, CHEAT_BUTTONS.infiniteAmmo, ammoLabel, pointInRect(mouseScreen.x, mouseScreen.y, CHEAT_BUTTONS.infiniteAmmo));
    drawButton(ctx, CHEAT_BUTTONS.unlockWeapons, CHEAT_BUTTONS.unlockWeapons.label, pointInRect(mouseScreen.x, mouseScreen.y, CHEAT_BUTTONS.unlockWeapons));
    drawButton(ctx, CHEAT_BUTTONS.healFull, CHEAT_BUTTONS.healFull.label, pointInRect(mouseScreen.x, mouseScreen.y, CHEAT_BUTTONS.healFull));
    drawButton(ctx, CHEAT_BUTTONS.killAllZombies, CHEAT_BUTTONS.killAllZombies.label, pointInRect(mouseScreen.x, mouseScreen.y, CHEAT_BUTTONS.killAllZombies));
    drawButton(ctx, BACK_BUTTON, BACK_BUTTON.label, pointInRect(mouseScreen.x, mouseScreen.y, BACK_BUTTON));
  }

  drawQuitScreen(ctx) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 1920, 1080);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c94a3a';
    ctx.font = 'bold 56px monospace';
    ctx.fillText('THANK YOU FOR PLAYING', 960, 500);
    ctx.fillStyle = 'rgba(216,212,200,0.8)';
    ctx.font = '22px monospace';
    ctx.fillText('You may now close this tab.', 960, 560);
    ctx.textAlign = 'left';
    ctx.restore();
  }
}
