// --- ÉTAT DU JEU & PERSISTANCE ---
let saved = {};
try {
  saved = JSON.parse(localStorage.getItem('bouzouc_prism_save') || '{}');
} catch (e) {
  saved = {};
}

let zoucs = typeof saved.zoucs === 'number' ? saved.zoucs : 0;
let clickPower = typeof saved.clickPower === 'number' ? saved.clickPower : 1;
let passiveIncome = typeof saved.passiveIncome === 'number' ? saved.passiveIncome : 0;

let hasDuoBlock = saved.hasDuoBlock || false;
let unlockedRealms = saved.unlockedRealms || [1];
let currentRealm = saved.currentRealm || 1;

// --- CONFIGURATION DES MONDES ---
const REALMS = {
  1: { name: "Secteur I — Manufacture Émeraude", cost: 0, class: "realm-glass-1" },
  2: { name: "Secteur II — Crypte d'Ambre", cost: 150000, class: "realm-glass-2" },
  3: { name: "Secteur III — Noyau de Cobalt", cost: 2500000, class: "realm-glass-3" }
};

// --- CATALOGUE STABLE DES AMÉLIORATIONS ---
const itemsData = [
  { id: 'c1', name: 'Burin en Verre Trempé', gainDesc: '+1 Zouc / clic', baseCost: 15, cost: 15, gainClick: 1, gainAuto: 0, qty: 0, mult: 1.15 },
  { id: 'a1', name: 'Robot Polisseur', gainDesc: '+1 Zouc / sec', baseCost: 35, cost: 35, gainClick: 0, gainAuto: 1, qty: 0, mult: 1.15 },
  { id: 'c2', name: 'Presse de Verrier', gainDesc: '+6 Zoucs / clic', baseCost: 180, cost: 180, gainClick: 6, gainAuto: 0, qty: 0, mult: 1.18 },
  { id: 'a2', name: 'Laminoir Automatique', gainDesc: '+16 Zoucs / sec', baseCost: 700, cost: 700, gainClick: 0, gainAuto: 16, qty: 0, mult: 1.20 },
  { id: 'c3', name: 'Diamant de Découpe', gainDesc: '+35 Zoucs / clic', baseCost: 2400, cost: 2400, gainClick: 35, gainAuto: 0, qty: 0, mult: 1.22 },
  { id: 'duo', name: '★ SECOND BLOC DE FRAPPE', gainDesc: 'Débloque un 2e bouton', baseCost: 20000, cost: 20000, isDuo: true },
  { id: 'a3', name: 'Fourneau de Fusion', gainDesc: '+120 Zoucs / sec', baseCost: 8500, cost: 8500, gainClick: 0, gainAuto: 120, qty: 0, mult: 1.24 },
  { id: 'c4', name: 'Laser Prismatique', gainDesc: '+300 Zoucs / clic', baseCost: 65000, cost: 65000, gainClick: 300, gainAuto: 0, qty: 0, mult: 1.25 },
  { id: 'relic', name: '👑 Monolithe d’Émeraude', gainDesc: '+5 000/clic & +2 000/s', baseCost: 1000000, cost: 1000000, gainClick: 5000, gainAuto: 2000, qty: 0, mult: 1.45 }
];

// Restaurer la sauvegarde
if (saved.items) {
  for (const s of saved.items) {
    const it = itemsData.find(i => i.id === s.id);
    if (it) {
      it.qty = s.qty || 0;
      it.cost = s.cost || it.baseCost;
    }
  }
}

// --- DOM REFERENCES ---
const counterEl = document.getElementById('counter');
const passiveRateEl = document.getElementById('passive-rate');
const activeRealmTag = document.getElementById('active-realm-tag');
const btnMain = document.getElementById('bouzouc-main');
const btnSecond = document.getElementById('bouzouc-second');
const shopCatalog = document.getElementById('shop-catalog');

function formatNum(num) {
  return Math.floor(num).toLocaleString('fr-FR');
}

// 1. PARTICULES DE SCORE
function spawnParticle(x, y, amount) {
  const node = document.createElement('div');
  node.className = 'pop-gain';
  node.textContent = `+${amount}`;
  const drift = (Math.random() - 0.5) * 30;
  node.style.left = `${x + drift}px`;
  node.style.top = `${y}px`;
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 600);
}

// 2. INITIALISATION UNIQUE DES CARTES (ANTI-SAUTS)
function setupShopCatalog() {
  shopCatalog.innerHTML = '';
  // Tri initial par coût de base
  const sorted = [...itemsData].sort((a, b) => a.cost - b.cost);

  for (const item of sorted) {
    const card = document.createElement('button');
    card.id = `card-${item.id}`;
    card.className = 'store-card is-hidden';

    card.innerHTML = `
      <div class="c-head">
        <span class="c-name">${item.name}</span>
        <span class="c-gain">${item.gainDesc}</span>
      </div>
      <div class="c-foot">
        <span class="c-price" id="cost-${item.id}">${formatNum(item.cost)} Z</span>
        <span class="c-qty" id="qty-${item.id}">${item.qty !== undefined ? `x${item.qty}` : 'UNIQUE'}</span>
      </div>
    `;

    card.addEventListener('click', () => buyItem(item));
    shopCatalog.appendChild(card);
  }
}

