// Gobble Dash — main game: the state machine, the loop, the HUD and the
// four screens (title, run, caught, escaped).
//
// States: 'title' -> 'playing' -> 'paused' -> 'playing', and 'playing' ->
// 'caught' (farmer catches Gobbles or lives run out) or 'escaped' (the
// forest gate at 1000 m). Every screen is a real, playable state of the
// same game; R restarts from an end screen, Space / Enter starts from the
// title, P pauses, and the on-screen buttons do the same for the mouse.
import { CONFIG } from './config.js';
import { Input } from './input.js';
import { SoundBank } from './sound.js';
import { World } from './world.js';
import { Turkey, Farmer } from './turkey.js';
import { HazardField, FeatherBurst } from './hazards.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');

function fitCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = CONFIG.width * dpr;
  canvas.height = CONFIG.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

class Game {
  constructor() {
    this.input = new Input(canvas);
    this.sounds = new SoundBank();
    this.world = new World();
    this.turkey = new Turkey();
    this.farmer = new Farmer();
    this.hazards = new HazardField();
    this.feathers = new FeatherBurst();
    this.state = 'title';
    this.time = 0;
    this.distance = 0;
    this.score = 0;
    this.lives = CONFIG.lives;
    this.speed = CONFIG.baseSpeed;
    this.farmerGap = CONFIG.farmerStartGap;
    this.invulnerableUntil = 0;
    this.warning = '';
    this.warningUntil = 0;
    this.frozen = false; // staged screenshot scenes do not advance
    this.best = Number(localStorage.getItem('gobble-dash-best') || 0);
    this.endReason = '';
    this.frame = 0;
  }

  startRun() {
    this.state = 'playing';
    this.distance = 0;
    this.score = 0;
    this.lives = CONFIG.lives;
    this.speed = CONFIG.baseSpeed;
    this.farmerGap = CONFIG.farmerStartGap;
    this.invulnerableUntil = 0;
    this.warning = '';
    this.frozen = false;
    this.turkey.reset();
    this.farmer.reset();
    this.hazards.reset();
    this.feathers = new FeatherBurst();
    this.sounds.gobble();
    this.announce('Gobbles is running! Jump the fences, dodge the knives, reach the forest gate at 1000 metres.');
  }

  speedNow() {
    const progress = Math.min(1, this.distance / CONFIG.goalDistance);
    return CONFIG.baseSpeed + (CONFIG.maxSpeed - CONFIG.baseSpeed) * progress;
  }

  update(dt) {
    this.time += dt;
    this.frame += 1;
    if (this.frozen) {
      this.world.update(0, 0);
      return;
    }
    if (this.state === 'playing') {
      this.updateRun(dt);
    }
    this.world.update(dt, this.state === 'playing' ? this.speed : 60);
    this.feathers.update(dt);
  }

  updateRun(dt) {
    // Speed grows with distance; Left / Right nudge it slightly.
    this.speed = this.speedNow() + this.input.speedNudge() * CONFIG.speedNudge;
    this.speed = Math.max(140, this.speed);

    const turkey = this.turkey;
    turkey.sliding = this.input.sliding() && turkey.onGround;
    if (this.input.jumpPressed()) {
      if (turkey.jump()) this.sounds.jumpChirp();
    }
    turkey.update(dt, this.speed);
    this.farmer.update(dt, this.speed);

    // Distance and score.
    const metres = (this.speed * dt) / CONFIG.pxPerMetre;
    this.distance += metres;
    this.score += metres * CONFIG.pointsPerMetre;

    // The farmer: a clean stretch pulls Gobbles away; after 700 m he
    // closes on his own. A hit surges him closer (see takeHit).
    this.farmerGap = Math.min(
      CONFIG.farmerStartGap,
      this.farmerGap + CONFIG.farmerRecoverPerSecond * dt,
    );
    if (this.distance >= CONFIG.farmerLateStart) {
      this.farmerGap -= CONFIG.farmerLateClosingPerSecond * dt;
    }
    if (this.farmerGap <= 0) {
      this.endCaught('The farmer caught up with Gobbles.');
      return;
    }

    this.hazards.update(dt, this.speed, this.distance, CONFIG.width);

    // Collisions: hazards cost a life, pickups pay points.
    const turkeyBox = turkey.box();
    const invulnerable = this.time < this.invulnerableUntil;
    for (const item of [...this.hazards.items]) {
      const box = this.hazards.boxOf(item);
      if (!this.overlaps(turkeyBox, box)) continue;
      if (item.kind === 'corn') {
        this.score += CONFIG.cornPoints;
        this.sounds.cornPluck();
        this.hazards.items.splice(this.hazards.items.indexOf(item), 1);
      } else if (item.kind === 'pie') {
        this.score += CONFIG.piePoints;
        this.sounds.piePluck();
        this.hazards.items.splice(this.hazards.items.indexOf(item), 1);
      } else if (!invulnerable) {
        this.takeHit(item);
        if (this.state !== 'playing') return;
      }
    }

    if (this.distance >= CONFIG.goalDistance) {
      this.endEscaped();
    }
  }

