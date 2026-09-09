// --- SYSTÈME DE SAUVEGARDE PERSISTANTE ---
let saved = {};
try {
  saved = JSON.parse(localStorage.getItem('clac_roguelite_save') || '{}');
} catch (e) {
  saved = {};
}

let vaultZoucs = typeof saved.vaultZoucs === 'number' ? saved.vaultZoucs : 0;
let unlockedShapes = saved.unlockedShapes || ['square'];
let unlockedColors = saved.unlockedColors || ['#111111'];
let customShape = saved.customShape || 'square';
let customColor = saved.customColor || '#111111';
let customImageSrc = saved.customImageSrc || null;
let playerPseudo = saved.playerPseudo || 'CLAC';

let permanentPerks = saved.permanentPerks || {
  clickBonus: 0,
  startSlow: 0,
  shieldMastery: 0,
  betaUnlock: false,
  customImgUnlocked: false,
  thermalVent: false,     // Réduit la surchauffe de 50%
  quantumResonance: false // Double l'efficacité des items de run
};

// État de la run
let inRun = false;
let isPaused = false;
let zoucs = 0;
let clickPower = 1;
let passiveIncome = 0;
let currentWorld = 1;
let heat = 0;
let isJammed = false;
let isFrozen = false;

// Bavure géante
let megaStainActive = false;
let megaStainHp = 6;
let megaStainInterval = null;

// CONFIGURATION DES MONDES
const WORLDS = {
  1: { name: "Monde 01 · Papier Naturel", class: "world-1", scoreGoal: 5000, tileSize: 125, heatRate: 6.5, hazardCount: 1, orbInterval: 4500 },
  2: { name: "Monde 02 · Épreuve Carbone", class: "world-2", scoreGoal: 50000, tileSize: 110, heatRate: 8.5, hazardCount: 1, orbInterval: 3600 },
  3: { name: "Monde 03 · Zone Indigo", class: "world-3", scoreGoal: 500000, tileSize: 95, heatRate: 10.5, hazardCount: 2, orbInterval: 2800 },
  4: { name: "Monde 04 · Cuivre Thermique", class: "world-4", scoreGoal: 3000000, tileSize: 85, heatRate: 12.0, hazardCount: 2, orbInterval: 2200 },
  5: { name: "Monde 05 · Atelier Noir Absolu", class: "world-5", scoreGoal: 20000000, tileSize: 75, heatRate: 14.0, hazardCount: 3, orbInterval: 1600 }
};

let runCatalog = [
  { id: 'c1', name: 'crayon 2B', gainDesc: '+1/clic', baseCost: 15, cost: 15, gainClick: 1, gainAuto: 0, minWorld: 1, qty: 0, mult: 1.15 },
  { id: 'a1', name: 'gomme bicolore', gainDesc: '+1/sec', baseCost: 35, cost: 35, gainClick: 0, gainAuto: 1, minWorld: 1, qty: 0, mult: 1.15 },
  { id: 'c2', name: 'taille-crayon', gainDesc: '+6/clic', baseCost: 180, cost: 180, gainClick: 6, gainAuto: 0, minWorld: 1, qty: 0, mult: 1.18 },
  { id: 'a2', name: 'règle graduée', gainDesc: '+16/sec', baseCost: 700, cost: 700, gainClick: 0, gainAuto: 16, minWorld: 1, qty: 0, mult: 1.20 },
  { id: 'c3', name: 'encre de chine', gainDesc: '+35/clic', baseCost: 2400, cost: 2400, gainClick: 35, gainAuto: 0, minWorld: 2, qty: 0, mult: 1.22 },
  { id: 'a3', name: 'presse d’épreuve', gainDesc: '+120/sec', baseCost: 8500, cost: 8500, gainClick: 0, gainAuto: 120, minWorld: 2, qty: 0, mult: 1.24 },
  { id: 'c4', name: 'pointe de rubis', gainDesc: '+400/clic', baseCost: 55000, cost: 55000, gainClick: 400, gainAuto: 0, minWorld: 3, qty: 0, mult: 1.25 },
  { id: 'a4', name: 'cylindre chromé', gainDesc: '+1200/sec', baseCost: 180000, cost: 180000, gainClick: 0, gainAuto: 1200, minWorld: 3, qty: 0, mult: 1.26 },
  { id: 'c5', name: 'laser ionique', gainDesc: '+5000/clic', baseCost: 1200000, cost: 1200000, gainClick: 5000, gainAuto: 0, minWorld: 4, qty: 0, mult: 1.28 },
  { id: 'a5', name: 'rotative quantique', gainDesc: '+25000/sec', baseCost: 4500000, cost: 4500000, gainClick: 0, gainAuto: 25000, minWorld: 4, qty: 0, mult: 1.30 },
  { id: 'c6', name: 'imploseur rebuts', gainDesc: '+50000/clic', baseCost: 20000000, cost: 20000000, gainClick: 50000, gainAuto: 0, minWorld: 5, qty: 0, mult: 1.32 },
  { id: 'a6', name: 'matrice plasma', gainDesc: '+200000/sec', baseCost: 75000000, cost: 75000000, gainClick: 0, gainAuto: 200000, minWorld: 5, qty: 0, mult: 1.35 }
];

