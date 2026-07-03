// Standard Xbox-style button/axis indices, per the Gamepad API's
// "standard" mapping (what every modern Xbox/PlayStation/generic pad
// reports as when Chromium recognizes it).
const GAMEPAD_DEADZONE = 0.22;
const GAMEPAD_BUTTON = { A: 0, X: 2, Y: 3, LB: 4, RB: 5, RT: 7, START: 9, LEFT_STICK_CLICK: 10 };

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.justPressedKeys = new Set();
    this.mouseScreen = { x: 0, y: 0 };
    this.mouseJustPressed = false;

    // mouseDown is a getter below (physical mouse OR gamepad trigger/A) so
    // neither input source can stomp on the other's held-down state - see
    // pollGamepad() for why a plain shared boolean doesn't work here.
    this._physicalMouseDown = false;
    this._gamepadFiring = false;
    this._gamepadSprint = false;

    // Xbox-style gamepad support, blended with keyboard/mouse rather than
    // replacing it - both work interchangeably frame to frame. The Gamepad
    // API has no events for stick/trigger movement (only connect/
    // disconnect), so it has to be actively polled once a frame - see
    // pollGamepad(), called by AppController before any game logic reads
    // input this frame.
    this.gamepadIndex = null;
    this._gamepadMove = { x: 0, y: 0 };
    this._gamepadAimAngle = null; // only set while the right stick is actively deflected
    this._gamepadButtonState = {}; // synthetic code -> currently held, for edge detection

    window.addEventListener('gamepadconnected', (e) => { this.gamepadIndex = e.gamepad.index; });
    window.addEventListener('gamepaddisconnected', (e) => {
      if (this.gamepadIndex === e.gamepad.index) this.gamepadIndex = null;
    });

    window.addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) {
        this.justPressedKeys.add(e.code);
      }
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    canvas.addEventListener('mousemove', (e) => this._updateMousePosition(e));
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        if (!this._physicalMouseDown) this.mouseJustPressed = true;
        this._physicalMouseDown = true;
      }
    });
    canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) this._physicalMouseDown = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  get mouseDown() {
    return this._physicalMouseDown || this._gamepadFiring;
  }

  _updateMousePosition(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this.mouseScreen.x = (e.clientX - rect.left) * scaleX;
    this.mouseScreen.y = (e.clientY - rect.top) * scaleY;
  }

  isDown(code) {
    return this.keys.has(code);
  }

  // True only on the single frame the key transitioned from up to down.
  wasJustPressed(code) {
    return this.justPressedKeys.has(code);
  }

  wasMouseJustPressed() {
    return this.mouseJustPressed;
  }

  // Reads the live Gamepad object and folds it into the same state
  // keyboard/mouse already populate, under synthetic key codes
  // ('GamepadReload' etc.) that never collide with a real
  // KeyboardEvent.code - so fire/reload/pause act exactly like a mouse
  // click or keypress to the rest of the game without any extra branching
  // in Player.js/AppController.js beyond checking one more code.
  pollGamepad() {
    this._gamepadMove = { x: 0, y: 0 };
    this._gamepadAimAngle = null;

    if (this.gamepadIndex === null || !navigator.getGamepads) {
      this._gamepadFiring = false;
      this._gamepadSprint = false;
      this._syncGamepadButton('GamepadReload', false);
      this._syncGamepadButton('GamepadPause', false);
      this._syncGamepadButton('GamepadWeaponNext', false);
      this._syncGamepadButton('GamepadWeaponPrev', false);
      this._syncGamepadButton('GamepadFlashlight', false);
      return;
    }

    const pad = navigator.getGamepads()[this.gamepadIndex];
    if (!pad) return;

    const lx = pad.axes[0] || 0;
    const ly = pad.axes[1] || 0;
    if (Math.hypot(lx, ly) > GAMEPAD_DEADZONE) this._gamepadMove = { x: lx, y: ly };

    const rx = pad.axes[2] || 0;
    const ry = pad.axes[3] || 0;
    if (Math.hypot(rx, ry) > GAMEPAD_DEADZONE) this._gamepadAimAngle = Math.atan2(ry, rx);

    const firing = (pad.buttons[GAMEPAD_BUTTON.RT]?.value || 0) > 0.3 || !!pad.buttons[GAMEPAD_BUTTON.A]?.pressed;
    if (firing && !this.mouseDown) this.mouseJustPressed = true;
    this._gamepadFiring = firing;
    this._gamepadSprint = !!pad.buttons[GAMEPAD_BUTTON.LEFT_STICK_CLICK]?.pressed;

    this._syncGamepadButton('GamepadReload', pad.buttons[GAMEPAD_BUTTON.X]?.pressed);
    this._syncGamepadButton('GamepadPause', pad.buttons[GAMEPAD_BUTTON.START]?.pressed);
    this._syncGamepadButton('GamepadWeaponNext', pad.buttons[GAMEPAD_BUTTON.RB]?.pressed);
    this._syncGamepadButton('GamepadWeaponPrev', pad.buttons[GAMEPAD_BUTTON.LB]?.pressed);
    this._syncGamepadButton('GamepadFlashlight', pad.buttons[GAMEPAD_BUTTON.Y]?.pressed);
  }

  _syncGamepadButton(code, isPressed) {
    const was = this._gamepadButtonState[code];
    if (isPressed && !was) this.justPressedKeys.add(code);
    if (isPressed) this.keys.add(code); else this.keys.delete(code);
    this._gamepadButtonState[code] = !!isPressed;
  }

  getMoveVector() {
    let x = 0;
    let y = 0;
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) y -= 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) y += 1;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) x -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;

    if (x !== 0 && y !== 0) {
      const len = Math.sqrt(2);
      x /= len;
      y /= len;
    }

    // Left stick only takes over when no keyboard direction is held, so
    // the two never fight each other mid-frame.
    if (x === 0 && y === 0 && (this._gamepadMove.x !== 0 || this._gamepadMove.y !== 0)) {
      return { x: this._gamepadMove.x, y: this._gamepadMove.y };
    }
    return { x, y };
  }

  // Right-stick aim angle, or null if the stick isn't actively deflected -
  // Player falls back to mouse-based aim in that case. See
  // Player._updateAimAndDirection.
  getGamepadAimAngle() {
    return this._gamepadAimAngle;
  }

  isGamepadSprintHeld() {
    return this._gamepadSprint;
  }

  // Must be called once per frame, after all game logic has had a chance to
  // read this frame's edge-triggered input.
  endFrame() {
    this.justPressedKeys.clear();
    this.mouseJustPressed = false;
  }
}