  overlaps(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  takeHit(item) {
    this.lives -= 1;
    this.invulnerableUntil = this.time + CONFIG.invulnerableSeconds;
    this.farmerGap -= CONFIG.farmerSurgeOnHit;
    this.feathers.burst(this.turkey.x, this.turkey.y - 40);
    this.sounds.hitThud();
    this.warning = 'SPOTTED!';
    this.warningUntil = this.time + 1.4;
    this.sounds.spottedSting();
    this.announce(`Ouch! A ${item.kind} hit Gobbles. ${this.lives} ${this.lives === 1 ? 'life' : 'lives'} left. The farmer is closing in!`);
    if (this.lives <= 0 || this.farmerGap <= 0) {
      this.endCaught('Gobbles ran out of lives.');
    }
  }

  endCaught(reason) {
    this.state = 'caught';
    this.endReason = reason;
    this.best = Math.max(this.best, Math.floor(this.distance));
    localStorage.setItem('gobble-dash-best', String(this.best));
    this.sounds.caughtSlide();
    this.announce(`Caught! Thanksgiving dinner is served. Final score ${Math.floor(this.score)}, distance ${Math.floor(this.distance)} metres. Press R to run again.`);
  }

  endEscaped() {
    this.state = 'escaped';
    this.best = Math.max(this.best, Math.floor(this.distance));
    localStorage.setItem('gobble-dash-best', String(this.best));
    this.sounds.escapeJingle();
    this.announce(`Escaped! Gobbles lives to gobble another day. Final score ${Math.floor(this.score)}. Press R to run again.`);
  }

  announce(text) {
    statusLine.textContent = text;
  }

  handleInput() {
    const input = this.input;
    if (input.mutePressed()) {
      this.sounds.toggleMute();
    }
    if (input.clickedButton === 'start' || input.clickedButton === 'restart') {
      this.sounds.ensure();
      this.startRun();
      return;
    }
    if (input.clickedButton === 'pause') {
      if (this.state === 'playing') this.state = 'paused';
      else if (this.state === 'paused') this.state = 'playing';
      return;
    }
    if (input.clickedButton === 'mute') {
      this.sounds.toggleMute();
      return;
    }
    if (input.clickedButton === 'resume') {
      this.state = 'playing';
      return;
    }
    if (this.state === 'title') {
      if (input.startPressed() || input.clickedPoint) {
        this.sounds.ensure();
        this.startRun();
      }
    } else if (this.state === 'playing') {
      if (input.pausePressed()) this.state = 'paused';
    } else if (this.state === 'paused') {
      if (input.pausePressed()) this.state = 'playing';
    } else if (this.state === 'caught' || this.state === 'escaped') {
      if (input.restartPressed() || input.clickedPoint) {
        this.sounds.ensure();
        this.startRun();
      }
    }
  }

  // ---- drawing ----

  draw() {
    const { width, height, groundY } = CONFIG;
    ctx.clearRect(0, 0, width, height);
    this.world.draw(ctx, this.distance, this.time);

    // The forest gate approaches as the distance nears 1000 m.
    const gateDistancePx = (CONFIG.goalDistance - this.distance) * CONFIG.pxPerMetre;
    if (this.state === 'playing' || this.state === 'paused') {
      const gateScreenX = this.turkey.x + gateDistancePx + 500;
      if (gateDistancePx < 1600) this.world.drawForestGate(ctx, gateScreenX);
    } else if (this.state === 'escaped') {
      this.world.drawForestGate(ctx, this.turkey.x + 260);
    }

    this.hazards.draw(ctx, this.time);
    this.feathers.draw(ctx);

    const flashing = this.state === 'playing' && this.time < this.invulnerableUntil;
    if (this.state !== 'title') {
      const farmerX = this.turkey.x - this.farmerGap;
      this.farmer.draw(ctx, farmerX, this.time);
    }
    this.turkey.draw(ctx, this.time, flashing);

    if (this.state === 'title') this.drawTitle();
    else if (this.state === 'playing' || this.state === 'paused') this.drawHud();
    if (this.state === 'playing' && this.time < this.warningUntil && this.warning) {
      this.drawWarning();
    }
    if (this.state === 'paused') this.drawPause();
    if (this.state === 'caught') this.drawCaught();
    if (this.state === 'escaped') this.drawEscaped();
  }

  drawHud() {
    const { width } = CONFIG;
    ctx.fillStyle = 'rgba(60, 32, 8, 0.55)';
    ctx.fillRect(0, 0, width, 54);
    ctx.fillStyle = '#fff3d6';
    ctx.font = 'bold 24px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${Math.floor(this.score)}`, 20, 36);
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.floor(this.distance)} m / ${CONFIG.goalDistance} m`, width / 2, 36);
    // Three lives as little hearts.
    ctx.textAlign = 'right';
    let hearts = '';
    for (let i = 0; i < CONFIG.lives; i++) hearts += i < this.lives ? '♥ ' : '♡ ';
    ctx.fillStyle = this.lives === 1 ? '#ff6b5e' : '#ff8fa3';
    ctx.fillText(hearts.trim(), width - 170, 36);
    // Progress bar to the forest gate.
    const progress = Math.min(1, this.distance / CONFIG.goalDistance);
    ctx.fillStyle = 'rgba(255, 243, 214, 0.35)';
    ctx.fillRect(20, 58, width - 40, 7);
    ctx.fillStyle = '#2f6b3a';
    ctx.fillRect(20, 58, (width - 40) * progress, 7);
    // Pause and mute buttons (clickable, and shown on the HUD).
    this.drawButton('pause', width - 108, 8, 44, 38, 'II');
    this.drawButton('mute', width - 56, 8, 44, 38, this.sounds.muted ? '✕' : '♪');
  }

  drawButton(id, x, y, w, h, label) {
    ctx.fillStyle = 'rgba(255, 243, 214, 0.92)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = '#8a5a2b';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#5d3a1a';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2 + 1);
    ctx.textBaseline = 'alphabetic';
    this.input.registerButton(id, x, y, w, h);
  }

  drawBigButton(id, x, y, w, h, label) {
    ctx.fillStyle = '#c94f2e';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = '#fff3d6';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#fff3d6';
    ctx.font = 'bold 28px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2 + 1);
    ctx.textBaseline = 'alphabetic';
    this.input.registerButton(id, x, y, w, h);
  }

  drawTitle() {
    const { width, height, groundY } = CONFIG;
    // Warm panel behind the title.
    ctx.fillStyle = 'rgba(60, 32, 8, 0.45)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#fff3d6';
    ctx.textAlign = 'center';
    ctx.font = 'bold 84px Georgia, serif';
    ctx.fillText('GOBBLE DASH', width / 2, 150);
    ctx.fillStyle = '#f2b234';
    ctx.font = 'italic bold 34px Georgia, serif';
    ctx.fillText('The Great Turkey Escape', width / 2, 200);
    // The turkey stands proud at the right edge and the farmer looms at
    // the left, clear of the centred text lines.
    this.turkey.x = width - 190;
    this.turkey.y = groundY;
    this.turkey.onGround = true;
    this.turkey.draw(ctx, this.time, false);
    this.farmer.draw(ctx, 190, this.time);

    ctx.fillStyle = '#fff3d6';
    ctx.font = 'bold 30px Georgia, serif';
    ctx.fillText('Press SPACE or click to run', width / 2, 470);
    ctx.font = '21px Georgia, serif';
    ctx.fillText('Space / Up to jump · Down to slide · Left / Right to nudge speed · P to pause', width / 2, 508);
    ctx.fillText('Jump fences and ovens, dodge the carving knives, grab corn and pie. Reach the forest gate at 1000 m!', width / 2, 538);
    if (this.best > 0) {
      ctx.fillStyle = '#f2b234';
      ctx.font = 'bold 22px Georgia, serif';
      ctx.fillText(`Best distance: ${this.best} m`, width / 2, 576);
    }
    this.drawBigButton('start', width / 2 - 130, 600, 260, 62, 'START RUN');
    this.drawButton('mute', width - 70, 14, 52, 40, this.sounds.muted ? '✕' : '♪');
    this.announce('Gobble Dash, the great turkey escape. Press Space or click Start to run.');
  }

  drawWarning() {
    const { width } = CONFIG;
    ctx.save();
    ctx.translate(width / 2, 130);
    const pulse = 1 + Math.sin(this.time * 10) * 0.06;
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#d94f30';
    ctx.font = 'bold 44px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.warning, 0, 0);
    ctx.restore();
  }

  drawPause() {
    const { width, height } = CONFIG;
    ctx.fillStyle = 'rgba(60, 32, 8, 0.6)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#fff3d6';
    ctx.textAlign = 'center';
    ctx.font = 'bold 56px Georgia, serif';
    ctx.fillText('PAUSED', width / 2, 260);
    ctx.font = '22px Georgia, serif';
    ctx.fillText('Space / Up — jump      Down — slide      Left / Right — nudge speed', width / 2, 330);
    ctx.fillText('P — resume      M — mute      R — restart after the run ends', width / 2, 366);
    this.drawBigButton('resume', width / 2 - 130, 420, 260, 62, 'RESUME');
  }

  drawCaught() {
    const { width, height } = CONFIG;
    ctx.fillStyle = 'rgba(60, 20, 8, 0.62)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#ffb3a3';
    ctx.textAlign = 'center';
    ctx.font = 'bold 72px Georgia, serif';
    ctx.fillText('CAUGHT!', width / 2, 240);
    ctx.fillStyle = '#fff3d6';
    ctx.font = 'italic 30px Georgia, serif';
    ctx.fillText('Thanksgiving dinner is served...', width / 2, 292);
    ctx.font = '26px Georgia, serif';
    ctx.fillText(`Final score: ${Math.floor(this.score)}    Distance: ${Math.floor(this.distance)} m`, width / 2, 360);
    ctx.fillText(`Best distance: ${this.best} m`, width / 2, 398);
    ctx.font = '22px Georgia, serif';
    ctx.fillText('Press R or click to run again', width / 2, 448);
    this.drawBigButton('restart', width / 2 - 130, 490, 260, 62, 'RUN AGAIN');
  }

  drawEscaped() {
    const { width, height } = CONFIG;
    ctx.fillStyle = 'rgba(20, 60, 20, 0.55)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#ffe9a8';
    ctx.textAlign = 'center';
    ctx.font = 'bold 68px Georgia, serif';
    ctx.fillText('ESCAPED!', width / 2, 240);
    ctx.fillStyle = '#fff3d6';
    ctx.font = 'italic 30px Georgia, serif';
    ctx.fillText('Gobbles lives to gobble another day!', width / 2, 292);
    ctx.font = '26px Georgia, serif';
    ctx.fillText(`Final score: ${Math.floor(this.score)}    Distance: ${Math.floor(this.distance)} m`, width / 2, 360);
    ctx.fillText(`Best distance: ${this.best} m`, width / 2, 398);
    ctx.font = '22px Georgia, serif';
    ctx.fillText('Press R or click to run again', width / 2, 448);
    this.drawBigButton('restart', width / 2 - 130, 490, 260, 62, 'RUN AGAIN');
  }
}

const game = new Game();

// Screenshot staging: ?shot=title|play|nearmiss|end renders one scene.
const shot = new URLSearchParams(window.location.search).get('shot');
if (shot) {
  stageShot(game, shot);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.handleInput();
  game.update(dt);
  game.draw();
  game.input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
