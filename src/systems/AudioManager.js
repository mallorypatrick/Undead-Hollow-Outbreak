// Sound effects are synthesized at runtime with the Web Audio API by
// default. Any key can be upgraded to a real recorded clip by dropping a
// file at assets/audio/sfx/<key>.wav (or .mp3/.ogg) - see REAL_SFX_FILES
// below. Until that file exists (or while it's still loading), playSound()
// transparently falls back to the synthesized version, same drop-in
// convention as the sprite/icon pipeline.
class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.loops = new Map();
    this.volume = 0.7;

    const unlock = () => this._unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }

  _ensureContext() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) this.masterGain.gain.value = this.volume;
  }

  _unlock() {
    const ctx = this._ensureContext();
    if (ctx.state === 'suspended') ctx.resume();
  }

  _noiseBuffer(duration) {
    const ctx = this._ensureContext();
    const buffer = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  _envelope(gainNode, attack, decay, peak, startTime) {
    gainNode.gain.cancelScheduledValues(startTime);
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(peak, startTime + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + attack + decay);
  }

  playShot({ freq = 220, noiseDuration = 0.12, decay = 0.15, filterFreq = 1800 } = {}) {
    const ctx = this._ensureContext();
    const t = ctx.currentTime;

    const noise = ctx.createBufferSource();
    noise.buffer = this._noiseBuffer(noiseDuration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const noiseGain = ctx.createGain();
    this._envelope(noiseGain, 0.001, decay, 1, t);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(t);
    noise.stop(t + noiseDuration);

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * 0.4), t + decay);
    const oscGain = ctx.createGain();
    this._envelope(oscGain, 0.001, decay * 0.6, 0.6, t);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + decay);
  }

  playClick({ freq = 700, duration = 0.05 } = {}) {
    const ctx = this._ensureContext();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);
    const gain = ctx.createGain();
    this._envelope(gain, 0.001, duration, 0.4, t);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  playTone({ freq = 440, duration = 0.2, type = 'sine', peak = 0.3 } = {}) {
    const ctx = this._ensureContext();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    const gain = ctx.createGain();
    this._envelope(gain, 0.01, duration, peak, t);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  // Wavering vibrato groan - used for zombie ambient moans and the
  // descending "death gargle", and for the player's own pained death sound.
  playGroan({ baseFreq = 100, vibratoRate = 5, vibratoDepth = 15, duration = 1.0, type = 'sawtooth', peak = 0.25, pitchDrift = 0 } = {}) {
    const ctx = this._ensureContext();
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(baseFreq, t);
    if (pitchDrift) osc.frequency.exponentialRampToValueAtTime(Math.max(20, baseFreq + pitchDrift), t + duration);

    const lfo = ctx.createOscillator();
    lfo.frequency.value = vibratoRate;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = vibratoDepth;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;

    const gain = ctx.createGain();
    this._envelope(gain, 0.05, duration, peak, t);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    lfo.start(t);
    osc.stop(t + duration + 0.1);
    lfo.stop(t + duration + 0.1);
  }

  // Short percussive grunt - a filtered noise thump plus a falling-pitch
  // tone, used for "getting hit" reactions (zombie or player).
  playGutturalHit({ freq = 130, duration = 0.18 } = {}) {
    const ctx = this._ensureContext();
    const t = ctx.currentTime;

    const noise = ctx.createBufferSource();
    noise.buffer = this._noiseBuffer(duration * 0.8);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400;
    filter.Q.value = 0.7;
    const noiseGain = ctx.createGain();
    this._envelope(noiseGain, 0.001, duration * 0.7, 0.5, t);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(t);
    noise.stop(t + duration);

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * 0.5), t + duration);
    const oscGain = ctx.createGain();
    this._envelope(oscGain, 0.001, duration * 0.6, 0.45, t);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + duration);
  }

  playChainsawStart() {
    const ctx = this._ensureContext();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(35, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.35);
    const gain = ctx.createGain();
    this._envelope(gain, 0.02, 0.4, 0.35, t);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.45);
  }

  startLoop(key, { freq = 90, lfoRate = 14, lfoDepth = 18, filterFreq = 1200, volume = 0.22 } = {}) {
    if (this.loops.has(key)) return;
    const ctx = this._ensureContext();
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;

    const lfo = ctx.createOscillator();
    lfo.frequency.value = lfoRate;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = lfoDepth;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    lfo.start(t);

    this.loops.set(key, { osc, lfo, gain });
  }

  stopLoop(key) {
    const loop = this.loops.get(key);
    if (!loop) return;
    const ctx = this._ensureContext();
    const t = ctx.currentTime;
    loop.gain.gain.cancelScheduledValues(t);
    loop.gain.gain.setValueAtTime(loop.gain.gain.value, t);
    loop.gain.gain.linearRampToValueAtTime(0, t + 0.08);
    loop.osc.stop(t + 0.12);
    loop.lfo.stop(t + 0.12);
    this.loops.delete(key);
  }

  isLoopPlaying(key) {
    return this.loops.has(key);
  }
}

