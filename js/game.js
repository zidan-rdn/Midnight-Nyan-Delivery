const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

const ROOF_TIERS = [190, 220, 290]; 
const FALL_LIMIT = H; 

// ASSETS 
function loadImg(src) {
  const img = new Image();
  img.src = '../assets/' + src;
  return img;
}

const assets = {
  runFrames: [
    loadImg('Aksi1Lari_1.png'),
    loadImg('Aksi2Lari_1.png'),
    loadImg('Aksi3Lari_1.png'),
    loadImg('Aksi4Lari_1.png'),
  ],
  jumpFrame: loadImg('Aksi_Lompat1.png'),
  antena1: loadImg('Antena_1.png'),
  antena2: loadImg('Antena_2.png'),
  cerobong: loadImg('Cerobong_Asap.png'),
  bintang: loadImg('Bintang.png'),
  moon: loadImg('Moon.png'),
  siluet100: loadImg('Siluet_100.png'),
  siluet50: loadImg('Siluet_50.png'),
  bglangit: loadImg('BgLangit.png'),
  gameOverImg: loadImg('Game_Over.png'),
  buildings: [
    loadImg('Gedung_11.png'),
    loadImg('Gedung_2.png'),
    loadImg('Gedung_3.png'),
    loadImg('Gedung_3A.png'),
    loadImg('Gedung_4.png'),
  ],
  finishBuilding: loadImg('Gedung_5.png') 
};

// Shiroi 
const START_X = 120; 

const shiroi = {
  x: START_X,
  y: ROOF_TIERS[1] - 45, 
  w: 70,
  h: 45,
  vy: 0,
  jumping: false,
  onGround: true,
  frame: 0,
  frameTimer: 0,
};

const GRAVITY = 0.7;
const JUMP_FORCE = -18;

let gameState = 'menu';

function resetGame() {
  distance = 0;
  packagesCollected = 0;
  packagesSpawned = 0;
  obstacles = [];
  packages = [];
  buildings = [];
  isFinishSpawned = false;
  shiroi.x = START_X;
  shiroi.y = ROOF_TIERS[1] - 45;
  shiroi.vy = 0;
  shiroi.jumping = false;
  shiroi.onGround = true;
  initBuildings();
}

function jump() {
  if (gameState === 'playing' && shiroi.onGround) {
    shiroi.vy = JUMP_FORCE;
    shiroi.jumping = true;
    shiroi.onGround = false;
  }
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    if (gameState === 'playing') jump();
  }
});

const jumpBtn = document.getElementById('jumpBtn');
if(jumpBtn) jumpBtn.addEventListener('click', () => {
  if (gameState === 'playing') jump();
});

// MENU & END SCREEN 
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  if (gameState === 'menu') {
    // Tombol Mulai di Menu 
    if (mouseX >= W / 2 - 100 && mouseX <= W / 2 + 100 && mouseY >= H / 2 + 20 && mouseY <= H / 2 + 70) {
      resetGame();
      gameState = 'playing';
    }
  } else if (gameState !== 'playing') {
    // Tombol Restart
    if (mouseX >= W / 2 - 140 && mouseX <= W / 2 - 10 && mouseY >= H / 2 + 70 && mouseY <= H / 2 + 115) {
      resetGame();
      gameState = 'playing';
    } 
    // Tombol Kembali ke Menu
    else if (mouseX >= W / 2 + 10 && mouseX <= W / 2 + 140 && mouseY >= H / 2 + 70 && mouseY <= H / 2 + 115) {
      gameState = 'menu';
    }
  }
});

// WORLD STATE 
let speed = 3;
let distance = 0;
const DISTANCE_TARGET = 8000; 

const MAX_PACKAGES = 10;
let packagesCollected = 0;
let packagesSpawned = 0;

let obstacles = []; 
let packages = [];  
let buildings = []; 
let isFinishSpawned = false;

