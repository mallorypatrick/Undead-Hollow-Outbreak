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

  // Separate element for the level-39 ending cutscenes (see AppController's
  // 'ending_video' state) - plays once with real sound, unlike the muted
  // looping menu background above, so it needs its own <video>.
  const cutsceneVideo = document.createElement('video');
  cutsceneVideo.loop = false;
  cutsceneVideo.playsInline = true;
  cutsceneVideo.style.position = 'fixed';
  cutsceneVideo.style.left = '-9999px';
  cutsceneVideo.style.top = '-9999px';
  document.body.appendChild(cutsceneVideo);

  const app = new AppController(canvas, video, cutsceneVideo);
  window.__app = app; // dev-only debug hook, inspect via preview_eval
  app.start();
});