export const audioManager = new AudioManager();

// Independent on/off switches for music vs. everything else (gunshots,
// zombie sounds, UI clicks, etc.) - separate from the volume slider, and
// applied everywhere since every sound in the game funnels through
// playSound()/startLoopSound() or startMenuMusic() below.
let soundEnabled = true;
let musicEnabled = true;

export function setSoundEnabled(enabled) {
  soundEnabled = enabled;
  if (!enabled) stopAllLoops();
}

export function setMusicEnabled(enabled) {
  musicEnabled = enabled;
  if (!enabled && musicElement) musicElement.pause();
}

function stopAllLoops() {
  for (const key of Array.from(activeRealLoops)) {
    const real = realLoopElements.get(key);
    if (real) real.element.pause();
    activeRealLoops.delete(key);
  }
  for (const key of Array.from(audioManager.loops.keys())) {
    audioManager.stopLoop(key);
  }
  stopWaterProximityAmbience();
  stopUnderwaterAmbience();
}

const SFX_FOLDER = 'assets/audio/sfx/';

// key -> one or more recorded clip variants (file + playback volume). Add
// an entry here (and drop the file in assets/audio/sfx/) to upgrade any
// synthesized sound to a real one - no other code needs to change. Multiple
// variants are picked from at random each time, for a little variety.
const REAL_SFX_FILES = {
  handgun_shot: [{ file: 'handgun_shot.wav', volume: 0.7 }],
  revolver_shot: [{ file: 'pistol-fire.wav', volume: 0.7 }],
  rifle_shot: [{ file: 'rifle_shot.wav', volume: 0.75 }],
  // Shared by both shotgun variants (Pump Shotgun and Homestead 12 Gauge) -
  // same weapon family, same fire sound.
  shotgun_blast: [{ file: 'shotgun-fire.wav', volume: 0.8 }],
  xbow_fire: [{ file: 'XBOW_FIRE.wav', volume: 0.7 }],
  // The bow's own reload sound, and a shared "cocking/pull" layer added on
  // top of every OTHER weapon's own reload clip - see Player._tryReload.
  xbow_pull: [{ file: 'XBOW_PULL.wav', volume: 0.5 }],
  zombie_hit: [{ file: 'zombie_hit_1.wav', volume: 0.6 }],
  zombie_death: [
    { file: 'zombie_death_1.wav', volume: 0.7 },
    { file: 'zombie_death_2.wav', volume: 0.7 },
  ],
  zombie_moan: [{ file: 'zombie_moan_1.wav', volume: 0.4 }],
  death: [{ file: 'player_death.wav', volume: 0.7 }],
  chainsaw_start: [{ file: 'chainsaw_start.wav', volume: 0.7 }],
  chainsaw_attack: [{ file: 'chainsaw_attack.wav', volume: 0.75 }],
  bullet_casing: [{ file: 'bullet_casing.mp3', volume: 0.35 }],
  punch: [{ file: 'punch.wav', volume: 0.65 }],
  // Footsteps on ground - shared by the player, military, and regular
  // zombies (see Player/Zombie footstep timers + Game._updateZombies'
  // shared cooldown). WADE1-3 exist too but stay unused until there's an
  // actual water zone to detect "standing in water" against.
  footstep_walk: [
    { file: 'WALK1.WAV', volume: 0.4 },
    { file: 'WALK2.WAV', volume: 0.4 },
    { file: 'WALK3.WAV', volume: 0.4 },
  ],
  // A bullet striking a car (metal) or other hard scenery (stone) - picked
  // at random from both categories together for variety, replacing the
  // single ricochet clip this used to be.
  bullet_ricochet: [
    { file: 'bullet-hit-metal01.wav', volume: 0.55 },
    { file: 'bullet-hit-metal02.wav', volume: 0.55 },
    { file: 'bullet-hit-stone01.wav', volume: 0.55 },
    { file: 'bullet-hit-stone02.wav', volume: 0.55 },
  ],
  // Shared by both the player and military soldiers when hit by a zombie -
  // see Player.takeDamage and Zombie.takeDamage's isHuman branch.
  hurt: [{ file: 'pain_01.ogg', volume: 0.7 }],
  // Reload - grouped by weapon family, not per-weapon (see WeaponConfig.js
  // sound.reload for which weapon uses which key).
  pistol_reload: [{ file: 'PISTL_RELOAD.wav', volume: 0.65 }],
  smg_reload: [{ file: 'Mac_10_RELOAD.wav', volume: 0.65 }],
  rifle_reload: [{ file: 'RIFLE_RELOAD.wav', volume: 0.65 }],
  // shotgun's existing reload key/sound already existed (shotgun_shell_in) -
  // this just upgrades it from synthesized to the real recorded clip.
  shotgun_shell_in: [{ file: 'SHTGUN_RELOAD.wav', volume: 0.65 }],
  // Draw (equip) / holster (switch away or pickup) - see Player.equipWeapon
  // and pickupWeapon.
  pistol_draw: [{ file: 'PISTL_DRAW.wav', volume: 0.6 }],
  pistol_holster: [{ file: 'PISTL_HOLSTR.wav', volume: 0.6 }],
  rifle_draw: [{ file: 'RIFLE_DRAW.wav', volume: 0.6 }],
  rifle_holster: [{ file: 'RIFLE_HOLSTR.wav', volume: 0.6 }],
  sniper_draw: [{ file: 'SNIPR_DRAW.wav', volume: 0.6 }],
  shotgun_draw: [{ file: 'DBSGUN_DRAW.wav', volume: 0.6 }],
  shotgun_holster: [{ file: 'DBSGUN_HOLSTR.wav', volume: 0.6 }],
  bow_draw: [{ file: 'XBOW_DRAW.wav', volume: 0.6 }],
  bow_holster: [{ file: 'XBOW_HOLSTR.wav', volume: 0.6 }],
  // Wading through shallow/swamp water - overrides footstep_walk while the
  // entity's waterDepth is 'shallow' (see Player/Zombie water handling).
  wade: [
    { file: 'WADE1.WAV', volume: 0.5 },
    { file: 'WADE2.WAV', volume: 0.5 },
    { file: 'WADE3.WAV', volume: 0.5 },
  ],
  // Drowning death (deep water, breath hits zero) - player/military only,
  // see Player._die/Zombie's military breath handling.
  drown: [{ file: 'DIE_UW.WAV', volume: 0.75 }],
};

