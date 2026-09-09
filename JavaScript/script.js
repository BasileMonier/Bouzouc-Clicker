// --- ÉTAT & PERSISTANCE LOCALE ---
let saved = {};
try {
  saved = JSON.parse(localStorage.getItem('bouzouc_liquid_save') || '{}');
} catch (e) {
  saved = {};
}

let zoucs = typeof saved.zoucs === 'number' ? saved.zoucs : 0;
let clickPower = typeof saved.clickPower === 'number' ? saved.clickPower : 1;
let passiveIncome = typeof saved.passiveIncome === 'number' ? saved.passiveIncome : 0;

let unlockedRealms = saved.unlockedRealms || [1];
let currentRealm = saved.currentRealm || 1;

// --- DÉFINITION DES MONDES ---
const REALMS = {
  1: { name: "Secteur I — Nectar Émeraude", cost: 0, class: "realm-glass-1" },
  2: { name: "Secteur II — Ambre Solaire", cost: 150000, class: "realm-glass-2" },
  3: { name: "Secteur III — Saphir Fluide", cost: 2500000, class: "realm-glass-3" }
};

// --- CATALOGUE ÉPURÉ SANS LE 2E BOUTON ---
const itemsData = [
  { id: 'c1', name: 'Gouttelette Pressée', gainDesc: '+1 Zouc / clic', baseCost: 15, cost: 15, gainClick: 1, gainAuto: 0, qty: 0, mult: 1.15, cartCol: '#bef264' },
  { id: 'a1', name: 'Pompe Péristaltique', gainDesc: '+1 Zouc / sec', baseCost: 35, cost: 35, gainClick: 0, gainAuto: 1, qty: 0, mult: 1.15, cartCol: '#86efac' },
  { id: 'c2', name: 'Émulseur Satiné', gainDesc: '+6 Zoucs / clic', baseCost: 180, cost: 180, gainClick: 6, gainAuto: 0, qty: 0, mult: 1.18, cartCol: '#facc15' },
  { id: 'a2', name: 'Centrifugeuse Lime', gainDesc: '+16 Zoucs / sec', baseCost: 700, cost: 700, gainClick: 0, gainAuto: 16, qty: 0, mult: 1.20, cartCol: '#4ade80' },
  { id: 'c3', name: 'Prisme de Découpe', gainDesc: '+35 Zoucs / clic', baseCost: 2400, cost: 2400, gainClick: 35, gainAuto: 0, qty: 0, mult: 1.22, cartCol: '#38bdf8' },
  { id: 'a3', name: 'Distillateur Solaire', gainDesc: '+120 Zoucs / sec', baseCost: 8500, cost: 8500, gainClick: 0, gainAuto: 120, qty: 0, mult: 1.24, cartCol: '#f97316' },
  { id: 'c4', name: 'Condensateur Chromé', gainDesc: '+300 Zoucs / clic', baseCost: 65000, cost: 65000, gainClick: 300, gainAuto: 0, qty: 0, mult: 1.25, cartCol: '#e879f9' },
  { id: 'relic', name: '👑 Orbe de Nectar Pur', gainDesc: '+5 000/clic & +2 000/s', baseCost: 1000000, cost: 1000000, gainClick: 5000, gainAuto: 2000, qty: 0, mult: 1.45, cartCol: '#fbbf24' }
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
const shopCatalog = document.getElementById('shop-catalog');
const cartConvoy = document.getElementById('cart-convoy');

function formatNum(num) {
  return Math.floor(num).toLocaleString('fr-FR');
}

// 1. PARTICULES AU CLIC
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

// 2. WAGONS SUR LE CONVOYEUR
function spawnLiquidCart(color) {
  if (cartConvoy.children.length > 8) {
    cartConvoy.firstElementChild.remove();
  }
  const cart = document.createElement('div');
  cart.className = 'liquid-cart';

  const crystal = document.createElement('div');
  crystal.className = 'cart-crystal';
  crystal.style.backgroundColor = color;
  crystal.style.color = color;
  cart.appendChild(crystal);

  const duration = (Math.random() * 4 + 7).toFixed(1);
  cart.style.animationDuration = `${duration}s`;
  cartConvoy.appendChild(cart);
}

// Rétablir les wagonnets existants
for (const item of itemsData) {
  if (item.qty > 0) {
    spawnLiquidCart(item.cartCol);
  }
}

// 3. BULLE LIQUIDE FLOTTANTE (BONUS À 4 CLICS)
let activeBubble = null;

function spawnGlassBubble() {
  if (activeBubble) return;

  let hitsLeft = 4;
  const bubble = document.createElement('div');
  bubble.className = 'floating-glass-bubble';
  bubble.innerHTML = `<span class="bubble-hits-pill">${hitsLeft}</span>`;

  bubble.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    hitsLeft--;
    if (hitsLeft > 0) {
      bubble.querySelector('.bubble-hits-pill').textContent = hitsLeft;
      bubble.style.transform = 'scale(1.15)';
      setTimeout(() => bubble.style.transform = 'scale(1)', 80);
    } else {
      // Jackpot gagné à l'explosion de la bulle
      const jackpot = Math.max(150, Math.round((clickPower * 25) + (passiveIncome * 15)));
      zoucs += jackpot;
      refreshUI();

      const rect = bubble.getBoundingClientRect();
      spawnParticle(rect.left + 40, rect.top + 40, jackpot);

      bubble.remove();
      activeBubble = null;
    }
  });

  document.body.appendChild(bubble);
  activeBubble = bubble;

  // Disparition si non éclatée
  setTimeout(() => {
    if (activeBubble === bubble) {
      bubble.remove();
      activeBubble = null;
    }
  }, 14000);
}

