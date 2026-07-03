import { AppController } from './core/AppController.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');

  // Positioned off-screen (not display:none) so browsers keep decoding
  // frames for it even though it's never shown directly - only its current
  // frame, drawn onto the canvas each tick, is ever visible.
  const video = document.createElement('video');
  video.src = 'assets/video/menu_background.mp4';
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.style.position = 'fixed';
  video.style.left = '-9999px';
  video.style.top = '-9999px';
  document.body.appendChild(video);

  const app = new AppController(canvas, video);
  window.__app = app; // dev-only debug hook, inspect via preview_eval
  app.start();
});
