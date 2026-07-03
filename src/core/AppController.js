import { Renderer, INTERNAL_WIDTH, INTERNAL_HEIGHT } from './Renderer.js';
import { Input } from './Input.js';
import { Game } from './Game.js';
import {
  MenuSystem, MAIN_MENU_BUTTONS, PAUSE_BUTTONS, BACK_BUTTON, CHEAT_BUTTONS,
  GRAPHICS_BUTTON, CONTROLS_BUTTON, MASTER_SETTINGS_BUTTON, DAY_NIGHT_BUTTON, FLASHLIGHT_TOGGLE_BUTTON,
  STYLE_BUTTONS, QUALITY_BUTTONS, FULLSCREEN_BUTTON, BULLET_SPRITE_BUTTON, GRAPHICS_STYLE_ORDER,
  MODE_SELECT_BUTTONS, LEVEL_SELECT_BUTTONS, MUSIC_TOGGLE_BUTTON, SOUND_TOGGLE_BUTTON, STORY_INTRO_TOTAL_HEIGHT,
  pointInRect,
} from '../systems/MenuSystem.js';
import { getLevelConfig } from '../config/LevelConfig.js';
import { GraphicsFilter } from '../systems/GraphicsFilter.js';
import { setMasterVolume, startMenuMusic, stopMenuMusic, setSoundEnabled, setMusicEnabled } from '../systems/AudioManager.js';
import { Sprites } from '../assets/ProceduralSprites.js';
import { WEAPON_IDS } from '../config/WeaponConfig.js';
import { setUseRealBulletSprites } from '../entities/Bullet.js';
import { unlockAchievement, ACHIEVEMENTS } from '../platform/Platform.js';

// Typed cheat codes work anywhere during gameplay, classic-FPS style.
const CHEAT_CODES = ['IDDQD', 'IDKFA'];
const KEYCODE_TO_LETTER = {};
for (let i = 65; i <= 90; i++) {
  const letter = String.fromCharCode(i);
  KEYCODE_TO_LETTER[`Key${letter}`] = letter;
}

export class AppController {
  constructor(canvas, videoEl) {
    // The real, visible canvas - always native resolution, CSS-scaled to
    // fit the window. Nothing draws to it directly except the final,
    // possibly-filtered blit at the end of each frame.
    this.renderer = new Renderer(canvas);
    this.input = new Input(canvas);
    this.video = videoEl;
    this.menu = new MenuSystem();
    this.graphicsFilter = new GraphicsFilter(INTERNAL_WIDTH, INTERNAL_HEIGHT);

    // Everything (menu and gameplay alike) is drawn at the full 1920x1080
    // internal resolution into this offscreen buffer first. The graphics
    // style filter (PC/16-bit/8-bit/Game Boy/...) only ever touches the
    // blit from this buffer to the real canvas, so coordinates everywhere
    // else in the game never change based on display settings.
    this.sceneCanvas = document.createElement('canvas');
    this.sceneCanvas.width = INTERNAL_WIDTH;
    this.sceneCanvas.height = INTERNAL_HEIGHT;
    this.sceneCtx = this.sceneCanvas.getContext('2d');
    this.sceneRenderer = {
      ctx: this.sceneCtx,
      clear: (color = '#0a0a0a') => {
        this.sceneCtx.fillStyle = color;
        this.sceneCtx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);
      },
    };

    // Separate transparent buffer for the night-overlay/flashlight cone (see
    // _drawNightOverlay). Canvas 2D has no real layer stack - if the darkness
    // were painted directly onto sceneCtx, 'destination-out' would only erase
    // toward transparency without ever restoring the bright scene pixels it
    // already overwrote. Building it on its own blank canvas each frame and
    // then drawImage-ing the result onto sceneCtx is what actually lets the
    // untouched bright scene show back through the erased cone.
    this._nightOverlayCanvas = document.createElement('canvas');
    this._nightOverlayCanvas.width = INTERNAL_WIDTH;
    this._nightOverlayCanvas.height = INTERNAL_HEIGHT;
    this._nightOverlayCtx = this._nightOverlayCanvas.getContext('2d');