const realSfxCache = new Map(); // key -> array of handles

function loadRealSfx(key, variants) {
  const handles = variants.map(({ file, volume }) => {
    const audio = new Audio(SFX_FOLDER + file);
    audio.preload = 'auto';
    audio.volume = volume;
    const handle = { element: audio, ready: false };
    audio.addEventListener('canplaythrough', () => { handle.ready = true; }, { once: true });
    audio.addEventListener('error', () => { /* file missing/invalid - synthesized fallback stays active */ });
    return handle;
  });
  realSfxCache.set(key, handles);
}

for (const [key, variants] of Object.entries(REAL_SFX_FILES)) {
  loadRealSfx(key, variants);
}

// Clones the cached element so rapid repeat shots can overlap instead of
// cutting each other off.
function tryPlayRealSfx(key) {
  const handles = realSfxCache.get(key);
  if (!handles) return false;
  const ready = handles.filter((h) => h.ready);
  if (!ready.length) return false;

  const handle = ready[Math.floor(Math.random() * ready.length)];
  const instance = handle.element.cloneNode(true);
  instance.volume = Math.max(0, Math.min(1, handle.element.volume * (audioManager.volume / 0.7)));
  instance.play().catch(() => {});
  return true;
}

const MUSIC_FOLDER = 'assets/audio/music/';
const MUSIC_BASE_VOLUME = 0.35;
// key -> file, picked by AppController.update() based on state (menu screens
// vs. the pause overlay specifically - see startMenuMusic below).
const MUSIC_TRACKS = {
  menu: 'menu_theme.mp3',
  pause: 'pause_theme.mp3',
};
let musicElement = null;
let currentTrackKey = null;