// Fait apparaître une bulle toutes les 28 secondes
setInterval(spawnGlassBubble, 28000);

// 4. CRÉATION STABLE DE LA BOUTIQUE
function setupShopCatalog() {
  shopCatalog.innerHTML = '';
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

// 5. GESTION PROGRESSIVE SANS SAUT DE LA BOUTIQUE
function updateShopVisibility() {
  for (const item of itemsData) {
    const card = document.getElementById(`card-${item.id}`);
    if (!card) continue;

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

// 6. MONDES DÉBLOCABLES
function checkRealmUnlocks() {
  for (const rId of [2, 3]) {
    const btn = document.getElementById(`realm-btn-${rId}`);
    if (!btn) continue;

    const reqCost = REALMS[rId].cost;
    const isUnlocked = unlockedRealms.includes(rId);

    if (isUnlocked) {
      btn.classList.remove('is-locked');
      btn.querySelector('.tab-state').textContent = (currentRealm === rId) ? 'Actif' : 'Accessible';
    } else if (zoucs >= reqCost) {
      unlockedRealms.push(rId);
      btn.classList.remove('is-locked');
      btn.querySelector('.tab-state').textContent = 'Débloqué !';
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
        btn.querySelector('.tab-state').textContent = 'Actif';
      } else if (unlockedRealms.includes(i)) {
        btn.classList.remove('is-active');
        btn.querySelector('.tab-state').textContent = 'Accessible';
      }
    }
  }
  saveGame();
}

for (let i = 1; i <= 3; i++) {
  document.getElementById(`realm-btn-${i}`).addEventListener('click', () => switchRealm(i));
}

// 7. ACHAT D'UN OBJET
function buyItem(item) {
  if (zoucs < item.cost) return;

  zoucs -= item.cost;
  item.qty = (item.qty || 0) + 1;
  clickPower += item.gainClick;
  passiveIncome += item.gainAuto;
  item.cost = Math.round(item.cost * item.mult);

  spawnLiquidCart(item.cartCol);
  refreshUI();
  saveGame();
}

// 8. CLIC SUR LE BOUTON UNIQUE
function handleClick(e) {
  zoucs += clickPower;
  refreshUI();

  const box = e.currentTarget.getBoundingClientRect();
  const x = e.clientX || (box.left + box.width / 2);
  const y = e.clientY || (box.top + box.height / 2);
  spawnParticle(x, y, clickPower);
}

btnMain.addEventListener('pointerdown', handleClick);

// 9. MISE À JOUR GLOBALE
function refreshUI() {
  counterEl.textContent = formatNum(zoucs);
  passiveRateEl.textContent = `+${formatNum(passiveIncome)} Z/sec`;

  checkRealmUnlocks();
  updateShopVisibility();
}

// 10. SAUVEGARDE
function saveGame() {
  const payload = {
    zoucs,
    clickPower,
    passiveIncome,
    unlockedRealms,
    currentRealm,
    items: itemsData.map(i => ({ id: i.id, cost: i.cost, qty: i.qty }))
  };
  localStorage.setItem('bouzouc_liquid_save', JSON.stringify(payload));
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