// NOUVEAUX PASSIFS PERMANENTS ÉQUILIBRÉS ET UTILE (NOTAMMENT LE CARRÉ BÊTA)
const hubUpgrades = [
  { id: 'perm_click', name: 'Enclume d’Acier', desc: '+5 Clic de base en run', cost: 400, apply: () => { permanentPerks.clickBonus += 5; } },
  { id: 'perm_slow', name: 'Roulements Lubrifiés', desc: 'Vitesse de départ -40%', cost: 1000, apply: () => { permanentPerks.startSlow += 0.4; } },
  { id: 'perm_beta', name: 'Satellite Bêta Actif', desc: 'Génère 10% de sa puissance en passif global', cost: 3500, apply: () => { permanentPerks.betaUnlock = true; } },
  { id: 'perm_shield', name: 'Plaque Pare-Choc', desc: '75% d’esquiver les Ronds Rebuts', cost: 8000, apply: () => { permanentPerks.shieldMastery = 1; } },
  { id: 'perm_thermal', name: 'Turbine Thermique', desc: '-50% de surchauffe de presse', cost: 15000, apply: () => { permanentPerks.thermalVent = true; } },
  { id: 'perm_quantum', name: 'Résonance Quantique', desc: 'Double l’effet de tous les items de run', cost: 40000, apply: () => { permanentPerks.quantumResonance = true; } },
  { id: 'perm_custom_img', name: 'Matrice Photo Libre', desc: 'Débloque l’import d’une image perso', cost: 10000, apply: () => { permanentPerks.customImgUnlocked = true; } }
];

const cosmeticCatalog = {
  shapes: [
    { id: 'square', name: 'Carré', cost: 0 },
    { id: 'circle', name: 'Cercle', cost: 600 },
    { id: 'diamond', name: 'Losange', cost: 1500 },
    { id: 'pill', name: 'Gélule', cost: 3500 }
  ],
  colors: [
    { id: '#111111', name: 'Carbone', cost: 0 },
    { id: '#ff5722', name: 'Orange', cost: 500 },
    { id: '#0284c7', name: 'Cobalt', cost: 1200 },
    { id: '#15803d', name: 'Sauge', cost: 2500 }
  ]
};

// --- DOM REFERENCES ---
let sheetBodyEl, tabNavHub, tabNavRun, viewHubSection, viewRunSection, btnTogglePause, btnQuitRun;
let hubVaultCounter, btnLaunchRun, hubPerksList, hubStaticSquare, hubTileTitle, runTileTitle, pseudoInput, btnSavePseudo;
let shapeSelectors, colorSelectors, imageUploadCard, customImageInput, btnRemoveImage, imgUploadTitle, imgUploadInfo;
let runSummaryModal, gameoverOverlay, modalBadgeStatus, modalSummaryTitle, modalDepositAmount, btnReturnHome, btnRestartGame;
let floorClearBanner, btnBankAndLeave, btnContinueRun;
let counterEl, statPassiveEl, statClickEl, statTargetEl, statFloorEl;
let heatFill, heatStatus, heatWarning;
let sandboxEl, activeSquare, tileGainEl, betaSquare;
let hazard1, hazard2, hazard3;
let catalogListEl, projectilesLayer, freeInkStain, stainHpPill;

function initDomReferences() {
  sheetBodyEl = document.getElementById('sheet-body-element');
  tabNavHub = document.getElementById('tab-nav-hub');
  tabNavRun = document.getElementById('tab-nav-run');
  viewHubSection = document.getElementById('view-hub-section');
  viewRunSection = document.getElementById('view-run-section');
  btnTogglePause = document.getElementById('btn-toggle-pause');
  btnQuitRun = document.getElementById('btn-quit-run');

  hubVaultCounter = document.getElementById('hub-vault-counter');
  btnLaunchRun = document.getElementById('btn-launch-run');
  hubPerksList = document.getElementById('hub-perks-list');
  hubStaticSquare = document.getElementById('hub-static-square');
  hubTileTitle = document.getElementById('hub-tile-title');
  runTileTitle = document.getElementById('run-tile-title');
  pseudoInput = document.getElementById('pseudo-input');
  btnSavePseudo = document.getElementById('btn-save-pseudo');

  shapeSelectors = document.getElementById('shape-selectors');
  colorSelectors = document.getElementById('color-selectors');
  imageUploadCard = document.getElementById('image-upload-card');
  customImageInput = document.getElementById('custom-image-input');
  btnRemoveImage = document.getElementById('btn-remove-image');
  imgUploadTitle = document.getElementById('img-upload-title');
  imgUploadInfo = document.getElementById('img-upload-info');

  runSummaryModal = document.getElementById('run-summary-modal');
  gameoverOverlay = document.getElementById('gameover-overlay');
  modalBadgeStatus = document.getElementById('modal-badge-status');
  modalSummaryTitle = document.getElementById('modal-summary-title');
  modalDepositAmount = document.getElementById('modal-deposit-amount');
  btnReturnHome = document.getElementById('btn-return-home');
  btnRestartGame = document.getElementById('btn-restart-game');

  floorClearBanner = document.getElementById('floor-clear-banner');
  btnBankAndLeave = document.getElementById('btn-bank-and-leave');
  btnContinueRun = document.getElementById('btn-continue-run');

  counterEl = document.getElementById('counter');
  statPassiveEl = document.getElementById('stat-passive');
  statClickEl = document.getElementById('stat-click');
  statTargetEl = document.getElementById('stat-target');
  statFloorEl = document.getElementById('stat-floor');

  heatFill = document.getElementById('heat-fill');
  heatStatus = document.getElementById('heat-status');
  heatWarning = document.getElementById('heat-warning');

  sandboxEl = document.getElementById('sandbox');
  activeSquare = document.getElementById('active-square');
  tileGainEl = document.getElementById('tile-gain');
  betaSquare = document.getElementById('beta-square');

  hazard1 = document.getElementById('hazard-square-1');
  hazard2 = document.getElementById('hazard-square-2');
  hazard3 = document.getElementById('hazard-square-3');

  catalogListEl = document.getElementById('catalog-list');
  projectilesLayer = document.getElementById('projectiles-layer');
  freeInkStain = document.getElementById('free-ink-stain');
  stainHpPill = document.getElementById('stain-hp-pill');
}

