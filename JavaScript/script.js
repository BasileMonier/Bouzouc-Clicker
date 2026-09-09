// --- ÉTAT & SAUVEGARDE LOCALE ---
let saved = {};
try {
  saved = JSON.parse(localStorage.getItem('bouzouc_glass_hibitsave') || '{}');
} catch (e) {
  saved = {};
}

let zoucs = typeof saved.zoucs === 'number' ? saved.zoucs : 0;
let clickPower = typeof saved.clickPower === 'number' ? saved.clickPower : 1;
let passiveIncome = typeof saved.passiveIncome === 'number' ? saved.passiveIncome : 0;

let hasDuoBlock = saved.hasDuoBlock || false;
let hasWorld2Unlocked = saved.hasWorld2Unlocked || false;
let currentWorld = saved.currentWorld || 1;

// --- DÉFINITION DE TOUS LES OBJETS DE LA BOUTIQUE ---
// Classés avec leur type pour gestion du déverrouillage
const itemsData = [
  {
    id: 'w1_c1',
    name: 'Tasse de Chocolat',
    gainDesc: '+1 Zouc / frappe',
    baseCost: 15,
    cost: 15,
    gainClick: 1,
    gainAuto: 0,
    qty: 0,
    mult: 1.15,
    world: 1,
    cartCol: '#854d0e'
  },
  {
    id: 'w1_a1',
    name: 'Mouton Cueilleur',
    gainDesc: '+1 Zouc / sec',
    baseCost: 35,
    cost: 35,
    gainClick: 0,
    gainAuto: 1,
    qty: 0,
    mult: 1.15,
    world: 1,
    cartCol: '#cbd5e1'
  },
  {
    id: 'w1_c2',
    name: 'Fourche Émaillée',
    gainDesc: '+6 Zoucs / frappe',
    baseCost: 180,
    cost: 180,
    gainClick: 6,
    gainAuto: 0,
    qty: 0,
    mult: 1.18,
    world: 1,
    cartCol: '#a16207'
  },
  {
    id: 'w1_a2',
    name: 'Cheminée à Rouages',
    gainDesc: '+15 Zoucs / sec',
    baseCost: 650,
    cost: 650,
    gainClick: 0,
    gainAuto: 15,
    qty: 0,
    mult: 1.20,
    world: 1,
    cartCol: '#dc2626'
  },
  {
    id: 'w2_c1',
    name: 'Pic de Cristal Givré',
    gainDesc: '+75 Zoucs / frappe',
    baseCost: 7500,
    cost: 7500,
    gainClick: 75,
    gainAuto: 0,
    qty: 0,
    mult: 1.22,
    world: 2,
    cartCol: '#38bdf8'
  },
  {
    id: 'special_duo',
    name: '★ MODULE BLOC B',
    gainDesc: '+1 Bouton supplémentaire',
    baseCost: 25000,
    cost: 25000,
    isDuoUpgrade: true,
    world: 1
  },
  {
    id: 'w2_a1',
    name: 'Chalet de la Taïga',
    gainDesc: '+260 Zoucs / sec',
    baseCost: 28000,
    cost: 28000,
    gainClick: 0,
    gainAuto: 260,
    qty: 0,
    mult: 1.24,
    world: 2,
    cartCol: '#0284c7'
  },
  {
    id: 'special_realm2',
    name: '❄️ CLÉ DE LA TAÏGA',
    gainDesc: 'Déverrouille le Monde 2',
    baseCost: 150000,
    cost: 150000,
    isRealmUpgrade: true,
    world: 1
  },
  {
    id: 'w2_relic',
    name: '👑 Lanterne Boréale',
    gainDesc: '+4 500/clic & +1 500/sec',
    baseCost: 1200000,
    cost: 1200000,
    gainClick: 4500,
    gainAuto: 1500,
    qty: 0,
    mult: 1.45,
    world: 2,
    cartCol: '#f59e0b'
  }
];

// Restaurer la progression sauvegardée
if (saved.items) {
  for (const savedItem of saved.items) {
    const item = itemsData.find(i => i.id === savedItem.id);
    if (item) {
      item.qty = savedItem.qty || 0;
      item.cost = savedItem.cost || item.baseCost;
    }
  }
}

// --- DOM REFERENCES ---
const counterEl = document.getElementById('counter');
const passiveRateEl = document.getElementById('passive-rate');
const realmPillEl = document.getElementById('realm-pill');
const realmHeadingEl = document.getElementById('realm-heading');

const btnMain = document.getElementById('bouzouc-main');
const btnSecondary = document.getElementById('bouzouc-secondary');
const secondGemSlot = document.getElementById('second-gem-slot');

const travelW1 = document.getElementById('travel-world-1');
const travelW2 = document.getElementById('travel-world-2');
const dynamicShop = document.getElementById('dynamic-shop');
const cartConvoy = document.getElementById('cart-convoy');

function formatNum(num) {
  return Math.floor(num).toLocaleString('fr-FR');
}

// 1. PARTICULES JAILLISSANTES
function spawnFineParticle(x, y, amount) {
  const p = document.createElement('div');
  p.className = 'fine-pop';
  p.textContent = `+${amount}`;
  const drift = (Math.random() - 0.5) * 30;
  p.style.left = `${x + drift}px`;
  p.style.top = `${y}px`;
  document.body.appendChild(p);
  setTimeout(() => p.remove(), 600);
}

