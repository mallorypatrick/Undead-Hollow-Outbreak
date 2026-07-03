// Post-process display filter. Everything (menu + gameplay) is always drawn
// at the full 1920x1080 internal resolution into an offscreen scene buffer;
// this filter is the only thing that ever changes how that buffer looks
// when it's blitted onto the real, visible canvas - so switching styles
// never affects layout/coordinates anywhere else in the game.
export const GRAPHICS_STYLES = {
  pc: { id: 'pc', label: 'PC (Full Color)', pixelBlock: 1, mode: 'none' },
  bit16: { id: 'bit16', label: '16-bit', pixelBlock: 3, mode: 'quantize', levels: 32 },
  bit8: { id: 'bit8', label: '8-bit', pixelBlock: 5, mode: 'quantize', levels: 6 },
  // Classic Game Boy is deliberately rendered with the same color-quantize
  // look as Game Boy Color (not the old 4-shade green palette) per request -
  // only the pixel block size differs, nodding at the original's lower
  // resolution.
  gameboy: { id: 'gameboy', label: 'Game Boy', pixelBlock: 9, mode: 'quantize', levels: 5 },
  gameboy_color: { id: 'gameboy_color', label: 'Game Boy Color', pixelBlock: 6, mode: 'quantize', levels: 5 },
  gameboy_advance: { id: 'gameboy_advance', label: 'Game Boy Advance', pixelBlock: 3, mode: 'quantize', levels: 12 },
};
export const GRAPHICS_STYLE_ORDER = ['pc', 'bit16', 'bit8', 'gameboy_advance', 'gameboy_color', 'gameboy'];

export class GraphicsFilter {
  constructor(width = 1920, height = 1080) {
    this.width = width;
    this.height = height;
    this._bufferCanvas = document.createElement('canvas');
    this._bufferCtx = this._bufferCanvas.getContext('2d');
  }

  apply(sourceCanvas, targetCtx, styleId) {
    const style = GRAPHICS_STYLES[styleId] || GRAPHICS_STYLES.pc;

    if (style.mode === 'none') {
      targetCtx.imageSmoothingEnabled = true;
      targetCtx.drawImage(sourceCanvas, 0, 0, this.width, this.height);
      return;
    }

    const bw = Math.max(1, Math.round(this.width / style.pixelBlock));
    const bh = Math.max(1, Math.round(this.height / style.pixelBlock));
    this._bufferCanvas.width = bw;
    this._bufferCanvas.height = bh;
    this._bufferCtx.imageSmoothingEnabled = true;
    this._bufferCtx.drawImage(sourceCanvas, 0, 0, bw, bh);

    const imageData = this._bufferCtx.getImageData(0, 0, bw, bh);
    const data = imageData.data;

    if (style.mode === 'quantize') {
      const step = 255 / (style.levels - 1);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.round(Math.round(data[i] / step) * step);
        data[i + 1] = Math.round(Math.round(data[i + 1] / step) * step);
        data[i + 2] = Math.round(Math.round(data[i + 2] / step) * step);
      }
    }

    this._bufferCtx.putImageData(imageData, 0, 0);

    targetCtx.imageSmoothingEnabled = false;
    targetCtx.drawImage(this._bufferCanvas, 0, 0, this.width, this.height);
  }
}