function formatNum(num) {
  return Math.floor(num).toLocaleString('fr-FR');
}

function spawnParticle(x, y, text, isDanger = false) {
  const node = document.createElement('div');
  node.className = `tech-pop-particle ${isDanger ? 'danger' : ''}`;
  node.textContent = text;
  const drift = (Math.random() - 0.5) * 20;
  node.style.left = `${x + drift}px`;
  node.style.top = `${y}px`;
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 450);
}

function showView(view) {
  if (view === 'hub') {
    viewHubSection.classList.remove('is-hidden');
    viewRunSection.classList.add('is-hidden');
    tabNavHub.classList.add('is-active');
    tabNavRun.classList.remove('is-active');
    btnTogglePause.classList.add('is-hidden');
    btnQuitRun.classList.add('is-hidden');
    sheetBodyEl.className = 'view-hub';
    renderHub();
  } else {
    viewHubSection.classList.add('is-hidden');
    viewRunSection.classList.remove('is-hidden');
    tabNavRun.classList.add('is-active');
    tabNavHub.classList.remove('is-active');
    btnTogglePause.classList.remove('is-hidden');
    btnQuitRun.classList.remove('is-hidden');
  }
}

function renderHub() {
  hubVaultCounter.textContent = formatNum(vaultZoucs);
  pseudoInput.value = playerPseudo;

  hubPerksList.innerHTML = '';
  for (const up of hubUpgrades) {
    const row = document.createElement('button');
    row.className = 'tech-row-item';
    const isOwned = (up.id === 'perm_beta' && permanentPerks.betaUnlock) || 
                    (up.id === 'perm_shield' && permanentPerks.shieldMastery) ||
                    (up.id === 'perm_custom_img' && permanentPerks.customImgUnlocked) ||
                    (up.id === 'perm_thermal' && permanentPerks.thermalVent) ||
                    (up.id === 'perm_quantum' && permanentPerks.quantumResonance);
    row.disabled = isOwned || vaultZoucs < up.cost;

    row.innerHTML = `
      <span class="t-name">${up.name}</span>
      <div class="t-metrics">
        <span class="t-gain">${up.desc}</span>
        <span class="t-price">${isOwned ? 'ACQUIS' : `${formatNum(up.cost)} Z`}</span>
      </div>
    `;

    row.addEventListener('click', () => {
      if (vaultZoucs >= up.cost) {
        vaultZoucs -= up.cost;
        up.apply();
        renderHub();
        saveGame();
      }
    });
    hubPerksList.appendChild(row);
  }

  shapeSelectors.innerHTML = '';
  for (const s of cosmeticCatalog.shapes) {
    const btn = document.createElement('button');
    const unlocked = unlockedShapes.includes(s.id);
    btn.className = `style-choice-btn ${customShape === s.id ? 'is-active' : ''}`;
    btn.textContent = unlocked ? s.name : `${s.name} (${formatNum(s.cost)}Z)`;
    btn.disabled = !unlocked && vaultZoucs < s.cost;

    btn.addEventListener('click', () => {
      if (!unlocked) {
        vaultZoucs -= s.cost;
        unlockedShapes.push(s.id);
      }
      customShape = s.id;
      applyCosmetics();
      renderHub();
      saveGame();
    });
    shapeSelectors.appendChild(btn);
  }

  colorSelectors.innerHTML = '';
  for (const c of cosmeticCatalog.colors) {
    const btn = document.createElement('button');
    const unlocked = unlockedColors.includes(c.id);
    btn.className = `style-color-btn ${customColor === c.id ? 'is-active' : ''}`;
    btn.style.borderLeft = `4px solid ${c.id}`;
    btn.textContent = unlocked ? c.name : `${c.name} (${formatNum(c.cost)}Z)`;
    btn.disabled = !unlocked && vaultZoucs < c.cost;

    btn.addEventListener('click', () => {
      if (!unlocked) {
        vaultZoucs -= c.cost;
        unlockedColors.push(c.id);
      }
      customColor = c.id;
      applyCosmetics();
      renderHub();
      saveGame();
    });
    colorSelectors.appendChild(btn);
  }

  if (permanentPerks.customImgUnlocked) {
    imgUploadTitle.textContent = "IMAGE PERSONNALISÉE (DÉBLOQUÉ)";
    imgUploadInfo.style.display = 'none';
    customImageInput.style.display = 'block';
    btnRemoveImage.style.display = 'block';
  } else {
    imgUploadTitle.textContent = "IMAGE PERSO (10 000 Z)";
    imgUploadInfo.style.display = 'block';
    imgUploadInfo.textContent = `Requis : 10 000 Z (Actuel : ${formatNum(vaultZoucs)} Z)`;
    customImageInput.style.display = 'none';
    btnRemoveImage.style.display = 'none';
  }

  applyCosmetics();
}

