// Gobble Dash tuning: every number the runner plays by lives here, so a
// balance pass touches one file and nothing else.
export const CONFIG = {
  // Canvas the game is drawn at (scaled by CSS to fit the window).
  width: 1280,
  height: 720,
  groundY: 600,

  // The forest gate stands at this distance in metres. Reach it and Gobbles
  // is free.
  goalDistance: 1000,

  // Speed in px/s. The ground scrolls faster the further Gobbles gets.
  baseSpeed: 260,
  maxSpeed: 560,
  // Left / Right (or A / D) nudge the speed by this much while held.
  speedNudge: 60,

  // Turkey physics.
  gravity: 2600,
  jumpVelocity: -950,
  // The turkey's box, standing and sliding (slide is low and long).
  turkeyWidth: 64,
  turkeyHeight: 78,
  turkeySlideHeight: 34,
  turkeyX: 230,

  // The farmer starts this far behind the turkey (px). A hit surges him
  // closer; a clean stretch lets Gobbles pull away again. Gap 0 = caught.
  farmerStartGap: 170,
  farmerSurgeOnHit: 55,
  farmerRecoverPerSecond: 6,
  // After 700 m the farmer runs faster: the gap also closes on its own.
  farmerLateClosingPerSecond: 4,
  farmerLateStart: 700,

  // Lives and mercy.
  lives: 3,
  invulnerableSeconds: 1.6,

  // Scoring.
  pointsPerMetre: 1,
  cornPoints: 10,
  piePoints: 50,

  // Difficulty: hazards spawn this far apart (px), shrinking with distance.
  spawnGapStart: 520,
  spawnGapEnd: 300,
  spawnGapShrinkAfter: 700,
  // Knives join the mix after 400 m and get more common after that.
  knifeStartDistance: 400,

  // Pixels per metre of distance shown in the HUD.
  pxPerMetre: 8,
};