    this.state = 'main_menu';
    this._returnState = 'main_menu'; // where BACK/settings-from-pause should return to
    this.game = null;

    // Defaults, then anything actually saved from a previous session
    // overwrites them - see _saveSettings/_loadSettings. Doing it this way
    // (rather than just using whatever's in storage directly) means a
    // brand-new setting added later always has a sane default even for
    // players with an older save blob that predates it.
    this.settings = {
      volume: 0.7, graphicsStyle: 'pc', quality: 'high', fullscreen: false, realBulletSprites: false,
      musicOn: true, soundOn: true, dayNight: 'day', flashlightEnabled: true,
    };
    Object.assign(this.settings, this._loadSettings());
    this._draggingVolume = false;
    this._cheatBuffer = '';

    // Simplest viable "save" given there's no backend - a single slot
    // remembering the last level actively played, not a monotonically-
    // increasing "furthest ever reached" high-water mark (that older model
    // could leave CONTINUE jumping back to a much higher level than the
    // player's current run, e.g. after deliberately restarting from level 1
    // - a real reported bug). null means no save exists yet. Auto-saves the
    // instant a run starts or advances a level (see the 'playing' case
    // below) and via the explicit SAVE GAME pause-menu button (_saveGame).
    this.progress = { savedLevel: Number(localStorage.getItem('uho_save_level')) || null };
    // Tracks which level the save slot was last written for, so the
    // 'playing' case only re-saves when currentLevel actually changes
    // rather than every frame. Reset to null by _startNewGame so a fresh
    // run's starting level always triggers an immediate save.
    this._lastAutoSavedLevel = null;

    this._lastTime = 0;
    this._loop = this._loop.bind(this);