function applyCosmetics() {
  [activeSquare, hubStaticSquare].forEach(tile => {
    if (!tile) return;
    tile.classList.remove('shape-circle', 'shape-diamond', 'shape-pill');
    if (customShape !== 'square') tile.classList.add(`shape-${customShape}`);

    if (customImageSrc && permanentPerks.customImgUnlocked) {
      tile.style.backgroundImage = `url(${customImageSrc})`;
      tile.style.backgroundSize = 'cover';
      tile.style.backgroundPosition = 'center';
    } else {
      tile.style.backgroundImage = 'none';
      tile.style.backgroundColor = customColor;
    }
  });

  if (hubTileTitle) hubTileTitle.textContent = playerPseudo;
  if (runTileTitle) runTileTitle.textContent = playerPseudo;

  document.documentElement.style.setProperty('--custom-tile-bg', customColor);
}

function startNewRun() {
  inRun = true;
  isPaused = false;
  zoucs = 0;
  clickPower = 1 + permanentPerks.clickBonus;
  passiveIncome = 0;
  currentWorld = 1;
  heat = 0;
  isJammed = false;
  isFrozen = false;

  runCatalog.forEach(item => {
    item.cost = item.baseCost;
    item.qty = 0;
  });

  if (permanentPerks.betaUnlock && betaSquare) {
    betaSquare.classList.remove('is-hidden');
  } else if (betaSquare) {
    betaSquare.classList.add('is-hidden');
  }

  clearAllOrbs();
  hideFreeStain();
  if (floorClearBanner) floorClearBanner.classList.add('is-hidden');

  showView('run');
  applyWorldSettings();
  refreshUI();
}

function endRun(isVictory = false, isAbandoned = false) {
  inRun = false;
  clearInterval(orbTimer);
  clearAllOrbs();
  hideFreeStain();

  let secured = 0;
  if (isVictory) {
    secured = Math.max(0, Math.floor(zoucs));
  } else if (isAbandoned) {
    secured = Math.max(0, Math.floor(zoucs * 0.5));
  } else {
    secured = 0;
  }

  vaultZoucs += secured;

  if (modalBadgeStatus) modalBadgeStatus.textContent = isVictory ? "EXTRACTION RÉUSSIE" : isAbandoned ? "ABANDON STRATÉGIQUE" : "TIRAGE ANÉANTI";
  if (modalSummaryTitle) modalSummaryTitle.textContent = isVictory ? "BÉNÉFICES SÉCURISÉS" : isAbandoned ? "50% DES GAINS SAUVÉS" : "MORT EN ÉPREUVE";
  if (modalDepositAmount) modalDepositAmount.textContent = `+${formatNum(secured)} Z`;
  if (runSummaryModal) runSummaryModal.classList.remove('is-hidden');

  saveGame();
}

function checkRunFail() {
  if (inRun && zoucs <= 0 && (passiveIncome > 0 || clickPower > 1)) {
    if (gameoverOverlay) gameoverOverlay.classList.remove('is-hidden');
    endRun(false, false);
  }
}

// PHYSIQUE DES CIBLES & Ronds Rebuts
let posX = 20, posY = 20, dirX = 1, dirY = 1;
let betaX = 60, betaY = 60, betaDirX = -1, betaDirY = 1;

const hazardsData = [
  { el: () => hazard1, x: 110, y: 110, dx: 1, dy: -1 },
  { el: () => hazard2, x: 180, y: 50, dx: -1, dy: 1 },
  { el: () => hazard3, x: 50, y: 180, dx: 1, dy: 1 }
];