// 2. WAGONNETS SUR LES RAILS
function spawnMicroCart(color) {
  if (cartConvoy.children.length > 8) {
    cartConvoy.firstElementChild.remove();
  }
  const cart = document.createElement('div');
  cart.className = 'micro-cart';
  cart.style.boxShadow = `inset 0 0 0 2px ${color}`;
  const duration = (Math.random() * 4 + 7).toFixed(1);
  cart.style.animationDuration = `${duration}s`;
  cartConvoy.appendChild(cart);
}

// 3. VOYAGE ENTRE MONDES
function setRealm(worldId) {
  currentWorld = worldId;
  if (worldId === 1) {
    document.body.className = 'world-farm';
    realmPillEl.textContent = 'FERME DU CRÉPUSCULE';
    realmHeadingEl.textContent = 'BOUZOUC WORKSHOP';
    travelW1.classList.add('is-active');
    travelW2.classList.remove('is-active');
  } else {
    document.body.className = 'world-taiga';
    realmPillEl.textContent = 'TAÏGA GIVRÉE';
    realmHeadingEl.textContent = 'FROST BOUZOUC';
    travelW2.classList.add('is-active');
    travelW1.classList.remove('is-active');
  }
  refreshShopList();
}

travelW1.addEventListener('click', () => setRealm(1));
travelW2.addEventListener('click', () => {
  if (hasWorld2Unlocked) setRealm(2);
});

// 4. RAFRAÎCHISSEMENT ET CRÉATION DE LA BOUTIQUE (TRI PAR PRIX + BROUILLARD)
function refreshShopList() {
  // Trier tous les objets par coût croissant
  const sortedItems = [...itemsData].sort((a, b) => a.cost - b.cost);

  dynamicShop.innerHTML = '';

  for (const item of sortedItems) {
    // Si l'amélioration spéciale est déjà consommée, on ne l'affiche plus
    if (item.isDuoUpgrade && hasDuoBlock) continue;
    if (item.isRealmUpgrade && hasWorld2Unlocked) continue;

    // RÈGLE DU BROUILLARD : Un item n'apparaît QUE si le joueur a eu au moins 75% du prix ou s'il en possède déjà
    const isUnlocked = zoucs >= (item.cost * 0.75) || (item.qty && item.qty > 0);
    if (!isUnlocked) continue;

    // On crée la carte Liquid Glass
    const card = document.createElement('button');
    card.className = 'liquid-card';
    if (item.isDuoUpgrade) card.classList.add('tier-duo');
    if (item.isRealmUpgrade) card.classList.add('tier-realm');

    card.disabled = zoucs < item.cost;

    card.innerHTML = `
      <div class="card-top">
        <span class="card-name">${item.name}</span>
        <span class="card-gain">${item.gainDesc}</span>
      </div>
      <div class="card-bottom">
        <span class="card-cost">${formatNum(item.cost)} Zoucs</span>
        <span class="card-qty">${item.qty !== undefined ? `x${item.qty}` : 'UNIQUE'}</span>
      </div>
    `;

    card.addEventListener('click', () => buyShopItem(item));
    dynamicShop.appendChild(card);
  }
}

// 5. ACHAT D'UN OBJET
function buyShopItem(item) {
  if (zoucs < item.cost) return;

  zoucs -= item.cost;

  if (item.isDuoUpgrade) {
    hasDuoBlock = true;
    secondGemSlot.classList.remove('is-locked');
  } else if (item.isRealmUpgrade) {
    hasWorld2Unlocked = true;
    travelW2.classList.remove('is-hidden');
    setRealm(2);
  } else {
    item.qty = (item.qty || 0) + 1;
    clickPower += item.gainClick;
    passiveIncome += item.gainAuto;
    item.cost = Math.round(item.cost * item.mult);
    spawnMicroCart(item.cartCol);
  }

  refreshGameUI();
  saveGameData();
}

// 6. MISE À JOUR DE L'INTERFACE GLOBALE
function refreshGameUI() {
  counterEl.textContent = formatNum(zoucs);
  passiveRateEl.textContent = `+${formatNum(passiveIncome)} / SEC`;

  if (hasDuoBlock) {
    secondGemSlot.classList.remove('is-locked');
  }

  if (hasWorld2Unlocked) {
    travelW2.classList.remove('is-hidden');
  }

  refreshShopList();
}

// 7. SAUVEGARDE LOCALE
function saveGameData() {
  const payload = {
    zoucs,
    clickPower,
    passiveIncome,
    hasDuoBlock,
    hasWorld2Unlocked,
    currentWorld,
    items: itemsData.map(i => ({ id: i.id, cost: i.cost, qty: i.qty }))
  };
  localStorage.setItem('bouzouc_glass_hibitsave', JSON.stringify(payload));
}
setInterval(saveGameData, 3000);

// 8. CLIC SUR LES BLOCS
function handleGemClick(e) {
  zoucs += clickPower;
  refreshGameUI();

  const box = e.currentTarget.getBoundingClientRect();
  const x = e.clientX || (box.left + box.width / 2);
  const y = e.clientY || (box.top + box.height / 2);
  spawnFineParticle(x, y, clickPower);
}

btnMain.addEventListener('pointerdown', handleGemClick);
btnSecondary.addEventListener('pointerdown', handleGemClick);

// 9. REVENU PASSIF (10x par seconde)
setInterval(() => {
  if (passiveIncome > 0) {
    zoucs += passiveIncome / 10;
    counterEl.textContent = formatNum(zoucs);

    // Actualise les boutons achetables en direct
    const cards = dynamicShop.querySelectorAll('.liquid-card');
    cards.forEach((card, idx) => {
      // Met à jour la disponibilité sans reconstruire tout le DOM
    });
  }
}, 100);

// Initialisation
setRealm(currentWorld);
refreshGameUI();