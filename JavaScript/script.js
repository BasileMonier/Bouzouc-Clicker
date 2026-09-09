// --- ÉTAT GLOBAL ---
let zoucs = 0;
let clickPower = 1;
let passiveIncome = 0;

// --- DÉFINITION DU CATALOGUE ---
const catalog = {
  click1: { baseCost: 15,    cost: 15,    gainClick: 1,  gainAuto: 0,  qty: 0, mult: 1.15 },
  auto1:  { baseCost: 30,    cost: 30,    gainClick: 0,  gainAuto: 1,  qty: 0, mult: 1.15 },
  click2: { baseCost: 120,   cost: 120,   gainClick: 4,  gainAuto: 0,  qty: 0, mult: 1.18 },
  auto2:  { baseCost: 350,   cost: 350,   gainClick: 0,  gainAuto: 8,  qty: 0, mult: 1.18 },
  click3: { baseCost: 1000,  cost: 1000,  gainClick: 20, gainAuto: 0,  qty: 0, mult: 1.22 },
  auto3:  { baseCost: 3200,  cost: 3200,  gainClick: 0,  gainAuto: 50, qty: 0, mult: 1.25 }
};

// --- RÉFÉRENCES DU DOM ---
const counterEl = document.getElementById('counter');
const passiveRateEl = document.getElementById('passive-rate');
const targetBtn = document.getElementById('bouzouc');

// Liaison dynamique des boutons du catalogue
for (const key in catalog) {
  catalog[key].btnEl = document.getElementById(`buy-${key}`);
  catalog[key].costEl = document.getElementById(`cost-${key}`);
  catalog[key].qtyEl = document.getElementById(`qty-${key}`);

  catalog[key].btnEl.addEventListener('click', () => buyItem(key));
}

// Formatage propre des nombres (espaces pour les milliers)
function formatNum(num) {
  return Math.floor(num).toLocaleString('fr-FR');
}

// Notification visuelle au clic (+X)
function spawnParticle(x, y, amount) {
  const node = document.createElement('div');
  node.className = 'pop-number';
  node.textContent = `+${amount}`;
  const drift = (Math.random() - 0.5) * 30;
  node.style.left = `${x + drift}px`;
  node.style.top = `${y}px`;
  document.body.appendChild(node);

  setTimeout(() => node.remove(), 650);
}

// Mise à jour de l'affichage
function refreshUI() {
  counterEl.textContent = formatNum(zoucs);
  passiveRateEl.textContent = `${formatNum(passiveIncome)} / sec`;

  // Vérification de la disponibilité de chaque article
  for (const key in catalog) {
    const item = catalog[key];
    item.btnEl.disabled = zoucs < item.cost;
    item.costEl.textContent = formatNum(item.cost);
    item.qtyEl.textContent = `x${item.qty}`;
  }
}

// Frappe manuelle
function handleStrike(e) {
  zoucs += clickPower;
  refreshUI();

  // Animation sèche du chiffre
  counterEl.style.transform = 'scale(1.08)';
  setTimeout(() => counterEl.style.transform = 'scale(1)', 50);

  const box = targetBtn.getBoundingClientRect();
  const x = e.clientX || (box.left + box.width / 2);
  const y = e.clientY || (box.top + box.height / 2);
  spawnParticle(x, y, clickPower);
}

// Transaction boutique
function buyItem(key) {
  const item = catalog[key];
  if (zoucs >= item.cost) {
    zoucs -= item.cost;
    item.qty += 1;
    clickPower += item.gainClick;
    passiveIncome += item.gainAuto;
    item.cost = Math.round(item.cost * item.mult);
    refreshUI();
  }
}

// Tics de production passive (10 fois par seconde pour la fluidité)
setInterval(() => {
  if (passiveIncome > 0) {
    zoucs += passiveIncome / 10;
    counterEl.textContent = formatNum(zoucs);
    // Vérifie si un bouton devient achetable
    for (const key in catalog) {
      catalog[key].btnEl.disabled = zoucs < catalog[key].cost;
    }
  }
}, 100);

// Écouteur tactile et souris
targetBtn.addEventListener('pointerdown', handleStrike);

// Démarrage
refreshUI();