function updatePhysics() {
  if (inRun && !isPaused && sandboxEl && activeSquare) {
    const currentDim = WORLDS[currentWorld].tileSize;
    const rect = sandboxEl.getBoundingClientRect();
    const maxW = Math.max(10, rect.width - currentDim);
    const maxH = Math.max(10, rect.height - currentDim);

    const speedFactor = Math.max(0.4, 1.0 - permanentPerks.startSlow);
    const speed = Math.min(5.5, (0.12 + (Math.log10(Math.max(1, zoucs)) * 0.38) + (currentWorld - 1) * 0.45) * speedFactor);

    if (!isJammed && !isFrozen) {
      posX += dirX * speed;
      posY += dirY * speed;

      if (posX >= maxW) { posX = maxW; dirX = -1; }
      else if (posX <= 0) { posX = 0; dirX = 1; }

      if (posY >= maxH) { posY = maxH; dirY = -1; }
      else if (posY <= 0) { posY = 0; dirY = 1; }

      activeSquare.style.transform = `translate3d(${posX}px, ${posY}px, 0)`;
    }

    // Le Carré Bêta transfère désormais 10% de sa puissance en passif global pour le rendre utile
    if (permanentPerks.betaUnlock && !isJammed && !isFrozen && betaSquare) {
      const bDim = Math.round(currentDim * 0.65);
      const bMaxW = Math.max(10, rect.width - bDim);
      const bMaxH = Math.max(10, rect.height - bDim);
      const bSpeed = speed * 1.5 + 0.3;

      betaX += betaDirX * bSpeed;
      betaY += betaDirY * bSpeed;

      if (betaX >= bMaxW) { betaX = bMaxW; betaDirX = -1; }
      else if (betaX <= 0) { betaX = 0; betaDirX = 1; }

      if (betaY >= bMaxH) { betaY = bMaxH; betaDirY = -1; }
      else if (betaY <= 0) { betaY = 0; betaDirY = 1; }

      betaSquare.style.transform = `translate3d(${betaX}px, ${betaY}px, 0)`;
    }

    const activeHazCount = WORLDS[currentWorld].hazardCount;
    const hDim = 48;
    const hMaxW = Math.max(10, rect.width - hDim);
    const hMaxH = Math.max(10, rect.height - hDim);
    const hSpeed = (0.7 + currentWorld * 0.5);

    for (let i = 0; i < activeHazCount; i++) {
      const h = hazardsData[i];
      const el = h.el();
      if (!el) continue;
      h.x += h.dx * hSpeed;
      h.y += h.dy * hSpeed;

      if (h.x >= hMaxW) { h.x = hMaxW; h.dx = -1; }
      else if (h.x <= 0) { h.x = 0; h.dx = 1; }

      if (h.y >= hMaxH) { h.y = hMaxH; h.dy = -1; }
      else if (h.y <= 0) { h.y = 0; h.dy = 1; }

      el.style.transform = `translate3d(${h.x}px, ${h.y}px, 0)`;
    }

    checkProjectileCollisions();
  }

  requestAnimationFrame(updatePhysics);
}

function handleHazardHit(hElement) {
  if (!inRun || isPaused) return;

  const box = hElement.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;

  // Plaque Pare-Choc améliorée à 75% d'esquive
  if (permanentPerks.shieldMastery && Math.random() < 0.75) {
    spawnParticle(x, y, 'ESQUIVÉ !', false);
    return;
  }

  const loss = Math.round(zoucs * 0.15);
  zoucs = Math.max(0, zoucs - loss);
  heat = Math.min(100, heat + 35);
  updateHeatUI();
  if (heat >= 100) triggerJam();

  spawnParticle(x, y, `-${loss} Z (REBUT)`, true);
  checkRunFail();
  refreshUI();
}

// BAVURE LIBRE
function triggerFreeInkStain() {
  if (!inRun || currentWorld < 2 || megaStainActive || isPaused || !freeInkStain || !stainHpPill) return;

  megaStainActive = true;
  megaStainHp = 6;
  stainHpPill.textContent = `${megaStainHp} CLICS`;
  freeInkStain.classList.remove('is-hidden');

  const margin = 100;
  const randomX = Math.random() * (window.innerWidth - margin * 2) + margin;
  const randomY = Math.random() * (window.innerHeight - margin * 2) + margin;

  freeInkStain.style.left = `${randomX}px`;
  freeInkStain.style.top = `${randomY}px`;
  freeInkStain.style.width = '140px';
  freeInkStain.style.height = '140px';

  megaStainInterval = setInterval(() => {
    if (!megaStainActive || isPaused) return;

    const drain = Math.max(20, Math.round(zoucs * 0.04));
    zoucs = Math.max(0, zoucs - drain);
    checkRunFail();
    refreshUI();

    const currentW = parseInt(freeInkStain.style.width) || 140;
    if (currentW < 320) {
      const nextW = currentW + 16;
      freeInkStain.style.width = `${nextW}px`;
      freeInkStain.style.height = `${nextW}px`;
      megaStainHp++;
      stainHpPill.textContent = `${megaStainHp} CLICS`;
    }
  }, 1000);
}

function hideFreeStain() {
  megaStainActive = false;
  if (freeInkStain) freeInkStain.classList.add('is-hidden');
  if (megaStainInterval) clearInterval(megaStainInterval);
}