const MAX_GAP_W = 110; 
const MIN_BUILD_W = 150;
const MAX_BUILD_W = 250; 

function randTier(prevTier) {
  let idx = ROOF_TIERS.indexOf(prevTier);
  if (idx === -1) idx = 1;
  const delta = Math.floor(Math.random() * 3) - 1; 
  const newIdx = Math.min(ROOF_TIERS.length - 1, Math.max(0, idx + delta));
  return ROOF_TIERS[newIdx];
}

function spawnBuilding(afterX) {
  if (distance + afterX >= DISTANCE_TARGET && !isFinishSpawned) {
    buildings.push({ x: afterX, w: 400, roofY: 100, gap: false, img: assets.finishBuilding, isFinish: true });
    isFinishSpawned = true;
    return afterX + 400;
  }

  const lastRoof = buildings.length ? buildings[buildings.length - 1].roofY : ROOF_TIERS[1];
  const makeGap = buildings.length > 2 && Math.random() < 0.25; 
  
  if (makeGap) {
    const gapW = 80 + Math.random() * (MAX_GAP_W - 80);
    buildings.push({ x: afterX, w: gapW, roofY: null, gap: true });
    return afterX + gapW;
  } else {
    const w = MIN_BUILD_W + Math.random() * (MAX_BUILD_W - MIN_BUILD_W);
    const roofY = randTier(lastRoof);
    
    let bIdx = Math.floor(Math.random() * assets.buildings.length);
    const img = assets.buildings[bIdx];
    
    const tile = { x: afterX, w, roofY, gap: false, img, isFinish: false };
    buildings.push(tile);
    
    spawnEntityOnTile(tile); 
    return afterX + w;
  }
}

function spawnEntityOnTile(tile) {
  if (isFinishSpawned) return;

  const roll = Math.random();
  let packageChance = 0.35; 
  
  if (distance > DISTANCE_TARGET * 0.6 && packagesSpawned < MAX_PACKAGES) {
      packageChance = 0.8;
  }

  if (roll < packageChance && packagesSpawned < MAX_PACKAGES) {
    packages.push({ x: tile.x + tile.w / 2 - 15, y: tile.roofY - 80, w: 30, h: 30, taken: false });
    packagesSpawned++;
  } else if (roll > 0.6) {
    const useAntena = Math.random() < 0.6;
    const img = useAntena ? assets.antena1 : assets.cerobong;
    
    const h = useAntena ? 60 : 45; 
    const w = useAntena ? 40 : 35;

    const offsetAntena = 12;
    const offsetCerobong = 35; 
    const yPos = tile.roofY - h + (useAntena ? offsetAntena : offsetCerobong); 
    
    obstacles.push({ x: tile.x + tile.w / 2 - w/2, y: yPos, w, h, img });
  }
}

function initBuildings() {
  buildings.push({ x: 0, w: 600, roofY: ROOF_TIERS[1], gap: false, img: assets.buildings[1], isFinish: false });
  let x = 600;
  while (x < W + 400) {
    x = spawnBuilding(x);
  }
}

function currentTileAt(px) {
  return buildings.find(b => px >= b.x && px < b.x + b.w);
}

function hit(a, b) {
  return a.x < b.x + b.w && 
        a.x + a.w > b.x && 
        a.y < b.y + b.h && 
        a.y + a.h > b.y;
}

