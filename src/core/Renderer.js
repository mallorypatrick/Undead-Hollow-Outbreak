export const INTERNAL_WIDTH = 1920;
export const INTERNAL_HEIGHT = 1080;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.canvas.width = INTERNAL_WIDTH;
    this.canvas.height = INTERNAL_HEIGHT;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
    this._onResize();
  }

  _onResize() {
    const scale = Math.min(
      window.innerWidth / INTERNAL_WIDTH,
      window.innerHeight / INTERNAL_HEIGHT
    );
    this.canvas.style.width = `${INTERNAL_WIDTH * scale}px`;
    this.canvas.style.height = `${INTERNAL_HEIGHT * scale}px`;
  }

  clear(color = '#0a0a0a') {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);
  }
}