    // requestFullscreen() must be called synchronously inside a real user
    // gesture handler or browsers silently ignore it - by the time the
    // polled Input/update loop notices a click (a requestAnimationFrame
    // tick later), that gesture context can already be gone. A raw
    // mousedown listener sidesteps that entirely for just this one button.
    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || this.state !== 'graphics') return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      if (pointInRect(x, y, FULLSCREEN_BUTTON)) this._toggleFullscreen();
    });
    document.addEventListener('fullscreenchange', () => {
      this.settings.fullscreen = !!document.fullscreenElement;
      this._saveSettings();
    });
  }

  start() {
    this.video.play().catch(() => { /* needs a user gesture on some browsers - Play button provides one */ });
    requestAnimationFrame(this._loop);
  }

  _loop(timestamp) {
    const dt = this._lastTime ? Math.min((timestamp - this._lastTime) / 1000, 0.05) : 0;
    this._lastTime = timestamp;
    this.update(dt);
    this.render();
    requestAnimationFrame(this._loop);
  }

  update(dt) {
    // Polled once here, before anything below reads input this frame -
    // the Gamepad API has no push events for stick/trigger movement, only
    // connect/disconnect, so it has to be actively read every frame. See
    // Input.pollGamepad.
    this.input.pollGamepad();

    // Menu music plays on every screen except live gameplay - the pause
    // overlay gets its own distinct, more intense track (see
    // AudioManager's MUSIC_TRACKS) rather than the regular menu theme,
    // everything else (including the death screen, which is still
    // state === 'playing' but with the player dead) uses the menu theme.
    if (this.state === 'playing' && !this.game.player.isDead) {
      stopMenuMusic();
    } else if (this.state === 'paused') {
      startMenuMusic('pause');
    } else {
      startMenuMusic('menu');
    }

    switch (this.state) {
      case 'main_menu':
        this.menu.update(dt);
        this._updateMainMenu();
        this.input.endFrame();
        break;
      case 'mode_select':
        this.menu.update(dt);
        this._updateModeSelect();
        this.input.endFrame();
        break;
      case 'level_select':
        this.menu.update(dt);
        this._updateLevelSelect();
        this.input.endFrame();
        break;
      case 'story_intro':
        this.menu.update(dt);
        this._updateStoryIntro();
        this.input.endFrame();
        break;
      case 'settings':
        this._updateSettings();
        this.input.endFrame();
        break;
      case 'graphics':
        this._updateGraphicsPanel();
        this.input.endFrame();
        break;
      case 'controls':
        this._updateControlsPanel();
        this.input.endFrame();
        break;
      case 'master_settings':
        this._updateMasterSettingsPanel();
        this.input.endFrame();
        break;
      case 'credits':
        this.menu.update(dt);
        this._updateCredits();
        this.input.endFrame();
        break;
      case 'ending_cure':
        this.menu.update(dt);
        this._updateEndingScreen();
        this.input.endFrame();
        break;
      case 'ending_succumb':
        this.menu.update(dt);
        this._updateEndingScreen();
        this.input.endFrame();
        break;
      case 'cheats':
        this._updateCheatsPanel();
        this.input.endFrame();
        break;
      case 'quit':
        this.input.endFrame();
        break;
      case 'playing': {
        // Game.update() clears justPressed state via its own internal
        // endFrame() call, so anything reading this frame's edge-triggered
        // input (cheat codes, the pause key) must run before it.
        this._checkCheatCodes();
        const pausePressed = this.input.wasJustPressed('Escape') || this.input.wasJustPressed('GamepadPause');
        this.game.update(dt, this.settings.dayNight === 'night');

        // Auto-save the instant a campaign run starts and every time it
        // advances to a new level - _lastAutoSavedLevel starts null on a
        // fresh run (see _startNewGame) so even level 1 saves right away.
        if (this.game.runMode === 'campaign' && this.game.currentLevel !== this._lastAutoSavedLevel) {
          this._saveGame(this.game.currentLevel);
        }

        if (pausePressed) {
          this.state = 'paused';
        } else if (this.game.wantsMainMenu) {
          this.game = null;
          this.state = 'main_menu';
        } else if (this.game.pendingEnding) {
          const ending = this.game.pendingEnding;
          unlockAchievement(ending === 'cure' ? ACHIEVEMENTS.CAMPAIGN_COMPLETE_CURE : ACHIEVEMENTS.CAMPAIGN_COMPLETE_SUCCUMB);
          this.game = null;
          this.state = ending === 'cure' ? 'ending_cure' : 'ending_succumb';
        }
        break;
      }
      case 'paused':
        this._updatePause();
        this.input.endFrame();
        break;
      default:
        this.input.endFrame();
    }
  }

  render() {
    const ctx = this.sceneCtx;
    switch (this.state) {
      case 'main_menu':
        this.menu.drawMainMenu(ctx, this.video, this.input.mouseScreen);
        break;
      case 'mode_select':
        this.menu.drawModeSelect(ctx, this.video, this.input.mouseScreen);
        break;
      case 'level_select': {
        const savedLevelName = this.progress.savedLevel ? getLevelConfig(this.progress.savedLevel).displayName : null;
        this.menu.drawLevelSelect(ctx, this.video, this.input.mouseScreen, { savedLevel: this.progress.savedLevel, savedLevelName });
        break;
      }
      case 'story_intro':
        this.menu.drawStoryIntro(ctx, this.video, this.input.mouseScreen);
        break;
      case 'ending_cure':
        this.menu.drawEndingCure(ctx, this.video, this.input.mouseScreen);
        break;
      case 'ending_succumb':
        this.menu.drawEndingSuccumb(ctx, this.video, this.input.mouseScreen);
        break;
      case 'settings':
        this.menu.drawSettings(ctx, this.video, this.input.mouseScreen, this.settings);
        break;
      case 'graphics':
        this.menu.drawGraphicsPanel(ctx, this.video, this.input.mouseScreen, this.settings);
        break;
      case 'controls':
        this.menu.drawControlsPanel(ctx, this.video, this.input.mouseScreen);
        break;
      case 'master_settings':
        this.menu.drawMasterSettingsPanel(ctx, this.video, this.input.mouseScreen, this.settings);
        break;
      case 'credits':
        this.menu.drawCredits(ctx, this.video, this.input.mouseScreen);
        break;
      case 'cheats':
        this.game.render();
        this._drawNightOverlay(ctx);
        this.menu.drawCheatsPanel(ctx, this.input.mouseScreen, this.game.player);
        break;
      case 'quit':
        this.menu.drawQuitScreen(ctx);
        break;
      case 'playing':
        this.game.render();
        this._drawNightOverlay(ctx);
        break;
      case 'paused':
        this.game.render();
        this._drawNightOverlay(ctx);
        this.menu.drawPauseOverlay(ctx, this.input.mouseScreen, this.game.runMode === 'campaign');
        break;
    }

    // Gameplay draws its own aiming crosshair inside Game.render(), but the
    // death/restart screen is really a menu interaction (clicking a button)
    // even though it renders while state is still 'playing' - it needs the
    // pointer cursor too, same as every other menu-ish screen.
    const onDeathScreen = this.state === 'playing' && this.game && this.game.player.isDead;
    if (this.state !== 'playing' || onDeathScreen) {
      const m = this.input.mouseScreen;
      ctx.drawImage(Sprites.zombieHandCursor, m.x, m.y, 40, 40);
    }

    // Final blit: the only step where the selected display style can ever
    // change what's on screen. Menu/game code above is always unaffected.
    this.graphicsFilter.apply(this.sceneCanvas, this.renderer.ctx, this.settings.graphicsStyle);
  }

  // --- main menu ---

  _updateMainMenu() {
    if (!this.input.wasMouseJustPressed()) return;
    const m = this.input.mouseScreen;
    if (pointInRect(m.x, m.y, MAIN_MENU_BUTTONS.play)) {
      this.state = 'mode_select';
    } else if (pointInRect(m.x, m.y, MAIN_MENU_BUTTONS.settings)) {
      this._returnState = 'main_menu';
      this.state = 'settings';
    } else if (pointInRect(m.x, m.y, MAIN_MENU_BUTTONS.credits)) {
      this._returnState = 'main_menu';
      this.state = 'credits';
    } else if (pointInRect(m.x, m.y, MAIN_MENU_BUTTONS.quit)) {
      this.state = 'quit';
    }
  }

  // --- mode select (Story vs Survive If You Can) ---

  _updateModeSelect() {
    if (!this.input.wasMouseJustPressed()) return;
    const m = this.input.mouseScreen;
    if (pointInRect(m.x, m.y, MODE_SELECT_BUTTONS.story)) {
      this.state = 'level_select';
    } else if (pointInRect(m.x, m.y, MODE_SELECT_BUTTONS.survive)) {
      this._startNewGame('survive', 1);
    } else if (pointInRect(m.x, m.y, BACK_BUTTON)) {
      this.state = 'main_menu';
    }
  }

  // --- level select (Story mode entry point) ---

  _updateLevelSelect() {
    if (!this.input.wasMouseJustPressed()) return;
    const m = this.input.mouseScreen;
    // CONTINUE resumes the save slot directly, never replaying the intro -
    // that's reserved for a deliberate restart (below), regardless of
    // which level happens to be saved.
    if (this.progress.savedLevel && pointInRect(m.x, m.y, LEVEL_SELECT_BUTTONS.continueGame)) {
      this._startNewGame('campaign', this.progress.savedLevel);
    } else if (pointInRect(m.x, m.y, LEVEL_SELECT_BUTTONS.restart)) {
      this._enterStoryIntro();
    } else if (pointInRect(m.x, m.y, BACK_BUTTON)) {
      this.state = 'mode_select';
    }
  }

  // --- opening story crawl (plays once before a fresh campaign run) ---

  _enterStoryIntro() {
    this.menu.storyIntroScroll = 0;
    this.state = 'story_intro';
  }

  _updateStoryIntro() {
    const skipClicked = this.input.wasMouseJustPressed() && pointInRect(this.input.mouseScreen.x, this.input.mouseScreen.y, BACK_BUTTON);
    const finished = this.menu.storyIntroScroll >= STORY_INTRO_TOTAL_HEIGHT;
    const skipKeyPressed = this.input.wasJustPressed('Escape') || this.input.wasJustPressed('Space') || this.input.wasJustPressed('Enter') || this.input.wasJustPressed('GamepadPause');
    if (skipClicked || finished || skipKeyPressed) {
      this._startNewGame('campaign', 1);
    }
  }

  // --- level-39 branching endings ---

  _updateEndingScreen() {
    if (this.input.wasMouseJustPressed() && pointInRect(this.input.mouseScreen.x, this.input.mouseScreen.y, BACK_BUTTON)) {
      this.state = 'main_menu';
    }
  }

  _startNewGame(runMode = 'campaign', levelId = 1) {
    this.game = new Game(this.sceneRenderer, this.input, { runMode, levelId });
    this.game.particles.setQualityTier(this.settings.quality);
    window.__game = this.game; // dev-only debug hook, inspect via preview_eval
    this.state = 'playing';
    // null (not levelId) so the 'playing' case's auto-save always fires on
    // this run's very first frame, even if levelId happens to match
    // whatever was last saved.
    this._lastAutoSavedLevel = null;
  }

  // Writes the save slot - called automatically on run-start/level-advance
  // (see the 'playing' case) and by the pause menu's explicit SAVE GAME
  // button (_updatePause). `notify`, when true, pushes an in-game
  // confirmation - the silent auto-save doesn't need one every level.
  _saveGame(level, notify = false) {
    this._lastAutoSavedLevel = level;
    this.progress.savedLevel = level;
    localStorage.setItem('uho_save_level', String(level));
    if (notify) this.game.ui.pushNotification('Game saved.');
  }

  // --- day/night + flashlight (Master Settings) ---
  // Screen-space post-process over the already-rendered scene, same idea as
  // the graphics style filter below - Game.js and everything in it stays
  // completely unaware this exists. A plain Canvas 2D radial gradient +
  // 'destination-out' compositing cuts a soft cone of visibility out of a
  // dark overlay, which reads as a flashlight beam without needing any
  // real lighting/shader pipeline.
  _drawNightOverlay(ctx) {
    if (this.settings.dayNight !== 'night' || !this.game) return;
    const player = this.game.player;
    const screen = this.game.camera.worldToScreen(player.x, player.y);

    // Built on a blank transparent buffer, not directly on the scene, so the
    // flashlight cone erases down to nothing and lets the already-rendered
    // bright scene show through when composited below - see the buffer's
    // creation comment in the constructor for why that separation matters.
    const oCtx = this._nightOverlayCtx;
    oCtx.clearRect(0, 0, 1920, 1080);
    oCtx.fillStyle = 'rgba(6, 8, 18, 0.72)';
    oCtx.fillRect(0, 0, 1920, 1080);

    if (this.settings.flashlightEnabled && player.flashlightOn && !player.isDead) {
      const length = 650;
      const spread = Math.PI / 7; // ~25 degrees each side of the aim angle

      oCtx.globalCompositeOperation = 'destination-out';
      const cone = oCtx.createRadialGradient(screen.x, screen.y, 15, screen.x, screen.y, length);
      cone.addColorStop(0, 'rgba(255,255,255,1)');
      cone.addColorStop(0.7, 'rgba(255,255,255,0.85)');
      cone.addColorStop(1, 'rgba(255,255,255,0)');
      oCtx.fillStyle = cone;
      oCtx.beginPath();
      oCtx.moveTo(screen.x, screen.y);
      oCtx.arc(screen.x, screen.y, length, player.angle - spread, player.angle + spread);
      oCtx.closePath();
      oCtx.fill();

      // Small always-lit halo around the player so they're not standing in
      // pitch black just because they're facing away from their own beam.
      const halo = oCtx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, 90);
      halo.addColorStop(0, 'rgba(255,255,255,0.5)');
      halo.addColorStop(1, 'rgba(255,255,255,0)');
      oCtx.fillStyle = halo;
      oCtx.beginPath();
      oCtx.arc(screen.x, screen.y, 90, 0, Math.PI * 2);
      oCtx.fill();
      oCtx.globalCompositeOperation = 'source-over';
    }

    ctx.drawImage(this._nightOverlayCanvas, 0, 0);
  }

  // --- settings persistence ---
  // Every settings mutation below calls _saveSettings() right after, so
  // whatever's active is restored automatically next launch - no explicit
  // "save settings" button needed.

  _loadSettings() {
    try {
      const raw = localStorage.getItem('uho_settings');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {}; // corrupt/foreign value in storage - fall back to defaults rather than crash
    }
  }

  _saveSettings() {
    localStorage.setItem('uho_settings', JSON.stringify(this.settings));
  }

  // --- settings (volume slider) ---

  _updateSettings() {
    const m = this.input.mouseScreen;
    const barRect = { x: 760, y: 370, width: 400, height: 20 };

    if (this.input.mouseDown && (this._draggingVolume || pointInRect(m.x, m.y, barRect))) {
      this._draggingVolume = true;
      const pct = Math.max(0, Math.min(1, (m.x - barRect.x) / barRect.width));
      this.settings.volume = pct;
      setMasterVolume(pct);
    }
    if (!this.input.mouseDown) {
      if (this._draggingVolume) this._saveSettings(); // drag just ended - one write, not one per frame
      this._draggingVolume = false;
    }

    if (!this.input.wasMouseJustPressed()) return;
    if (pointInRect(m.x, m.y, MUSIC_TOGGLE_BUTTON)) {
      this.settings.musicOn = !this.settings.musicOn;
      setMusicEnabled(this.settings.musicOn);
      this._saveSettings();
    } else if (pointInRect(m.x, m.y, SOUND_TOGGLE_BUTTON)) {
      this.settings.soundOn = !this.settings.soundOn;
      setSoundEnabled(this.settings.soundOn);
      this._saveSettings();
    } else if (pointInRect(m.x, m.y, GRAPHICS_BUTTON)) {
      // Graphics/Controls/Master Settings are nested one level inside
      // Settings, so they always come back here - Settings itself
      // remembers whether IT came from the main menu or the pause overlay.
      this.state = 'graphics';
    } else if (pointInRect(m.x, m.y, CONTROLS_BUTTON)) {
      this.state = 'controls';
    } else if (pointInRect(m.x, m.y, MASTER_SETTINGS_BUTTON)) {
      this.state = 'master_settings';
    } else if (pointInRect(m.x, m.y, BACK_BUTTON)) {
      this.state = this._returnState;
    }
  }

  // --- controls reference (purely informational, no settings to change) ---

  _updateControlsPanel() {
    if (this.input.wasMouseJustPressed() && pointInRect(this.input.mouseScreen.x, this.input.mouseScreen.y, BACK_BUTTON)) {
      this.state = 'settings';
    }
  }

  // --- master settings (day/night, flashlight, bullet sprites) ---

  _updateMasterSettingsPanel() {
    if (!this.input.wasMouseJustPressed()) return;
    const m = this.input.mouseScreen;
    if (pointInRect(m.x, m.y, DAY_NIGHT_BUTTON)) {
      this.settings.dayNight = this.settings.dayNight === 'night' ? 'day' : 'night';
      this._saveSettings();
    } else if (pointInRect(m.x, m.y, FLASHLIGHT_TOGGLE_BUTTON)) {
      this.settings.flashlightEnabled = !this.settings.flashlightEnabled;
      // Turning the feature off entirely should also turn off a
      // currently-lit flashlight rather than leaving it stuck on.
      if (!this.settings.flashlightEnabled && this.game) this.game.player.flashlightOn = false;
      this._saveSettings();
    } else if (pointInRect(m.x, m.y, BULLET_SPRITE_BUTTON)) {
      this.settings.realBulletSprites = !this.settings.realBulletSprites;
      setUseRealBulletSprites(this.settings.realBulletSprites);
      this._saveSettings();
    } else if (pointInRect(m.x, m.y, BACK_BUTTON)) {
      this.state = 'settings';
    }
  }

  // --- graphics options ---

  _updateGraphicsPanel() {
    if (!this.input.wasMouseJustPressed()) return;
    const m = this.input.mouseScreen;

    for (const id of GRAPHICS_STYLE_ORDER) {
      if (pointInRect(m.x, m.y, STYLE_BUTTONS[id])) {
        this.settings.graphicsStyle = id;
        this._saveSettings();
        return;
      }
    }
    for (const tier of ['low', 'medium', 'high']) {
      if (pointInRect(m.x, m.y, QUALITY_BUTTONS[tier])) {
        this.settings.quality = tier;
        if (this.game) this.game.particles.setQualityTier(tier);
        this._saveSettings();
        return;
      }
    }
    if (pointInRect(m.x, m.y, BACK_BUTTON)) {
      this.state = 'settings';
    }
    // Fullscreen is handled by a raw mousedown listener in the constructor,
    // not here - requestFullscreen() needs to run synchronously inside the
    // actual native click event, which this polled update loop can't
    // guarantee (see the listener for why).
  }

  _toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => { /* denied - settings.fullscreen stays synced via the fullscreenchange listener */ });
    } else {
      document.exitFullscreen?.();
    }
  }

  // --- credits ---

  _updateCredits() {
    if (this.input.wasMouseJustPressed() && pointInRect(this.input.mouseScreen.x, this.input.mouseScreen.y, BACK_BUTTON)) {
      this.state = this._returnState;
    }
  }

  // --- pause overlay ---

  _updatePause() {
    if (this.input.wasJustPressed('Escape') || this.input.wasJustPressed('GamepadPause')) {
      this.state = 'playing';
      return;
    }
    if (!this.input.wasMouseJustPressed()) return;
    const m = this.input.mouseScreen;
    if (pointInRect(m.x, m.y, PAUSE_BUTTONS.resume)) {
      this.state = 'playing';
    } else if (pointInRect(m.x, m.y, PAUSE_BUTTONS.settings)) {
      this._returnState = 'paused';
      this.state = 'settings';
    } else if (this.game.runMode === 'campaign' && pointInRect(m.x, m.y, PAUSE_BUTTONS.save)) {
      this._saveGame(this.game.currentLevel, true);
    } else if (pointInRect(m.x, m.y, PAUSE_BUTTONS.mainMenu)) {
      this.game = null;
      this.state = 'main_menu';
    } else if (pointInRect(m.x, m.y, PAUSE_BUTTONS.cheats)) {
      this._returnState = 'paused';
      this.state = 'cheats';
    }
  }

  // --- cheats panel ---

  _updateCheatsPanel() {
    if (!this.input.wasMouseJustPressed()) return;
    const m = this.input.mouseScreen;
    const player = this.game.player;

    if (pointInRect(m.x, m.y, CHEAT_BUTTONS.godMode)) {
      player.godMode = !player.godMode;
    } else if (pointInRect(m.x, m.y, CHEAT_BUTTONS.infiniteAmmo)) {
      player.infiniteAmmo = !player.infiniteAmmo;
    } else if (pointInRect(m.x, m.y, CHEAT_BUTTONS.unlockWeapons)) {
      this._grantAllWeapons();
    } else if (pointInRect(m.x, m.y, CHEAT_BUTTONS.healFull)) {
      player.heal(player.maxHealth);
    } else if (pointInRect(m.x, m.y, CHEAT_BUTTONS.killAllZombies)) {
      for (const zombie of this.game.zombies) zombie.takeDamage(99999);
    } else if (pointInRect(m.x, m.y, BACK_BUTTON)) {
      this.state = this._returnState;
    }
  }

  _grantAllWeapons() {
    const player = this.game.player;
    for (const id of WEAPON_IDS) {
      player.pickupWeapon(id);
      const ammo = player.ownedWeapons[id];
      if (ammo && 'magazine' in ammo) {
        ammo.magazine = ammo.magazine || 1; // ensure not stuck at 0 if never fired
        ammo.reserve = 999;
      }
    }
  }

  // --- typed cheat codes (IDDQD / IDKFA), active during gameplay ---

  _checkCheatCodes() {
    for (const code of this.input.justPressedKeys) {
      const letter = KEYCODE_TO_LETTER[code];
      if (!letter) continue;
      this._cheatBuffer = (this._cheatBuffer + letter).slice(-10);
      for (const cheat of CHEAT_CODES) {
        if (this._cheatBuffer.endsWith(cheat)) this._applyCheatCode(cheat);
      }
    }
  }

  _applyCheatCode(cheat) {
    const player = this.game.player;
    if (cheat === 'IDDQD') {
      player.godMode = !player.godMode;
      this.game.ui.pushNotification(`God mode ${player.godMode ? 'ON' : 'OFF'}`);
    } else if (cheat === 'IDKFA') {
      this._grantAllWeapons();
      player.infiniteAmmo = true;
      this.game.ui.pushNotification('All weapons + ammo unlocked');
    }
  }
}