// ====== UPDATE ======
function update() {
  if (gameState !== 'playing') return;

  distance += speed;

  for (const b of buildings) b.x -= speed;
  while (buildings.length && buildings[0].x + buildings[0].w < -20) {
    buildings.shift();
  }

  const rightMost = buildings.length ? buildings[buildings.length - 1] : null;
  if (!isFinishSpawned && (!rightMost || rightMost.x + rightMost.w < W + 400)) {
    spawnBuilding(rightMost ? rightMost.x + rightMost.w : W);
  }

  shiroi.vy += GRAVITY;
  shiroi.y += shiroi.vy;

  if (shiroi.x < START_X) {
    shiroi.x += 2; 
    if (shiroi.x > START_X) shiroi.x = START_X;
  }

  for (const b of buildings) {
    if (b.gap) continue;
    if (shiroi.x + shiroi.w - 20 > b.x && shiroi.x + 20 < b.x + b.w) {
      if (shiroi.y + shiroi.h > b.roofY + 20) {
        if (shiroi.x < b.x) {
          shiroi.x = b.x - shiroi.w + 20; 
        }
      }
    }
  }

  if (shiroi.x + shiroi.w < 0) {
    gameState = 'lost_tertinggal';
  }

  const shiroiHitbox = {
    x: shiroi.x + 20, 
    y: shiroi.y + 10, 
    w: shiroi.w - 35, 
    h: shiroi.h - 10  
  };

  const tile = currentTileAt(shiroiHitbox.x + shiroiHitbox.w / 2);
  const roofHere = tile && !tile.gap ? tile.roofY : null;

  if (roofHere !== null && shiroi.vy >= 0 && shiroi.y + shiroi.h >= roofHere - 15 && shiroi.y + shiroi.h <= roofHere + 30) {
    shiroi.y = roofHere - shiroi.h; 
    shiroi.vy = 0;
    shiroi.jumping = false;
    shiroi.onGround = true;

    if (tile.isFinish) {
        gameState = packagesCollected >= 6 ? 'won' : 'lost_kurang';
    }
  } else {
    shiroi.onGround = false;
    if (roofHere === null) shiroi.jumping = true; 
  }

  if (shiroi.y > FALL_LIMIT) {
    gameState = 'lost_jatuh';
  }

  if (shiroi.onGround) {
    shiroi.frameTimer++;
    if (shiroi.frameTimer > 5) {
      shiroi.frame = (shiroi.frame + 1) % assets.runFrames.length;
      shiroi.frameTimer = 0;
    }
  }

  for (const o of obstacles) {
    o.x -= speed;
    
    const obsHitbox = {
      x: o.x + (o.w * 0.35), 
      y: o.y + (o.h * 0.25), 
      w: o.w * 0.3,          
      h: o.h * 0.7           
    };
    
    if (hit(shiroiHitbox, obsHitbox)) gameState = 'lost_nabrak';
  }
  obstacles = obstacles.filter(o => o.x + o.w > 0);

  for (const p of packages) {
    p.x -= speed;
    
    const pkgHitbox = {
      x: p.x + 5,
      y: p.y + 5,
      w: p.w - 10,
      h: p.h - 10
    };

    if (!p.taken && hit(shiroiHitbox, pkgHitbox)) {
      p.taken = true;
      packagesCollected++;
    }
  }
  packages = packages.filter(p => p.x + p.w > 0 && !p.taken);
}

// DRAW 
function drawBackground() {
  ctx.drawImage(assets.bglangit, 0, 0, W, H);
  
  ctx.drawImage(assets.moon, W - 150, 40, 80, 80);

  const starOffset = (distance * 0.05) % W;
  ctx.drawImage(assets.bintang, -starOffset, 0, W, H);
  ctx.drawImage(assets.bintang, W - starOffset, 0, W, H);

  const silW = 550;

  const silH50 = 260;
  const offset50 = (distance * 0.15) % silW;
  for (let i = -1; i < Math.ceil(W/silW) + 1; i++) {
    ctx.drawImage(assets.siluet50, i * silW - offset50, H - silH50, silW, silH50);
  }
  
  const silH100 = 290;
  const offset100 = (distance * 0.3) % silW;
  for (let i = -1; i < Math.ceil(W/silW) + 1; i++) {
    ctx.drawImage(assets.siluet100, i * silW - offset100, H - silH100, silW, silH100);
  }
}

function drawBuildings() {
  for (const b of buildings) {
    if (b.gap) continue;
    ctx.drawImage(b.img, b.x, b.roofY, b.w, H - b.roofY);
  }
}