setInterval(triggerFreeInkStain, 30000);

// ORBES & GEL
const activeProjectiles = [];

function spawnIncomingOrb() {
  if (!inRun || isPaused || !projectilesLayer) return;

  const orb = document.createElement('div');
  orb.className = 'incoming-orb';
  orb.textContent = '×';

  const w = window.innerWidth;
  const h = window.innerHeight;
  let startX, startY;
  const side = Math.floor(Math.random() * 4);

  if (side === 0) { startX = Math.random() * w; startY = -40; }
  else if (side === 1) { startX = w + 40; startY = Math.random() * h; }
  else if (side === 2) { startX = Math.random() * w; startY = h + 40; }
  else { startX = -40; startY = Math.random() * h; }

  const baseSpeed = 1.6 + currentWorld * 0.35;
  const orbData = { el: orb, x: startX, y: startY, speed: baseSpeed, active: true };
  orb.style.transform = `translate3d(${startX}px, ${startY}px, 0)`;

  orb.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    destroyOrb(orbData, true);
  });

  projectilesLayer.appendChild(orb);
  activeProjectiles.push(orbData);
}

function destroyOrb(orbData, byPlayer = false) {
  if (!orbData.active) return;
  orbData.active = false;
  orbData.el.remove();
  if (byPlayer) {
    spawnParticle(orbData.x + 18, orbData.y + 18, 'INTERCEPTÉ !', false);
  }
}

function clearAllOrbs() {
  for (const orb of activeProjectiles) {
    if (orb.active) orb.el.remove();
  }
  activeProjectiles.length = 0;
}

function checkProjectileCollisions() {
  if (isPaused || !activeSquare) return;
  const squareRect = activeSquare.getBoundingClientRect();
  const targetX = squareRect.left + squareRect.width / 2;
  const targetY = squareRect.top + squareRect.height / 2;

  for (let i = activeProjectiles.length - 1; i >= 0; i--) {
    const orb = activeProjectiles[i];
    if (!orb.active) {
      activeProjectiles.splice(i, 1);
      continue;
    }

    const dx = targetX - (orb.x + 18);
    const dy = targetY - (orb.y + 18);
    const dist = Math.hypot(dx, dy);

    if (dist > 1) {
      orb.x += (dx / dist) * orb.speed;
      orb.y += (dy / dist) * orb.speed;
    }

    orb.el.style.transform = `translate3d(${orb.x}px, ${orb.y}px, 0)`;

    const orbBox = { left: orb.x, right: orb.x + 36, top: orb.y, bottom: orb.y + 36 };
    const collides = !(orbBox.right < squareRect.left ||
                       orbBox.left > squareRect.right ||
                       orbBox.bottom < squareRect.top ||
                       orbBox.top > squareRect.bottom);

    if (collides) {
      const penalty = Math.max(15, Math.round(zoucs * 0.08));
      zoucs = Math.max(0, zoucs - penalty);
      heat = Math.min(100, heat + 25);
      updateHeatUI();
      if (heat >= 100) triggerJam();

      isFrozen = true;
      activeSquare.classList.add('is-frozen');
      setTimeout(() => {
        isFrozen = false;
        if (activeSquare) activeSquare.classList.remove('is-frozen');
      }, 1000);

      spawnParticle(orb.x, orb.y, `-${penalty} Z [GEL 1s]`, true);
      destroyOrb(orb, false);
      checkRunFail();
      refreshUI();
    }
  }
}

let orbTimer = null;
function restartOrbSpawner() {
  if (orbTimer) clearInterval(orbTimer);
  orbTimer = setInterval(spawnIncomingOrb, WORLDS[currentWorld].orbInterval);
}

// PAUSE
function setPauseState(paused) {
  if (!inRun) return;
  isPaused = paused;
  if (isPaused) {
    if (sheetBodyEl) sheetBodyEl.classList.add('is-paused-mode');
    if (btnTogglePause) {
      btnTogglePause.textContent = 'REPRENDRE [P]';
      btnTogglePause.style.background = 'var(--accent-orange)';
      btnTogglePause.style.color = '#fff';
    }
  } else {
    if (sheetBodyEl) sheetBodyEl.classList.remove('is-paused-mode');
    if (btnTogglePause) {
      btnTogglePause.textContent = 'PAUSE [P]';
      btnTogglePause.style.background = 'transparent';
      btnTogglePause.style.color = 'var(--ink-black)';
    }
  }
}

// SURCHAUFFE (Turbine Thermique réduit de 50%)
function getHeatMultiplier() {
  if (isJammed || isFrozen || isPaused) return 1.0;
  return 1.0 + parseFloat(((heat / 100) * 2.0).toFixed(1));
}

setInterval(() => {
  if (!inRun || isJammed || isPaused) return;
  if (heat > 0) {
    heat = Math.max(0, heat - 1.8);
    updateHeatUI();
  }
}, 70);