function ensureMusicElement() {
  if (!musicElement) {
    musicElement = new Audio();
    musicElement.loop = true;
    musicElement.volume = MUSIC_BASE_VOLUME * (audioManager.volume / 0.7);
  }
  return musicElement;
}

// `track` picks which file plays - 'menu' (every non-gameplay screen) or
// 'pause' (a distinct, more intense track just for the pause overlay).
// Switching tracks mid-playback (e.g. entering pause) swaps the source and
// restarts it; re-requesting the same already-playing track is a no-op.
export function startMenuMusic(track = 'menu') {
  if (!musicEnabled) return;
  const el = ensureMusicElement();
  if (currentTrackKey !== track) {
    currentTrackKey = track;
    el.src = `${MUSIC_FOLDER}${MUSIC_TRACKS[track]}`;
    el.play().catch(() => { /* needs a user gesture on some browsers */ });
  } else if (el.paused) {
    el.play().catch(() => { /* needs a user gesture on some browsers */ });
  }
}

export function stopMenuMusic() {
  if (musicElement && !musicElement.paused) musicElement.pause();
}

// Real recorded loops (currently just the chainsaw idle/run sound) - same
// drop-in-a-file upgrade pattern as one-shot SFX, but these need continuous
// looping playback instead of clone-and-play-once.
const REAL_LOOP_FILES = {
  chainsaw_loop: { file: 'chainsaw_loop.wav', volume: 0.4 },
  // Reuses the one-shot attack clip as a native-looped source (audio.loop =
  // true below) - the continuous cutting sound while the button is held,
  // as opposed to chainsaw_loop's idle rev. See Player._handleCombatInput.
  chainsaw_attack_loop: { file: 'chainsaw_attack.wav', volume: 0.55 },
  // Full-auto sustained fire while the trigger is held (smg/m4) - same
  // start-on-mousedown/stop-on-mouseup idea as chainsaw_attack_loop, see
  // Player._handleCombatInput's FIREARM branch.
  machinegun_fire_loop: { file: 'machinegun-fire.wav', volume: 0.5 },
};
const realLoopElements = new Map(); // key -> { element, ready }
const activeRealLoops = new Set();

for (const [key, { file, volume }] of Object.entries(REAL_LOOP_FILES)) {
  const audio = new Audio(SFX_FOLDER + file);
  audio.preload = 'auto';
  audio.loop = true;
  audio.volume = volume;
  const handle = { element: audio, ready: false };
  audio.addEventListener('canplaythrough', () => { handle.ready = true; }, { once: true });
  audio.addEventListener('error', () => {});
  realLoopElements.set(key, handle);
}

export function startLoopSound(key) {
  if (!soundEnabled) return;
  const real = realLoopElements.get(key);
  if (real && real.ready) {
    real.element.currentTime = 0;
    real.element.play().catch(() => {});
    activeRealLoops.add(key);
    return;
  }
  if (key === 'chainsaw_loop') audioManager.startLoop(key, { freq: 90, filterFreq: 1200, volume: 0.22 });
  else if (key === 'chainsaw_attack_loop') audioManager.startLoop(key, { freq: 130, lfoRate: 20, lfoDepth: 30, filterFreq: 2200, volume: 0.28 });
  else if (key === 'machinegun_fire_loop') audioManager.startLoop(key, { freq: 180, lfoRate: 45, lfoDepth: 60, filterFreq: 2600, volume: 0.24 });
  else audioManager.startLoop(key);
}

export function stopLoopSound(key) {
  if (activeRealLoops.has(key)) {
    const real = realLoopElements.get(key);
    if (real) real.element.pause();
    activeRealLoops.delete(key);
  }
  audioManager.stopLoop(key);
}

export function setMasterVolume(volume) {
  audioManager.setVolume(volume);
  if (musicElement) musicElement.volume = MUSIC_BASE_VOLUME * (volume / 0.7);
  for (const [key, { volume: baseVolume }] of Object.entries(REAL_LOOP_FILES)) {
    const real = realLoopElements.get(key);
    if (real) real.element.volume = Math.max(0, Math.min(1, baseVolume * (volume / 0.7)));
  }
  if (_waterProximityAudio) _waterProximityAudio.volume = 0.4 * (volume / 0.7);
  if (_underwaterAudio) _underwaterAudio.volume = 0.5 * (volume / 0.7);
}