// 3. MISE À JOUR STABLE SANS TOUCHER AU DOM
function updateShopVisibility() {
  for (const item of itemsData) {
    const card = document.getElementById(`card-${item.id}`);
    if (!card) continue;

    // Si le 2e bouton est déjà acquis, on cache la carte définitivement
    if (item.isDuo && hasDuoBlock) {
      card.classList.add('is-hidden');
      continue;
    }

    // BROUILLARD D'ACHAT : Apparaît si le joueur a au moins 80% du prix ou s'il l'a déjà acheté une fois
    const isRevealed = zoucs >= (item.cost * 0.8) || (item.qty && item.qty > 0);
    if (isRevealed) {
      card.classList.remove('is-hidden');
      card.disabled = zoucs < item.cost;
      
      const costEl = document.getElementById(`cost-${item.id}`);
      const qtyEl = document.getElementById(`qty-${item.id}`);
      if (costEl) costEl.textContent = `${formatNum(item.cost)} Z`;
      if (qtyEl && item.qty !== undefined) qtyEl.textContent = `x${item.qty}`;
    } else {
      card.classList.add('is-hidden');
    }
  }
}

// 4. GESTION DES MONDES DÉBLOCABLES
function checkRealmUnlocks() {
  for (const rId of [2, 3]) {
    const btn = document.getElementById(`realm-btn-${rId}`);
    if (!btn) continue;

    const reqCost = REALMS[rId].cost;
    const isUnlocked = unlockedRealms.includes(rId);

    if (isUnlocked) {
      btn.classList.remove('is-locked');
      btn.querySelector('.r-status').textContent = (currentRealm === rId) ? 'Actif' : 'Accessible';
    } else if (zoucs >= reqCost) {
      // Déblocage automatique du monde
      unlockedRealms.push(rId);
      btn.classList.remove('is-locked');
      btn.querySelector('.r-status').textContent = 'Débloqué !';
    }
  }
}

function switchRealm(rId) {
  if (!unlockedRealms.includes(rId)) return;
  currentRealm = rId;

  document.body.className = REALMS[rId].class;
  activeRealmTag.textContent = REALMS[rId].name;

  for (let i = 1; i <= 3; i++) {
    const btn = document.getElementById(`realm-btn-${i}`);
    if (btn) {
      if (i === rId) {
        btn.classList.add('is-active');
        btn.querySelector('.r-status').textContent = 'Actif';
      } else if (unlockedRealms.includes(i)) {
        btn.classList.remove('is-active');
        btn.querySelector('.r-status').textContent = 'Accessible';
      }
    }
  }
  saveGame();
}

for (let i = 1; i <= 3; i++) {
  document.getElementById(`realm-btn-${i}`).addEventListener('click', () => switchRealm(i));
}

// 5. ACHAT D'UN OBJET
function buyItem(item) {
  if (zoucs < item.cost) return;

  zoucs -= item.cost;

  if (item.isDuo) {
    hasDuoBlock = true;
    btnSecond.classList.remove('hidden');
  } else {
    item.qty = (item.qty || 0) + 1;
    clickPower += item.gainClick;
    passiveIncome += item.gainAuto;
    item.cost = Math.round(item.cost * item.mult);
  }

  refreshUI();
  saveGame();
}

// 6. CLIC MANUEL
function handleClick(e) {
  zoucs += clickPower;
  refreshUI();

  const box = e.currentTarget.getBoundingClientRect();
  const x = e.clientX || (box.left + box.width / 2);
  const y = e.clientY || (box.top + box.height / 2);
  spawnParticle(x, y, clickPower);
}

btnMain.addEventListener('pointerdown', handleClick);
btnSecond.addEventListener('pointerdown', handleClick);

// 7. RAFRAÎCHISSEMENT GLOBAL
function refreshUI() {
  counterEl.textContent = formatNum(zoucs);
  passiveRateEl.textContent = `+${formatNum(passiveIncome)} Z/s`;

  if (hasDuoBlock) {
    btnSecond.classList.remove('hidden');
  }

  checkRealmUnlocks();
  updateShopVisibility();
}

// 8. SAUVEGARDE
function saveGame() {
  const payload = {
    zoucs,
    clickPower,
    passiveIncome,
    hasDuoBlock,
    unlockedRealms,
    currentRealm,
    items: itemsData.map(i => ({ id: i.id, cost: i.cost, qty: i.qty }))
  };
  localStorage.setItem('bouzouc_prism_save', JSON.stringify(payload));
}
setInterval(saveGame, 3000);

// REVENU PASSIF (10 fois par seconde)
setInterval(() => {
  if (passiveIncome > 0) {
    zoucs += passiveIncome / 10;
    counterEl.textContent = formatNum(zoucs);
    checkRealmUnlocks();
    updateShopVisibility();
  }
}, 100);

// Initialisation
setupShopCatalog();
switchRealm(currentRealm);
refreshUI();