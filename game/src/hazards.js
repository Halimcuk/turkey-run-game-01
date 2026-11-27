// Gobble Dash hazards and pickups: fences, hay bales, the glowing oven,
// swinging and flying carving knives, plus corn kernels and pumpkin-pie
// slices to collect.
//
// Hazards spawn ahead of the turkey at a gap that shrinks with distance;
// after 400 m knives appear more often, after 700 m the gaps shrink
// further. Every hazard carries its own collision box, so the main loop
// only has to ask: does this box touch the turkey's box?
import { CONFIG } from './config.js';

function randomPick(rand, items) {
  return items[Math.floor(rand() * items.length)];
}

export class HazardField {
  constructor() {
    this.items = []; // hazards and pickups, in spawn order
    this.nextSpawnX = 900;
    this.rand = Math.random;
  }

  reset(rand = Math.random) {
    this.items = [];
    this.nextSpawnX = 900;
    this.rand = rand;
  }

  // Gap between hazards in px, shrinking with distance.
  spawnGap(distance) {
    const progress = Math.min(1, distance / CONFIG.spawnGapShrinkAfter);
    return CONFIG.spawnGapStart - (CONFIG.spawnGapStart - CONFIG.spawnGapEnd) * progress;
  }

  update(dt, speed, distance, screenWidth) {
    // Move everything left at the run speed.
    for (const item of this.items) item.x -= speed * dt;
    this.items = this.items.filter((item) => item.x > -220);

    // Spawn a new hazard (and sometimes a pickup line) ahead of the screen.
    const farthest = this.items.reduce((max, item) => Math.max(max, item.x), 0);
    if (farthest < screenWidth - 40) {
      this.spawn(distance, Math.max(this.nextSpawnX, screenWidth + 120));
      this.nextSpawnX = screenWidth + 120 + this.spawnGap(distance) * (0.8 + this.rand() * 0.5);
    }

    // Swinging knives sweep down and back up.
    for (const item of this.items) {
      if (item.kind === 'knife-swing') {
        item.swingPhase += dt * 2.6;
        item.swing = Math.sin(item.swingPhase);
      }
      if (item.kind === 'knife-fly') {
        item.x -= item.flySpeed * dt;
        item.y += Math.sin(item.flyPhase) * 30 * dt;
        item.flyPhase += dt * 6;
      }
    }
  }

  spawn(distance, x) {
    const roll = this.rand();
    const knivesAllowed = distance >= CONFIG.knifeStartDistance;
    let kind;
    if (knivesAllowed && roll < 0.3) kind = randomPick(this.rand, ['knife-swing', 'knife-fly']);
    else if (roll < 0.52) kind = 'fence';
    else if (roll < 0.74) kind = 'hay';
    else kind = 'oven';

    const item = { kind, x };
    if (kind === 'fence') {
      item.w = 46;
      item.h = 74;
    } else if (kind === 'hay') {
      item.w = 96;
      item.h = 56;
    } else if (kind === 'oven') {
      item.w = 130;
      item.h = 84;
    } else if (kind === 'knife-swing') {
      item.w = 30;
      item.h = 90;
      item.swingPhase = 0;
      item.swing = 0;
      item.pivotY = 190;
    } else {
      // knife-fly: crosses the path at jump height.
      item.w = 56;
      item.h = 16;
      item.y = CONFIG.groundY - 96 - this.rand() * 60;
      item.flySpeed = 120 + this.rand() * 80;
      item.flyPhase = this.rand() * Math.PI * 2;
    }
    this.items.push(item);

    // A line of corn (or one pie slice) rides just past the hazard.
    const treatRoll = this.rand();
    const treatX = x + item.w + 90;
    if (treatRoll < 0.55) {
      for (let i = 0; i < 3; i++) {
        this.items.push({ kind: 'corn', x: treatX + i * 44, y: CONFIG.groundY - 46 });
      }
    } else if (treatRoll < 0.75) {
      this.items.push({ kind: 'pie', x: treatX, y: CONFIG.groundY - 120 });
    }
  }

  // The collision box of one item, in screen coordinates.
  boxOf(item) {
    if (item.kind === 'corn' || item.kind === 'pie') {
      return { x: item.x - 16, y: item.y - 16, w: 32, h: 32 };
    }
    if (item.kind === 'knife-swing') {
      // The blade hangs from a pivot at the top; its tip sweeps down.
      const tipY = item.pivotY + 150 + item.swing * 90;
      return { x: item.x - 12, y: tipY - 70, w: 24, h: 80 };
    }
    if (item.kind === 'knife-fly') {
      return { x: item.x - 28, y: item.y - 8, w: 56, h: 16 };
    }
    return { x: item.x - item.w / 2, y: CONFIG.groundY - item.h, w: item.w, h: item.h };
  }

  draw(ctx, time) {
    for (const item of this.items) {
      if (item.kind === 'corn') this.drawCorn(ctx, item);
      else if (item.kind === 'pie') this.drawPie(ctx, item);
      else if (item.kind === 'fence') this.drawFence(ctx, item);
      else if (item.kind === 'hay') this.drawHay(ctx, item);
      else if (item.kind === 'oven') this.drawOven(ctx, item, time);
      else if (item.kind === 'knife-swing') this.drawSwingKnife(ctx, item);
      else if (item.kind === 'knife-fly') this.drawFlyingKnife(ctx, item);
    }
  }

