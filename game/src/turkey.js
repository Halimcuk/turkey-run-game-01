// Gobble Dash characters: Gobbles the turkey and the farmer chasing him.
//
// Both are drawn by code (shapes and colours on the canvas): a round brown
// turkey with a red wattle and fanned tail, and a farmer in overalls with a
// straw hat and a carving knife. Their motion is a run cycle driven by the
// game clock, so they look alive even standing still.
import { CONFIG } from './config.js';

export class Turkey {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = CONFIG.turkeyX;
    this.y = CONFIG.groundY; // feet on the ground
    this.vy = 0;
    this.onGround = true;
    this.sliding = false;
    this.invulnerableUntil = 0;
    this.runPhase = 0;
  }

  get height() {
    return this.sliding ? CONFIG.turkeySlideHeight : CONFIG.turkeyHeight;
  }

  get width() {
    return this.sliding ? CONFIG.turkeyWidth + 18 : CONFIG.turkeyWidth;
  }

  // The collision box: top-left x/y plus width/height.
  box() {
    return { x: this.x - this.width / 2, y: this.y - this.height, w: this.width, h: this.height };
  }

  jump() {
    if (!this.onGround) return false;
    this.vy = CONFIG.jumpVelocity;
    this.onGround = false;
    this.sliding = false;
    return true;
  }

  update(dt, speed) {
    this.runPhase += dt * (6 + speed / 60);
    if (!this.onGround) {
      this.vy += CONFIG.gravity * dt;
      this.y += this.vy * dt;
      if (this.y >= CONFIG.groundY) {
        this.y = CONFIG.groundY;
        this.vy = 0;
        this.onGround = true;
      }
    }
  }

  draw(ctx, time, flashing) {
    if (flashing && Math.floor(time * 14) % 2 === 0) return; // hit flash
    const x = this.x;
    const y = this.y;
    const bob = this.onGround ? Math.sin(this.runPhase) * 3 : 0;
    ctx.save();
    ctx.translate(x, y + bob);

    if (this.sliding) {
      // Low slide: body stretched flat, tail streaming behind.
      ctx.fillStyle = '#8a5a2b';
      ctx.beginPath();
      ctx.ellipse(-6, -16, 40, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c98a4b';
      ctx.beginPath();
      ctx.arc(30, -20, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d94f30';
      ctx.beginPath();
      ctx.arc(38, -10, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f2b234';
      ctx.beginPath();
      ctx.moveTo(30, -24);
      ctx.lineTo(40, -28);
      ctx.lineTo(36, -18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#5d3a1a';
      ctx.beginPath();
      ctx.ellipse(-44, -12, 18, 7, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // Fanned tail feathers.
    const tailColors = ['#b5651d', '#d98e2b', '#8a5a2b', '#c94f2e', '#b5651d'];
    for (let i = 0; i < 5; i++) {
      const angle = -Math.PI / 2 + (i - 2) * 0.42;
      ctx.save();
      ctx.rotate(angle);
      ctx.fillStyle = tailColors[i];
      ctx.beginPath();
      ctx.ellipse(0, -52, 9, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f2b234';
      ctx.beginPath();
      ctx.ellipse(0, -74, 4, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Round body.
    ctx.fillStyle = '#8a5a2b';
    ctx.beginPath();
    ctx.ellipse(0, -34, 30, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a06a35';
    ctx.beginPath();
    ctx.ellipse(0, -28, 20, 24, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs, mid-stride.
    const legSwing = this.onGround ? Math.sin(this.runPhase) * 10 : 8;
    ctx.strokeStyle = '#e8a33c';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-8, -6);
    ctx.lineTo(-8 + legSwing, 0);
    ctx.moveTo(8, -6);
    ctx.lineTo(8 - legSwing, 0);
    ctx.stroke();

    // Wing.
    ctx.fillStyle = '#6f4520';
    ctx.beginPath();
    ctx.ellipse(-6, -34, 16, 22, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Neck and head.
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(14, -72, 12, 30);
    ctx.fillStyle = '#c98a4b';
    ctx.beginPath();
    ctx.arc(22, -76, 15, 0, Math.PI * 2);
    ctx.fill();
    // Red wattle.
    ctx.fillStyle = '#d94f30';
    ctx.beginPath();
    ctx.ellipse(28, -66, 5, 9, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Beak.
    ctx.fillStyle = '#f2b234';
    ctx.beginPath();
    ctx.moveTo(34, -80);
    ctx.lineTo(46, -76);
    ctx.lineTo(34, -70);
    ctx.closePath();
    ctx.fill();
    // Eye.
    ctx.fillStyle = '#1c1c1c';
    ctx.beginPath();
    ctx.arc(26, -80, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(27, -81, 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class Farmer {
  constructor() {
    this.reset();
  }

  reset() {
    this.runPhase = 0;
    // Screen x, set every frame from the turkey's x minus the gap.
    this.x = 0;
  }

  update(dt, speed) {
    this.runPhase += dt * (7 + speed / 55);
  }

  draw(ctx, x, time) {
    this.x = x;
    const y = CONFIG.groundY;
    const bob = Math.sin(this.runPhase) * 3;
    ctx.save();
    ctx.translate(x, y + bob);

    const legSwing = Math.sin(this.runPhase) * 12;
    // Legs in overalls.
    ctx.strokeStyle = '#3a5a8a';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(-6, -52);
    ctx.lineTo(-6 + legSwing, 0);
    ctx.moveTo(6, -52);
    ctx.lineTo(6 - legSwing, 0);
    ctx.stroke();

    // Overalls body.
    ctx.fillStyle = '#3a5a8a';
    ctx.fillRect(-16, -96, 32, 48);
    // Checked shirt sleeves.
    ctx.fillStyle = '#c94f2e';
    ctx.fillRect(-22, -92, 10, 26);
    ctx.fillRect(12, -92, 10, 26);

    // Arm reaching forward, carving knife in hand.
    ctx.strokeStyle = '#c94f2e';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(14, -88);
    ctx.lineTo(34, -72);
    ctx.stroke();
    ctx.save();
    ctx.translate(38, -70);
    ctx.rotate(0.5 + Math.sin(time * 3) * 0.12);
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(0, -3, 14, 6);
    ctx.fillStyle = '#d9d9d9';
    ctx.beginPath();
    ctx.moveTo(14, -6);
    ctx.lineTo(44, -2);
    ctx.lineTo(14, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Head.
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath();
    ctx.arc(0, -110, 15, 0, Math.PI * 2);
    ctx.fill();
    // Angry moustache.
    ctx.fillStyle = '#5d3a1a';
    ctx.fillRect(-8, -102, 16, 4);
    // Straw hat.
    ctx.fillStyle = '#e8c33c';
    ctx.beginPath();
    ctx.ellipse(0, -120, 26, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-13, -136, 26, 16);
    ctx.fillStyle = '#a33327';
    ctx.fillRect(-13, -124, 26, 4);

    ctx.restore();
  }
}