function registerStrokeHeat() {
  if (!inRun || isJammed || isPaused) return;

  let rate = WORLDS[currentWorld].heatRate;
  if (permanentPerks.thermalVent) rate *= 0.5; // -50% de surchauffe
  heat = Math.min(100, heat + rate);
  updateHeatUI();

  if (heat >= 100) triggerJam();
}

function updateHeatUI() {
  if (!heatFill || !heatStatus) return;
  heatFill.style.width = `${heat}%`;
  const mult = getHeatMultiplier();
  heatStatus.textContent = `${Math.round(heat)}% [x${mult.toFixed(1)} BOOST]`;
}

function triggerJam() {
  isJammed = true;
  if (heatWarning) heatWarning.classList.remove('is-hidden');
  if (activeSquare) activeSquare.classList.add('is-jammed');

  setTimeout(() => {
    isJammed = false;
    if (heatWarning) heatWarning.classList.add('is-hidden');
    heat = 15;
    updateHeatUI();
    if (activeSquare) activeSquare.classList.remove('is-jammed');
  }, 3000);
}

// CLICS EN RUN
function handleMainClick(e) {
  if (!inRun || isJammed || isFrozen || isPaused) return;

  registerStrokeHeat();

  const boost = getHeatMultiplier();
  const finalGain = Math.round(clickPower * boost);
  zoucs += finalGain;

  if (zoucs >= WORLDS[currentWorld].scoreGoal) {
    if (floorClearBanner) floorClearBanner.classList.remove('is-hidden');
    if (currentWorld < 5) {
      currentWorld++;
      applyWorldSettings();
    }
  }

  refreshUI();

  const box = activeSquare.getBoundingClientRect();
  const x = e.clientX || (box.left + box.width / 2);
  const y = e.clientY || (box.top + box.height / 2);
  spawnParticle(x, y, `+${finalGain}`);
}

function applyWorldSettings() {
  const w = WORLDS[currentWorld];
  if (sheetBodyEl) sheetBodyEl.className = `${w.class} view-run`;
  if (statFloorEl) statFloorEl.textContent = `0${currentWorld}`;
  if (statTargetEl) statTargetEl.textContent = currentWorld < 5 ? `${formatNum(w.scoreGoal)} Z` : 'MAX';

  if (activeSquare) {
    activeSquare.style.width = `${w.tileSize}px`;
    activeSquare.style.height = `${w.tileSize}px`;
  }

  if (hazard1) hazard1.classList.toggle('is-hidden', w.hazardCount < 1);
  if (hazard2) hazard2.classList.toggle('is-hidden', w.hazardCount < 2);
  if (hazard3) hazard3.classList.toggle('is-hidden', w.hazardCount < 3);

  setupRunCatalog();
  restartOrbSpawner();
  refreshUI();
}

// BOUTIQUE DE RUN (Résonance Quantique double l'efficacité)
function setupRunCatalog() {
  if (!catalogListEl) return;
  catalogListEl.innerHTML = '';
  const available = runCatalog.filter(i => i.minWorld <= currentWorld);
  const sorted = [...available].sort((a, b) => a.cost - b.cost);

  for (const item of sorted) {
    const row = document.createElement('button');
    row.id = `row-${item.id}`;
    row.className = 'tech-row-item';

    row.innerHTML = `
      <span class="t-name">${item.name}</span>
      <div class="t-metrics">
        <span class="t-gain">${item.gainDesc}</span>
        <span class="t-price" id="cost-${item.id}">${formatNum(item.cost)}</span>
      </div>
    `;

    row.addEventListener('click', () => buyRunItem(item));
    catalogListEl.appendChild(row);
  }
  updateShopVisibility();
}

function updateShopVisibility() {
  for (const item of runCatalog) {
    const row = document.getElementById(`row-${item.id}`);
    if (!row) continue;

    row.disabled = zoucs < item.cost;
    const costEl = document.getElementById(`cost-${item.id}`);
    if (costEl) costEl.textContent = formatNum(item.cost);
  }
}

function buyRunItem(item) {
  if (zoucs < item.cost || isPaused || !inRun) return;

  zoucs -= item.cost;
  item.qty = (item.qty || 0) + 1;
  
  const mult = permanentPerks.quantumResonance ? 2 : 1;
  if (item.gainClick) clickPower += (item.gainClick * mult);
  if (item.gainAuto) passiveIncome += (item.gainAuto * mult);

  item.cost = Math.round(item.cost * item.mult);
  refreshUI();
}

function refreshUI() {
  if (counterEl) counterEl.textContent = formatNum(zoucs);
  if (statPassiveEl) statPassiveEl.textContent = `+${passiveIncome.toFixed(1)}`;
  if (statClickEl) statClickEl.textContent = `+${clickPower}`;
  if (tileGainEl) tileGainEl.textContent = `+${clickPower}`;

  updateShopVisibility();
}

function saveGame() {
  const payload = {
    vaultZoucs,
    unlockedShapes,
    unlockedColors,
    customShape,
    customColor,
    customImageSrc,
    playerPseudo,
    permanentPerks
  };
  localStorage.setItem('clac_roguelite_save', JSON.stringify(payload));
}
setInterval(saveGame, 3000);