  drawCorn(ctx, item) {
    const bob = Math.sin(item.x * 0.02) * 3;
    ctx.fillStyle = '#f2b234';
    ctx.beginPath();
    ctx.ellipse(item.x, item.y + bob, 13, 20, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8a33c';
    ctx.beginPath();
    ctx.ellipse(item.x - 3, item.y + bob - 4, 7, 12, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5d8148';
    ctx.beginPath();
    ctx.moveTo(item.x - 8, item.y + bob + 16);
    ctx.lineTo(item.x + 8, item.y + bob + 16);
    ctx.lineTo(item.x, item.y + bob + 30);
    ctx.closePath();
    ctx.fill();
  }

  drawPie(ctx, item) {
    const bob = Math.sin(item.x * 0.02 + 1) * 3;
    ctx.save();
    ctx.translate(item.x, item.y + bob);
    ctx.fillStyle = '#e07830';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(30, -12);
    ctx.lineTo(30, 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f6c177';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(30, -12);
    ctx.lineTo(30, 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff3d6';
    ctx.beginPath();
    ctx.ellipse(18, 0, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawFence(ctx, item) {
    const x = item.x - item.w / 2;
    const top = CONFIG.groundY - item.h;
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(x, top + 18, 8, item.h - 18);
    ctx.fillRect(x + item.w - 8, top + 18, 8, item.h - 18);
    ctx.fillStyle = '#a06a35';
    ctx.fillRect(x - 6, top + 8, item.w + 12, 10);
    ctx.fillRect(x - 6, top + 38, item.w + 12, 10);
    ctx.fillStyle = '#f2b234';
    ctx.font = 'bold 13px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', x + item.w / 2, top + 2);
  }

  drawHay(ctx, item) {
    const x = item.x - item.w / 2;
    const top = CONFIG.groundY - item.h;
    ctx.fillStyle = '#d9a441';
    ctx.beginPath();
    ctx.ellipse(item.x, CONFIG.groundY - item.h / 2, item.w / 2, item.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b57f22';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(item.x, CONFIG.groundY - item.h / 2, item.w / 2 - 10, item.h / 2 - 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(item.x, CONFIG.groundY - item.h / 2, item.w / 4, item.h / 4, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawOven(ctx, item, time) {
    const x = item.x - item.w / 2;
    const top = CONFIG.groundY - item.h;
    // Brick oven body.
    ctx.fillStyle = '#9a4a2e';
    ctx.fillRect(x, top, item.w, item.h);
    ctx.strokeStyle = '#7a3a22';
    ctx.lineWidth = 2;
    for (let row = 0; row < 3; row++) {
      ctx.beginPath();
      ctx.moveTo(x, top + 26 + row * 26);
      ctx.lineTo(x + item.w, top + 26 + row * 26);
      ctx.stroke();
    }
    // Glowing mouth: the part that burns. Jump it, do not touch it.
    const glow = 0.6 + Math.sin(time * 6 + item.x) * 0.4;
    ctx.fillStyle = `rgba(255, ${Math.floor(120 + glow * 90)}, 20, 1)`;
    ctx.beginPath();
    ctx.ellipse(item.x, CONFIG.groundY - 26, 44, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd977';
    ctx.beginPath();
    ctx.ellipse(item.x, CONFIG.groundY - 24, 26, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    // Heat shimmer marks.
    ctx.fillStyle = `rgba(255, 90, 20, ${0.5 + glow * 0.4})`;
    ctx.font = 'bold 15px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('HOT!', item.x, top - 8);
    // Chimney.
    ctx.fillStyle = '#7a3a22';
    ctx.fillRect(x + item.w - 34, top - 26, 22, 26);
  }

  drawSwingKnife(ctx, item) {
    const tipY = item.pivotY + 150 + item.swing * 90;
    ctx.strokeStyle = '#5d3a1a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(item.x, 0);
    ctx.lineTo(item.x, item.pivotY);
    ctx.stroke();
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(item.x - 14, item.pivotY - 8, 28, 16);
    // Blade pointing down from the pivot block.
    ctx.fillStyle = '#d9d9d9';
    ctx.beginPath();
    ctx.moveTo(item.x - 10, item.pivotY + 8);
    ctx.lineTo(item.x + 10, item.pivotY + 8);
    ctx.lineTo(item.x, tipY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#b0b0b0';
    ctx.beginPath();
    ctx.moveTo(item.x - 10, item.pivotY + 8);
    ctx.lineTo(item.x, tipY);
    ctx.lineTo(item.x - 4, item.pivotY + 8);
    ctx.closePath();
    ctx.fill();
  }

  drawFlyingKnife(ctx, item) {
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(0.35);
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(-30, -4, 16, 8);
    ctx.fillStyle = '#d9d9d9';
    ctx.beginPath();
    ctx.moveTo(-14, -7);
    ctx.lineTo(28, -2);
    ctx.lineTo(-14, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

// A burst of feathers when Gobbles takes a hard hit.
export class FeatherBurst {
  constructor() {
    this.feathers = [];
  }

  burst(x, y) {
    for (let i = 0; i < 26; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 260;
      this.feathers.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 120,
        size: 4 + Math.random() * 7,
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 10,
        color: ['#8a5a2b', '#b5651d', '#d98e2b', '#f2b234'][i % 4],
        life: 0.9 + Math.random() * 0.4,
      });
    }
  }

  update(dt) {
    for (const feather of this.feathers) {
      feather.x += feather.vx * dt;
      feather.y += feather.vy * dt;
      feather.vy += 500 * dt;
      feather.rot += feather.spin * dt;
      feather.life -= dt;
    }
    this.feathers = this.feathers.filter((f) => f.life > 0);
  }

  draw(ctx) {
    for (const feather of this.feathers) {
      ctx.save();
      ctx.translate(feather.x, feather.y);
      ctx.rotate(feather.rot);
      ctx.globalAlpha = Math.max(0, Math.min(1, feather.life));
      ctx.fillStyle = feather.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, feather.size, feather.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}