const SOUND_DEFS = {
  handgun_shot: () => audioManager.playShot({ freq: 260, noiseDuration: 0.08, decay: 0.12, filterFreq: 2200 }),
  revolver_shot: () => audioManager.playShot({ freq: 190, noiseDuration: 0.13, decay: 0.19, filterFreq: 1900 }),
  rifle_shot: () => audioManager.playShot({ freq: 150, noiseDuration: 0.16, decay: 0.24, filterFreq: 2600 }),
  smg_shot: () => audioManager.playShot({ freq: 320, noiseDuration: 0.05, decay: 0.08, filterFreq: 2000 }),
  shotgun_blast: () => audioManager.playShot({ freq: 120, noiseDuration: 0.22, decay: 0.3, filterFreq: 1400 }),
  xbow_fire: () => audioManager.playShot({ freq: 400, noiseDuration: 0.04, decay: 0.06, filterFreq: 3000 }),
  reload_generic: () => audioManager.playClick({ freq: 700, duration: 0.04 }),
  shotgun_shell_in: () => audioManager.playClick({ freq: 480, duration: 0.06 }),
  pistol_reload: () => audioManager.playClick({ freq: 650, duration: 0.05 }),
  smg_reload: () => audioManager.playClick({ freq: 600, duration: 0.06 }),
  rifle_reload: () => audioManager.playClick({ freq: 550, duration: 0.07 }),
  pistol_draw: () => audioManager.playClick({ freq: 500, duration: 0.04 }),
  pistol_holster: () => audioManager.playClick({ freq: 420, duration: 0.04 }),
  rifle_draw: () => audioManager.playClick({ freq: 460, duration: 0.05 }),
  rifle_holster: () => audioManager.playClick({ freq: 380, duration: 0.05 }),
  sniper_draw: () => audioManager.playClick({ freq: 440, duration: 0.05 }),
  shotgun_draw: () => audioManager.playClick({ freq: 420, duration: 0.06 }),
  shotgun_holster: () => audioManager.playClick({ freq: 360, duration: 0.06 }),
  bow_draw: () => audioManager.playClick({ freq: 480, duration: 0.05 }),
  bow_holster: () => audioManager.playClick({ freq: 400, duration: 0.05 }),
  xbow_pull: () => audioManager.playClick({ freq: 320, duration: 0.08 }),
  footstep_walk: () => audioManager.playClick({ freq: 90 + Math.random() * 20, duration: 0.06 }),
  // A flat mechanical click reads fine for both switch directions - no
  // real recorded file provided for this one yet, drop flashlight_on.wav/
  // flashlight_off.wav into assets/audio/sfx/ and add a REAL_SFX_FILES
  // entry to upgrade it, same convention as every other sound here.
  flashlight_toggle: () => audioManager.playClick({ freq: 700, duration: 0.03 }),
  punch: () => audioManager.playClick({ freq: 160, duration: 0.05 }),
  chainsaw_start: () => audioManager.playChainsawStart(),
  chainsaw_attack: () => audioManager.playClick({ freq: 100, duration: 0.09 }),
  pickup: () => audioManager.playTone({ freq: 660, duration: 0.12, type: 'sine', peak: 0.3 }),
  hurt: () => audioManager.playGutturalHit({ freq: 210, duration: 0.16 }),
  death: () => audioManager.playGroan({ baseFreq: 180, vibratoRate: 6, vibratoDepth: 25, duration: 1.1, type: 'sine', peak: 0.32, pitchDrift: -140 }),

  zombie_moan: () => audioManager.playGroan({
    baseFreq: 85 + Math.random() * 25,
    vibratoRate: 3.5 + Math.random() * 2,
    vibratoDepth: 12,
    duration: 0.9 + Math.random() * 0.7,
    type: 'sawtooth',
    peak: 0.16,
  }),
  zombie_hit: () => audioManager.playGutturalHit({ freq: 140 + Math.random() * 40, duration: 0.15 }),
  zombie_death: () => {
    audioManager.playGutturalHit({ freq: 110, duration: 0.22 });
    audioManager.playGroan({ baseFreq: 170, vibratoRate: 9, vibratoDepth: 45, duration: 0.9, type: 'sawtooth', peak: 0.3, pitchDrift: -120 });
  },
  wade: () => audioManager.playClick({ freq: 250 + Math.random() * 80, duration: 0.08 }),
  drown: () => audioManager.playGroan({ baseFreq: 140, vibratoRate: 8, vibratoDepth: 30, duration: 1.2, type: 'sine', peak: 0.3, pitchDrift: -100 }),
};

