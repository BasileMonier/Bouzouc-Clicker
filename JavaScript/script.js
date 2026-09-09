// --- ÉTAT DU JEU & SAUVEGARDE LOCALE ---
let saved = {};
try {
  saved = JSON.parse(localStorage.getItem('bouzouc_pixel_save') || '{}');
} catch (e) {
  saved = {};
}

let zoucs = typeof saved.zoucs === 'number' ? saved.zoucs : 0;
let clickPower = typeof saved.clickPower === 'number' ? saved.clickPower : 1;
let passiveIncome = typeof saved.passiveIncome === 'number' ? saved.passiveIncome : 0;

// --- CATALOGUE D'OUTILS ET MACHINES CUBIQUES ---
const catalog = {
  click1: { baseCost: 15,      cost: 15,      gainClick: 1,    gainAuto: 0,    qty: 0, mult: 1.15, color: '#8d6e63' },
  auto1:  { baseCost: 30,      cost: 30,      gainClick: 0,    gainAuto: 1,    qty: 0, mult: 1.15, color: '#b0bec5' },
  click2: { baseCost: 120,     cost: 120,     gainClick: 5,    gainAuto: 0,    qty: 0, mult: 1.18, color: '#cfd8dc' },
  auto2:  { baseCost: 400,     cost: 400,     gainClick: 0,    gainAuto: 12,   qty: 0, mult: 1.18, color: '#ef4444' },
  click3: { baseCost: 1500,    cost: 1500,    gainClick: 35,   gainAuto: 0,    qty: 0, mult: 1.22, color: '#38bdf8' },
  auto3:  { baseCost: 5000,    cost: 5000,    gainClick: 0,    gainAuto: 90,   qty: 0, mult: 1.25, color: '#f59e0b' },
  relic:  { baseCost: 1000000, cost: 1000000, gainClick: 6000, gainAuto: 1200, qty: 0, mult: 1.40, color: '#27272a' }
};

if (saved.catalog) {
  for (const k in saved.catalog) {
    if (catalog[k]) {
      catalog[k].qty = saved.catalog[k].qty || 0;
      catalog[k].cost = saved.catalog[k].cost || catalog[k].baseCost;
    }
  }
}

// --- ÉLÉMENTS DU DOM ---
const counterEl = document.getElementById('counter');
const passiveRateEl = document.getElementById('passive-rate');
const targetBtn = document.getElementById('bouzouc');
const cartContainer = document.getElementById('cart-container');
const birdsLayer = document.getElementById('pixel-birds');

for (const key in catalog) {
  catalog[key].btnEl = document.getElementById(`buy-${key}`);
  catalog[key].costEl = document.getElementById(`cost-${key}`);
  catalog[key].qtyEl = document.getElementById(`qty-${key}`);
  catalog[key].btnEl.addEventListener('click', () => buyItem(key));
}

function formatNum(num) {
  return Math.floor(num).toLocaleString('fr-FR');
}

// 1. OISEAUX CARRÉS DANS LE CIEL
function spawnPixelBird() {
  const bird = document.createElement('div');
  bird.className = 'voxel-bird';
  bird.style.top = `${Math.random() * 35 + 8}%`;
  bird.style.animationDuration = `${(Math.random() * 8 + 14).toFixed(1)}s`;
  birdsLayer.appendChild(bird);

  setTimeout(() => bird.remove(), 22000);
}
setInterval(spawnPixelBird, 5500);
spawnPixelBird();

// 2. ENVOI D'UN WAGONNET SUR LES RAILS
function spawnMinecart(cargoColor) {
  if (cartContainer.children.length > 14) {
    cartContainer.firstElementChild.remove();
  }

  const cart = document.createElement('div');
  cart.className = 'pixel-minecart';

  // Petite boîte de cargaison dans le wagonnet
  const cargo = document.createElement('div');
  cargo.className = 'cart-cargo';
  cargo.style.backgroundColor = cargoColor;
  cart.appendChild(cargo);

  // Vitesse de circulation sur les rails (entre 7s et 12s)
  const duration = (Math.random() * 5 + 7).toFixed(1);
  cart.style.animationDuration = `${duration}s`;
  cart.style.animationDelay = `-${(Math.random() * 6).toFixed(1)}s`;

  cartContainer.appendChild(cart);
}

// Restaurer les wagonnets des améliorations déjà possédées
for (const k in catalog) {
  if (catalog[k].qty > 0) {
    spawnMinecart(catalog[k].color);
  }
}

// 3. CHIFFRES PIXEL ART JAILLISSANTS
function spawnPixelParticle(x, y, amount) {
  const node = document.createElement('div');
  node.className = 'pixel-pop';
  node.textContent = `+${amount}`;
  const drift = (Math.random() - 0.5) * 36;
  node.style.left = `${x + drift}px`;
  node.style.top = `${y}px`;
  document.body.appendChild(node);

  setTimeout(() => node.remove(), 600);
}

function refreshUI() {
  counterEl.textContent = formatNum(zoucs);
  passiveRateEl.textContent = `+${formatNum(passiveIncome)} / SEC`;

  for (const key in catalog) {
    const item = catalog[key];
    item.btnEl.disabled = zoucs < item.cost;
    item.costEl.textContent = formatNum(item.cost);
    item.qtyEl.textContent = `x${item.qty}`;
  }
}

// Sauvegarde locale
function saveGame() {
  const dump = {
    zoucs,
    clickPower,
    passiveIncome,
    catalog: {}
  };
  for (const k in catalog) {
    dump.catalog[k] = { qty: catalog[k].qty, cost: catalog[k].cost };
  }
  localStorage.setItem('bouzouc_pixel_save', JSON.stringify(dump));
}
setInterval(saveGame, 3000);

// MINER LE BLOC D'ÉMERAUDE
function handleMine(e) {
  zoucs += clickPower;
  refreshUI();

  counterEl.style.transform = 'scale(1.08)';
  setTimeout(() => counterEl.style.transform = 'scale(1)', 40);

  const box = targetBtn.getBoundingClientRect();
  const x = (e && e.clientX) ? e.clientX : (box.left + box.width / 2);
  const y = (e && e.clientY) ? e.clientY : (box.top + box.height / 2);
  spawnPixelParticle(x, y, clickPower);
}

// ACHAT D'AMÉLIORATION
function buyItem(key) {
  const item = catalog[key];
  if (zoucs >= item.cost) {
    zoucs -= item.cost;
    item.qty += 1;
    clickPower += item.gainClick;
    passiveIncome += item.gainAuto;
    item.cost = Math.round(item.cost * item.mult);

    spawnMinecart(item.color);
    refreshUI();
    saveGame();
  }
}

// REVENU PASSIF (Toutes les 100ms)
setInterval(() => {
  if (passiveIncome > 0) {
    zoucs += passiveIncome / 10;
    counterEl.textContent = formatNum(zoucs);

    for (const key in catalog) {
      catalog[key].btnEl.disabled = zoucs < catalog[key].cost;
    }
  }
}, 100);

targetBtn.addEventListener('pointerdown', handleMine);

// Support touche Espace
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && e.target.tagName !== 'BUTTON') {
    e.preventDefault();
    handleMine(null);
  }
});

refreshUI();