// REVENU PASSIF EN RUN (Le Carré Bêta transfère 10% de sa production globale si débloqué)
setInterval(() => {
  if (inRun && !isJammed && !isPaused) {
    let totalPassive = passiveIncome;
    if (permanentPerks.betaUnlock) {
      totalPassive += (clickPower * 0.1); // Apporte 10% du clic de base en passif permanent
    }
    if (totalPassive > 0) {
      zoucs += totalPassive / 10;
      if (counterEl) counterEl.textContent = formatNum(zoucs);
      updateShopVisibility();
    }
  }
}, 100);

// ÉVÉNEMENTS DOM
document.addEventListener('DOMContentLoaded', () => {
  initDomReferences();

  if (tabNavHub) tabNavHub.addEventListener('click', () => { if (!inRun) showView('hub'); });
  if (tabNavRun) tabNavRun.addEventListener('click', () => { if (inRun) showView('run'); });
  if (btnLaunchRun) btnLaunchRun.addEventListener('click', startNewRun);

  if (btnTogglePause) {
    btnTogglePause.addEventListener('click', () => setPauseState(!isPaused));
  }
  if (btnQuitRun) {
    btnQuitRun.addEventListener('click', () => {
      if (inRun) {
        setPauseState(false);
        endRun(false, true);
      }
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P') {
      if (inRun && runSummaryModal && runSummaryModal.classList.contains('is-hidden') && gameoverOverlay && gameoverOverlay.classList.contains('is-hidden')) {
        setPauseState(!isPaused);
      }
    }
  });

  if (activeSquare) {
    activeSquare.addEventListener('pointerdown', handleMainClick);
  }
  
  if (betaSquare) {
    betaSquare.addEventListener('pointerdown', (e) => {
      if (!inRun || isJammed || isFrozen || isPaused) return;
      registerStrokeHeat();
      const boost = getHeatMultiplier();
      let gain = Math.round(3 * boost);
      zoucs += gain;
      refreshUI();
      const box = betaSquare.getBoundingClientRect();
      spawnParticle(e.clientX || (box.left + box.width / 2), e.clientY || (box.top + box.height / 2), `+${gain}`);
    });
  }

  [hazard1, hazard2, hazard3].forEach(el => {
    if (el) el.addEventListener('pointerdown', () => handleHazardHit(el));
  });

  if (freeInkStain) {
    freeInkStain.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (isPaused) return;
      megaStainHp--;
      const currentW = parseInt(freeInkStain.style.width) || 140;
      const nextW = Math.max(80, currentW - 30);
      freeInkStain.style.width = `${nextW}px`;
      freeInkStain.style.height = `${nextW}px`;

      if (megaStainHp > 0) {
        stainHpPill.textContent = `${megaStainHp} CLICS`;
        spawnParticle(e.clientX, e.clientY, 'RÉTRÉCIT !', false);
      } else {
        hideFreeStain();
        spawnParticle(window.innerWidth / 2, window.innerHeight / 2, 'BAVURE DISSOUTE !', false);
      }
    });
  }

  if (btnSavePseudo) {
    btnSavePseudo.addEventListener('click', () => {
      if (pseudoInput) {
        const val = pseudoInput.value.trim();
        if (val) {
          playerPseudo = val.substring(0, 8);
          applyCosmetics();
          saveGame();
        }
      }
    });
  }

  if (customImageInput) {
    customImageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
          customImageSrc = event.target.result;
          applyCosmetics();
          saveGame();
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (btnRemoveImage) {
    btnRemoveImage.addEventListener('click', () => {
      customImageSrc = null;
      applyCosmetics();
      saveGame();
    });
  }

  if (btnReturnHome) {
    btnReturnHome.addEventListener('click', () => {
      if (runSummaryModal) runSummaryModal.classList.add('is-hidden');
      showView('hub');
    });
  }
  if (btnBankAndLeave) {
    btnBankAndLeave.addEventListener('click', () => { endRun(true, false); });
  }
  if (btnContinueRun) {
    btnContinueRun.addEventListener('click', () => {
      if (floorClearBanner) floorClearBanner.classList.add('is-hidden');
    });
  }
  if (btnRestartGame) {
    btnRestartGame.addEventListener('click', () => {
      if (gameoverOverlay) gameoverOverlay.classList.add('is-hidden');
      showView('hub');
    });
  }

  if (hubStaticSquare) {
    hubStaticSquare.addEventListener('pointerdown', (e) => {
      vaultZoucs += (1 + permanentPerks.clickBonus);
      if (hubVaultCounter) hubVaultCounter.textContent = formatNum(vaultZoucs);
      renderHub();
      saveGame();

      const box = hubStaticSquare.getBoundingClientRect();
      spawnParticle(e.clientX || (box.left + box.width / 2), e.clientY || (box.top + box.height / 2), `+${1 + permanentPerks.clickBonus}`);
    });
  }

  applyCosmetics();
  showView('hub');
  renderHub();
  requestAnimationFrame(updatePhysics);
});