function drawShiroi() {
  const img = shiroi.jumping ? assets.jumpFrame : assets.runFrames[shiroi.frame];
  ctx.drawImage(img, shiroi.x, shiroi.y, shiroi.w, shiroi.h);
}

function drawHUD() {
  const percent = Math.min(Math.round((distance / DISTANCE_TARGET) * 100), 100);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px sans-serif';
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 4;
  ctx.fillText(`Jarak: ${percent}m / 100m`, 16, 30);
  ctx.fillText(`Paket: ${packagesCollected} / 10`, 16, 58);
  ctx.shadowBlur = 0; 
}

function drawMenuScreen() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 38px sans-serif';
  ctx.fillText('MIDNIGHT NYAN DELIVERY', W / 2, H / 2 - 50);

  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#ddd';
  ctx.fillText('Bantu Shiroi mengantar paket melompati atap gedung!', W / 2, H / 2 - 10);

  // Tombol Mulai
  ctx.fillStyle = '#2ecc71';
  ctx.fillRect(W / 2 - 100, H / 2 + 20, 200, 50);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('MULAI', W / 2, H / 2 + 52);

  ctx.textAlign = 'left';
}

function drawEndScreen() {
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, W, H);
  
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  
  if (gameState === 'won') {
    let stars = packagesCollected === 10 ? 3 : (packagesCollected >= 6 ? 2 : 1);
    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = '#4dff4d';
    ctx.fillText('MISI SELESAI!', W / 2, H / 2 - 50);
    
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(`Paket Terkirim: ${packagesCollected}/10`, W / 2, H / 2 - 10);
    
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = i < stars ? 1.0 : 0.25;
      ctx.drawImage(assets.bintang, W / 2 - 70 + i * 50, H / 2 + 15, 35, 35);
    }
    ctx.globalAlpha = 1; 

  } else {
    ctx.drawImage(assets.gameOverImg, W / 2 - 130, H / 2 - 90, 260, 85);
    
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#ff6b6b';
    let reason = "";
    if (gameState === 'lost_jatuh') reason = "Shiroi jatuh ke celah gedung!";
    if (gameState === 'lost_nabrak') reason = "Shiroi menabrak rintangan!";
    if (gameState === 'lost_kurang') reason = "Paket kurang dari 6! Misi Gagal.";
    if (gameState === 'lost_tertinggal') reason = "Shiroi tertinggal!";
    
    ctx.fillText(reason, W / 2, H / 2 + 15);
  }

  // Tombol Ulangi
  ctx.fillStyle = '#3498db';
  ctx.fillRect(W / 2 - 140, H / 2 + 70, 130, 45);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('ULANGI', W / 2 - 75, H / 2 + 98);

  // Tombol Menu
  ctx.fillStyle = '#e74c3c';
  ctx.fillRect(W / 2 + 10, H / 2 + 70, 130, 45);
  ctx.fillStyle = '#fff';
  ctx.fillText('MENU', W / 2 + 75, H / 2 + 98);

  ctx.textAlign = 'left';
}

function draw() {
  drawBackground();
  drawBuildings();
  for (const o of obstacles) ctx.drawImage(o.img, o.x, o.y, o.w, o.h);
  
  for (const p of packages) {
    ctx.fillStyle = '#f39c12';
    let floatY = p.y + Math.sin(Date.now() / 150) * 5; 
    ctx.fillRect(p.x, floatY, p.w, p.h);
    ctx.strokeStyle = '#e67e22';
    ctx.lineWidth = 3;
    ctx.strokeRect(p.x, floatY, p.w, p.h);
  }
  
  drawShiroi();
  drawHUD();

  if (gameState === 'menu') {
    drawMenuScreen();
  } else if (gameState !== 'playing') {
    drawEndScreen();
  }
}

setTimeout(() => {
    initBuildings();
    loop();
}, 500); 

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}