export function playSound(key) {
  if (!soundEnabled) return;
  if (tryPlayRealSfx(key)) return;
  const def = SOUND_DEFS[key];
  if (def) def();
}

// --- general ambience (birds/bugs/wind/etc.) + water proximity/underwater loops ---
//
// Both live here rather than a separate module since they need the same
// AudioContext/masterGain/soundEnabled plumbing everything above already
// has, and (unlike the fixed one-file-per-key REAL_SFX_FILES/REAL_LOOP_FILES
// above) both need to pick a random file at PLAY time from a pool, which
// that dict-based system isn't shaped for.

const AMBIENCE_FOLDER = 'assets/audio/ambience/';

// One-shot nature/environment sounds, fired individually and randomly (see
// updateAmbience) rather than looped - a "living world" background texture
// distinct from music. Water-specific sounds (LAKE/POND/SWAMP/UNDERW) are
// handled separately below since they're tied to actual water zones, not
// fired at random.
const AMBIENCE_FILES = [
  'BAT1.WAV', 'BAT2.WAV', 'BIRD1.WAV', 'BIRD2.WAV', 'BIRD3.WAV', 'BIRD4.WAV', 'BIRD5.WAV',
  'BUBBLE1.WAV', 'BUBBLE2.WAV',
  'BUG1.WAV', 'BUG2.WAV', 'BUG3.WAV', 'BUG4.WAV', 'BUG5.WAV', 'BUG6.WAV', 'BUG7.WAV', 'BUG8.WAV', 'BUG9.WAV', 'BUG10.WAV',
  'BUZZ.WAV',
  'CICADA1.WAV', 'CICADA2.WAV', 'CICADA3.WAV', 'CICADA4.WAV', 'CICADA5.WAV', 'CICADA6.WAV', 'CICADA7.WAV', 'CICADA8.WAV',
  'CRICKET1.WAV', 'CRICKET2.WAV', 'CRICKET3.WAV', 'CRICKET4.WAV', 'CRICKET5.WAV', 'CRICKET6.WAV',
  'CRUNCH1.WAV', 'CRUNCH2.WAV',
  'D_CALL1.WAV', 'D_CALL2.WAV', 'D_CALL3.WAV', 'D_CALL4.WAV', 'D_CALL5.WAV', 'D_CALL6.WAV',
  'DRIP1.WAV', 'DRIP2.WAV', 'DRIP3.WAV', 'DRIP4.WAV',
  'FIRE.WAV', 'FLY1.WAV', 'FLY2.WAV',
  'FOREST1.WAV', 'FOREST2.WAV', 'FOREST3.WAV',
  'FOX_CALL1.WAV', 'FOX_CALL2.WAV', 'FOX_CALL3.WAV',
  'FROG1.WAV', 'FROG2.WAV', 'FROG3.WAV', 'FROG4.WAV', 'FROG5.WAV', 'FROG6.WAV', 'FROG7.WAV', 'FROG8.WAV', 'FROG9.WAV', 'FROG10.WAV', 'FROG11.WAV',
  'GUST1.WAV', 'GUST2.WAV', 'GUST3.WAV', 'GUST4.WAV',
  'HUM1.WAV', 'HUM2.WAV', 'LEAVES.WAV',
  'MARSH1.WAV', 'MARSH2.WAV', 'MARSH3.WAV', 'MARSH4.WAV', 'MARSH5.WAV',
  'NIGHTBUG.WAV', 'OWL1.WAV', 'OWL2.WAV',
  'SCREECH.WAV', 'SCREECH2.WAV', 'SNAKE.WAV',
  'STREAM1.WAV', 'STREAM2.WAV',
  'WAVE.WAV', 'WAVE2.WAV', 'WAVE3.WAV', 'WAVE4.WAV', 'WAVE5.WAV',
  'WIND1.WAV', 'WIND2.WAV', 'WIND3.WAV', 'WIND4.WAV', 'WIND5.WAV', 'WIND6.WAV', 'WIND7.WAV', 'WIND8.WAV',
  'WOODPECKER.WAV',
];

