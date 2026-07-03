// Drives zombie-wave progression for both Campaign (finite, biome-advancing)
// and Survive-If-You-Can (endless, ever-escalating) modes. Game owns one
// instance per run and calls update(dt, currentZombieCount) every frame;
// WaveController never touches Game/Zombie directly, only through the
// callbacks passed into its constructor, so it stays independently simple
// to reason about.
const SECONDS_BETWEEN_SPAWNS = 1.1;
const INTERMISSION_SECONDS = 3.0;
const SURVIVE_MAX_CONCURRENT_CAP = 60;

export class WaveController {
  constructor({ mode, biomeId, waveCount, zombiesPerWaveBase, zombiesPerWaveGrowth, maxConcurrent, onSpawnZombie, onWaveComplete, onLevelComplete }) {
    this.mode = mode; // 'campaign' | 'survive'
    this.biomeId = biomeId;
    this.waveCount = waveCount; // undefined in survive mode - never checked for completion
    this.zombiesPerWaveBase = zombiesPerWaveBase;
    this.zombiesPerWaveGrowth = zombiesPerWaveGrowth;
    this.maxConcurrent = maxConcurrent; // campaign only - survive computes its own, see effectiveMaxConcurrent()
    this.onSpawnZombie = onSpawnZombie;
    this.onWaveComplete = onWaveComplete;
    this.onLevelComplete = onLevelComplete;

    this.currentWave = 0;
    this.zombiesRemainingToSpawnThisWave = 0;
    this.zombiesAliveThisWave = 0;
    this.intermissionTimer = 0;
    this.spawnTimer = 0;
    this._startNextWave();
  }

  _zombiesForWave(waveNumber) {
    return Math.round(this.zombiesPerWaveBase + this.zombiesPerWaveGrowth * (waveNumber - 1));
  }

  _startNextWave() {
    this.currentWave++;
    this.zombiesRemainingToSpawnThisWave = this._zombiesForWave(this.currentWave);
    this.zombiesAliveThisWave = 0;
    this.spawnTimer = 0.5;
  }

  // Called by Game once per zombie transition from alive -> dead.
  notifyZombieDied() {
    this.zombiesAliveThisWave = Math.max(0, this.zombiesAliveThisWave - 1);
    this._checkWaveClear();
  }

  _checkWaveClear() {
    if (this.zombiesRemainingToSpawnThisWave > 0 || this.zombiesAliveThisWave > 0) return;

    if (this.mode === 'campaign' && this.currentWave >= this.waveCount) {
      this.onLevelComplete();
      return;
    }
    this.onWaveComplete(this.currentWave);
    this.intermissionTimer = INTERMISSION_SECONDS;
  }

  update(dt, currentZombieCount) {
    if (this.intermissionTimer > 0) {
      this.intermissionTimer -= dt;
      if (this.intermissionTimer <= 0) this._startNextWave();
      return;
    }

    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    if (this.zombiesRemainingToSpawnThisWave <= 0) return;
    if (currentZombieCount >= this.effectiveMaxConcurrent()) return;

    this.spawnTimer = SECONDS_BETWEEN_SPAWNS;
    this.zombiesRemainingToSpawnThisWave--;
    this.zombiesAliveThisWave++;
    this.onSpawnZombie(this.biomeId);
  }

  // Survive mode has no LevelConfig cap - it climbs forever with the wave
  // number so late-game waves feel harder without needing per-wave data.
  effectiveMaxConcurrent() {
    if (this.mode === 'campaign') return this.maxConcurrent;
    return Math.min(SURVIVE_MAX_CONCURRENT_CAP, 16 + Math.floor(this.currentWave * 1.5));
  }
}
