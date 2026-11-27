// Gobble Dash world: the scrolling autumn landscape Gobbles runs through.
//
// The farmyard (farmhouse and barn) gives way to the kitchen garden and
// finally the pine forest and its gate at 1000 m. The ground, trees, fence
// posts and falling leaves all scroll at the run speed, parallaxed so the
// far hills drift slowly and the near grass rushes past.
import { CONFIG } from './config.js';

// Deterministic pseudo-random from a seed, so a staged screenshot scene
// looks the same every time it is taken.
export function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export class World {
  constructor() {
    this.scrollX = 0;
    this.leaves = [];
    const rand = seededRandom(20261127);
    for (let i = 0; i < 42; i++) {
      this.leaves.push({
        x: rand() * CONFIG.width,
        y: rand() * 420,
        size: 5 + rand() * 7,
        speed: 22 + rand() * 30,
        sway: rand() * Math.PI * 2,
        color: ['#e07830', '#f2b234', '#c94f2e', '#d98e2b'][i % 4],
      });
    }
  }

  update(dt, speed) {
    this.scrollX += speed * dt;
    for (const leaf of this.leaves) {
      leaf.y += leaf.speed * dt;
      leaf.x += Math.sin(leaf.sway + this.scrollX * 0.002) * 18 * dt - speed * 0.12 * dt;
      if (leaf.y > CONFIG.groundY) {
        leaf.y = -10;
        leaf.x = Math.random() * CONFIG.width;
      }
      if (leaf.x < -12) leaf.x = CONFIG.width + 10;
    }
  }

  // Which stretch of countryside the run is in, from the distance in metres.
  zone(distance) {
    if (distance < 350) return 'farmyard';
    if (distance < 700) return 'garden';
    return 'forest';
  }

  draw(ctx, distance, time) {
    const { width, height, groundY } = CONFIG;
    const zone = this.zone(distance);

    // Sky: warm cream to soft orange, deepening toward the forest.
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    if (zone === 'forest') {
      sky.addColorStop(0, '#f7d9a0');
      sky.addColorStop(1, '#e8a35c');
    } else {
      sky.addColorStop(0, '#fdeec9');
      sky.addColorStop(1, '#f6c177');
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, groundY);

    // Sun.
    ctx.fillStyle = '#ffd977';
    ctx.beginPath();
    ctx.arc(1080, 110, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(1080, 110, 34, 0, Math.PI * 2);
    ctx.fill();

    // Far hills, drifting slowly (parallax 0.15).
    ctx.fillStyle = zone === 'forest' ? '#7d9b5e' : '#c9a35f';
    this.drawHills(ctx, this.scrollX * 0.15, groundY, 150, '#b98d4e', width, height);
    ctx.fillStyle = zone === 'forest' ? '#5d8148' : '#a87f42';
    this.drawHills(ctx, this.scrollX * 0.3 + 400, groundY, 110, '#a87f42', width, height);

    this.drawBackdrop(ctx, distance, zone);

    // Ground: packed dirt path with grassy edges.
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(0, groundY, width, height - groundY);
    ctx.fillStyle = '#b07a3e';
    ctx.fillRect(0, groundY, width, 10);
    ctx.fillStyle = '#6f9e4a';
    ctx.fillRect(0, groundY, width, 6);
    // Rushing grass tufts (parallax 1).
    ctx.strokeStyle = '#5d8148';
    ctx.lineWidth = 3;
    const tuftSpacing = 90;
    const tuftOffset = -(this.scrollX % tuftSpacing);
    for (let x = tuftOffset; x < width; x += tuftSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, groundY + 26);
      ctx.lineTo(x + 6, groundY + 12);
      ctx.moveTo(x + 12, groundY + 26);
      ctx.lineTo(x + 16, groundY + 14);
      ctx.stroke();
    }

    // Falling autumn leaves.
    for (const leaf of this.leaves) {
      ctx.save();
      ctx.translate(leaf.x, leaf.y);
      ctx.rotate(Math.sin(leaf.sway + time * 2) * 0.8);
      ctx.fillStyle = leaf.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, leaf.size, leaf.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawHills(ctx, offset, groundY, height, color, width) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    const step = 220;
    const start = -(offset % step);
    for (let x = start; x <= width + step; x += step) {
      ctx.quadraticCurveTo(x + step / 2, groundY - height, x + step, groundY);
    }
    ctx.lineTo(width, groundY);
    ctx.closePath();
    ctx.fill();
  }

  drawBackdrop(ctx, distance, zone) {
    const { width, groundY } = CONFIG;
    // Farmhouse and barn stand in the farmyard; the garden has pumpkin
    // patches and scarecrows; the forest has pines closing in.
    if (zone === 'farmyard') {
      this.drawFarmhouse(ctx, 880 - (this.scrollX * 0.5 % 1600), groundY);
      this.drawBarn(ctx, 300 - (this.scrollX * 0.5 % 1600), groundY);
    } else if (zone === 'garden') {
      this.drawPumpkinPatch(ctx, groundY);
      this.drawScarecrow(ctx, 980 - (this.scrollX * 0.6 % 1400), groundY);
    } else {
      this.drawPineRow(ctx, groundY);
    }
  }

  drawFarmhouse(ctx, x, groundY) {
    if (x < -260 || x > CONFIG.width + 40) return;
    ctx.fillStyle = '#f3e2c2';
    ctx.fillRect(x, groundY - 130, 200, 130);
    ctx.fillStyle = '#a34a2a';
    ctx.beginPath();
    ctx.moveTo(x - 14, groundY - 130);
    ctx.lineTo(x + 100, groundY - 200);
    ctx.lineTo(x + 214, groundY - 130);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#7a3b1e';
    ctx.fillRect(x + 84, groundY - 62, 34, 62);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(x + 24, groundY - 108, 34, 34);
    ctx.fillRect(x + 142, groundY - 108, 34, 34);
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(x + 92, groundY - 216, 16, 26);
  }

  drawBarn(ctx, x, groundY) {
    if (x < -260 || x > CONFIG.width + 40) return;
    ctx.fillStyle = '#a33327';
    ctx.fillRect(x, groundY - 120, 180, 120);
    ctx.fillStyle = '#7e241b';
    ctx.beginPath();
    ctx.moveTo(x, groundY - 120);
    ctx.quadraticCurveTo(x + 90, groundY - 190, x + 180, groundY - 120);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#f3e2c2';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x + 90, groundY - 120);
    ctx.lineTo(x + 90, groundY - 40);
    ctx.moveTo(x + 50, groundY - 80);
    ctx.lineTo(x + 130, groundY - 80);
    ctx.stroke();
    ctx.fillStyle = '#5d1f16';
    ctx.fillRect(x + 66, groundY - 80, 48, 80);
  }

  drawPumpkinPatch(ctx, groundY) {
    ctx.fillStyle = '#e07830';
    const offset = -(this.scrollX % 260);
    for (let x = offset; x < CONFIG.width; x += 260) {
      ctx.beginPath();
      ctx.ellipse(x + 40, groundY - 16, 26, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + 90, groundY - 14, 20, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#5d8148';
    ctx.fillRect(0, groundY - 4, CONFIG.width, 4);
  }

  drawScarecrow(ctx, x, groundY) {
    if (x < -80 || x > CONFIG.width + 40) return;
    ctx.strokeStyle = '#6b4a26';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x, groundY - 110);
    ctx.lineTo(x, groundY);
    ctx.moveTo(x - 34, groundY - 84);
    ctx.lineTo(x + 34, groundY - 84);
    ctx.stroke();
    ctx.fillStyle = '#e8c33c';
    ctx.beginPath();
    ctx.arc(x, groundY - 122, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c94f2e';
    ctx.beginPath();
    ctx.moveTo(x - 24, groundY - 132);
    ctx.lineTo(x + 24, groundY - 132);
    ctx.lineTo(x, groundY - 148);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#4a6fa5';
    ctx.fillRect(x - 30, groundY - 84, 60, 46);
  }

  drawPineRow(ctx, groundY) {
    const spacing = 130;
    const offset = -(this.scrollX * 0.7 % spacing);
    for (let x = offset - 60; x < CONFIG.width + 60; x += spacing) {
      this.drawPine(ctx, x, groundY - 8, 150);
    }
  }

  drawPine(ctx, x, baseY, height) {
    ctx.fillStyle = '#6b4a26';
    ctx.fillRect(x - 7, baseY - 26, 14, 26);
    ctx.fillStyle = '#2f6b3a';
    for (let i = 0; i < 3; i++) {
      const w = 84 - i * 22;
      const y = baseY - 20 - i * 42;
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y);
      ctx.lineTo(x, y - 52);
      ctx.lineTo(x + w / 2, y);
      ctx.closePath();
      ctx.fill();
    }
  }

  // The forest gate: two pine posts and a woven arch. Reaching it wins.
  drawForestGate(ctx, gateScreenX) {
    const { groundY } = CONFIG;
    if (gateScreenX < -200 || gateScreenX > CONFIG.width + 200) return;
    ctx.fillStyle = '#5d3a1a';
    ctx.fillRect(gateScreenX - 90, groundY - 210, 22, 210);
    ctx.fillRect(gateScreenX + 68, groundY - 210, 22, 210);
    this.drawPine(ctx, gateScreenX - 79, groundY - 200, 90);
    this.drawPine(ctx, gateScreenX + 79, groundY - 200, 90);
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(gateScreenX - 90, groundY - 218, 180, 16);
    ctx.fillStyle = '#f2b234';
    ctx.font = 'bold 26px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('FOREST GATE', gateScreenX, groundY - 228);
    ctx.fillStyle = '#2f6b3a';
    ctx.fillRect(gateScreenX - 90, groundY - 4, 180, 4);
  }
}