// Plays one ambience clip through its own tiny Web Audio graph (rather than
// a plain <audio>.play()) so the night variant can route through a lowpass
// filter and a slowed/deepened playbackRate for a "scarier in the dark"
// effect - a plain volume/rate tweak on the element alone can't add the
// muffled filtering.
function playAmbienceOneShot(file, isNight) {
  if (!soundEnabled) return;
  const ctx = audioManager._ensureContext();
  const audio = new Audio(AMBIENCE_FOLDER + file);
  audio.volume = 1; // gain node below handles actual level, not the element
  const source = ctx.createMediaElementSource(audio);
  const gain = ctx.createGain();
  gain.gain.value = (isNight ? 0.45 : 0.55) * (audioManager.volume / 0.7);

  if (isNight) {
    audio.playbackRate = 0.7 + Math.random() * 0.12;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 850; // muffled/distant - reads as creepier than the crisp daytime version
    source.connect(filter);
    filter.connect(gain);
  } else {
    source.connect(gain);
  }
  gain.connect(audioManager.masterGain);
  audio.play().catch(() => {});
}

let _ambienceTimer = 2;

// Call once per gameplay frame (see Game.update) - fires a random ambience
// one-shot on a ~2s cadence (jittered so it doesn't feel metronomic), using
// the night-processed variant whenever isNight is true.
export function updateAmbience(dt, isNight) {
  _ambienceTimer -= dt;
  if (_ambienceTimer > 0) return;
  _ambienceTimer = 1.6 + Math.random() * 1.2;
  if (!soundEnabled) return;
  const file = AMBIENCE_FILES[Math.floor(Math.random() * AMBIENCE_FILES.length)];
  playAmbienceOneShot(file, isNight);
}

// Water-body ambience (see MapBuilder's water zones / Game's proximity
// check) - one random file per zone `type` is picked the moment the player
// comes into range and looped natively until they leave range or the level
// changes; re-picking every loop restart (rather than mid-loop) keeps a
// single water body's ambience internally consistent instead of jarringly
// swapping sounds every few seconds.
const WATER_AMBIENCE_FILES = {
  lake: ['LAKE1.WAV', 'LAKE2.WAV', 'LAKE3.WAV', 'LAKE4.WAV', 'LAKE5.WAV', 'LAKE6.WAV'],
  pond: ['POND1.WAV', 'POND2.WAV', 'POND3.WAV', 'POND4.WAV', 'POND5.WAV', 'POND6.WAV', 'POND7.WAV', 'POND9.WAV'],
  swamp: ['SWAMP1.WAV', 'SWAMP2.WAV', 'SWAMP3.WAV', 'SWAMP4.WAV'],
};

let _waterProximityAudio = null;
let _waterProximityType = null;

export function startWaterProximityAmbience(type) {
  if (_waterProximityType === type) return; // already playing this zone's ambience
  stopWaterProximityAmbience();
  if (!soundEnabled) return;
  const files = WATER_AMBIENCE_FILES[type];
  if (!files) return;
  const file = files[Math.floor(Math.random() * files.length)];
  const audio = new Audio(AMBIENCE_FOLDER + file);
  audio.loop = true;
  audio.volume = 0.4 * (audioManager.volume / 0.7);
  audio.play().catch(() => {});
  _waterProximityAudio = audio;
  _waterProximityType = type;
}

export function stopWaterProximityAmbience() {
  if (_waterProximityAudio) {
    _waterProximityAudio.pause();
    _waterProximityAudio = null;
  }
  _waterProximityType = null;
}

// Submerged (deep water) ambience - mutually exclusive with the proximity
// loop above, since being IN the water should replace "hearing it nearby"
// with the muffled underwater texture. See Player/Zombie waterDepth.
let _underwaterAudio = null;

export function startUnderwaterAmbience() {
  if (_underwaterAudio) return;
  stopWaterProximityAmbience();
  if (!soundEnabled) return;
  const audio = new Audio(SFX_FOLDER + 'UNDERW.WAV');
  audio.loop = true;
  audio.volume = 0.5 * (audioManager.volume / 0.7);
  audio.play().catch(() => {});
  _underwaterAudio = audio;
}

export function stopUnderwaterAmbience() {
  if (_underwaterAudio) {
    _underwaterAudio.pause();
    _underwaterAudio = null;
  }
}
