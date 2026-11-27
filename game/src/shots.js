// Gobble Dash screenshot staging: the game accepts a ?shot= query that
// stages a scene, so every screenshot is a real render of the game's own
// code — no composed or borrowed image.
//
//   ?shot=title    the title screen (the cover)
//   ?shot=play     a mid-run moment: HUD, hazards, the farmer in frame
//   ?shot=nearmiss a knife and the glowing oven in frame, one life left
//   ?shot=end      the caught end screen
//
// Each stage sets the game state directly and freezes the world at a
// chosen moment, with a seeded hazard layout so the frame is the same
// every time it is taken.
import { CONFIG } from './config.js';
import { seededRandom } from './world.js';

export function stageShot(game, shot) {
  const rand = seededRandom(777);
  if (shot === 'title') {
    game.state = 'title';
    return;
  }
  if (shot === 'play') {
    game.startRun();
    game.distance = 342;
    game.score = 342 + 4 * CONFIG.cornPoints;
    game.speed = 330;
    game.world.scrollX = 2400;
    game.hazards.items = [
      { kind: 'fence', x: 760, w: 46, h: 74 },
      { kind: 'corn', x: 880, y: CONFIG.groundY - 46 },
      { kind: 'corn', x: 924, y: CONFIG.groundY - 46 },
      { kind: 'corn', x: 968, y: CONFIG.groundY - 46 },
      { kind: 'hay', x: 1060, w: 96, h: 56 },
      { kind: 'pie', x: 1180, y: CONFIG.groundY - 120 },
    ];
    game.turkey.y = CONFIG.groundY - 60; // mid-jump over the fence
    game.turkey.onGround = false;
    game.turkey.vy = 120;
    game.farmerGap = 150;
    game.frozen = true;
    return;
  }
  if (shot === 'nearmiss') {
    game.startRun();
    game.distance = 486;
    game.score = 486 + 6 * CONFIG.cornPoints + CONFIG.piePoints;
    game.speed = 380;
    game.lives = 1;
    game.world.scrollX = 5100;
    game.hazards.items = [
      { kind: 'oven', x: 700, w: 130, h: 84 },
      { kind: 'knife-swing', x: 940, w: 30, h: 90, swingPhase: 1.2, swing: Math.sin(1.2), pivotY: 190 },
      { kind: 'knife-fly', x: 1080, w: 56, h: 16, y: CONFIG.groundY - 110, flySpeed: 150, flyPhase: 0.5 },
      { kind: 'corn', x: 830, y: CONFIG.groundY - 46 },
      { kind: 'corn', x: 874, y: CONFIG.groundY - 46 },
    ];
    game.turkey.y = CONFIG.groundY - 140; // clearing the oven, knife overhead
    game.turkey.onGround = false;
    game.turkey.vy = -60;
    game.farmerGap = 95; // the farmer is right behind: SPOTTED!
    game.warning = 'SPOTTED!';
    game.warningUntil = performance.now() / 1000 + 30;
    game.frozen = true;
    return;
  }
  if (shot === 'end') {
    game.startRun();
    game.distance = 512;
    game.score = 512 + 5 * CONFIG.cornPoints;
    game.best = Math.max(game.best, 512);
    game.state = 'caught';
    game.sounds.caughtSlide();
    return;
  }
  // Unknown ?shot value: ignore it and show the title.
  game.state = 'title';
}
