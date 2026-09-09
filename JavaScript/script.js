// --- ÉTAT GLOBAL ---
let zoucs = 0;
let clickPower = 1;
let passiveIncome = 0;

// --- DÉFINITION DES ICÔNES SVG VECTORIELLES (FINI LES ÉMOJIS) ---
const ICONS = {
  chisel: `<svg class="pod-icon" viewBox="0 0 24 24"><path d="M19.7 4.3a1 1 0 0 0-1.4 0L13 9.6l1.4 1.4 5.3-5.3a1 1 0 0 0 0-1.4zM4.3 18.3 11.6 11l1.4 1.4-7.3 7.3H3v-2.7z"/></svg>`,
  robot:  `<svg class="pod-icon" viewBox="0 0 24 24"><path d="M12 2a2 2 0 0 1 2 2c0 .7-.4 1.3-1 1.7V7h4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-1v2a1 1 0 0 1-2 0v-2h-4v2a1 1 0 0 1-2 0v-2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h4V5.7c-.6-.4-1-1-1-1.7a2 2 0 0 1 2-2zm-3 8a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/></svg>`,
  press:  `<svg class="pod-icon" viewBox="0 0 24 24"><path d="M4 4h16v3H4zm2 5h12v2H6zm-2 4h16v2H4zm3 4h10v3H7z"/></svg>`,
  squad:  `<svg class="pod-icon" viewBox="0 0 24 24"><path d="M12 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-6 3a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zm12 0a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4 18c0-2.2 2-4 5-4h6c3 0 5 1.8 5 4v2H4v-2z"/></svg>`,
  crucible:`<svg class="pod-icon" viewBox="0 0 24 24"><path d="M5 4h14l-2 11a5 5 0 0 1-5 4 5 5 0 0 1-5-4L5 4zm7 3a2 2 0 0 0-2 2c0 1.5 2 3.5 2 3.5s2-2 2-3.5a2 2 0 0 0-2-2z"/></svg>`,
  furnace: `<svg class="pod-icon" viewBox="0 0 24 24"><path d="M12 2C8 6 6 9.5 6 13a6 6 0 0 0 12 0c0-3.5-2-7-6-11zm0 15a3 3 0 0 1-3-3c0-1.7 1.3-3.3 3-5 1.7 1.7 3 3.3 3 5a3 3 0 0 1-3 3z"/></svg>`
};

// --- CATALOGUE ---
const catalog = {
  click1: { baseCost: 15,    cost: 15,    gainClick: 1,  gainAuto: 0,  qty: 0, mult: 1.15, icon: ICONS.chisel,   label: 'Burin',   dir: 'up' },
  auto1:  { baseCost: 30,    cost: 30,    gainClick: 0,  gainAuto: 1,  qty: 0, mult: 1.15, icon: ICONS.robot,    label: 'Robot',   dir: 'down' },
  click2: { baseCost: 120,   cost: 120,   gainClick: 4,  gainAuto: 0,  qty: 0, mult: 1.18, icon: ICONS.press,    label: 'Presse',  dir: 'up' },
  auto2:  { baseCost: 350,   cost: 350,   gainClick: 0,  gainAuto: 8,  qty: 0, mult: 1.18, icon: ICONS.squad,    label: 'Peloton', dir: 'down' },
  click3: { baseCost: 1000,  cost: 1000,  gainClick: 20, gainAuto: 0,  qty: 0, mult: 1.22, icon: ICONS.crucible, label: 'Creuset', dir: 'up' },
  auto3:  { baseCost: 3200,  cost: 3200,  gainClick: 0,  gainAuto: 50, qty: 0, mult: 1.25, icon: ICONS.furnace,  label: 'Four',    dir: 'down' }
};

// --- DOM ---
const counterEl = document.getElementById('counter');
const passiveRateEl = document.getElementById('passive-rate');
const targetBtn = document.getElementById('bouzouc');
const elevatorTrack = document.getElementById('elevator-track');

for (const key in catalog) {
  catalog[key].btnEl = document.getElementById(`buy-${key}`);
  catalog[key].costEl = document.getElementById(`cost-${key}`);
  catalog[key].qtyEl = document.getElementById(`qty-${key}`);

  catalog[key].btnEl.addEventListener('click', () => buyItem(key));
}

function formatNum(num) {
  return Math.floor(num).toLocaleString('fr-FR');
}

// Chiffres volants
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

// CRÉATION D'UNE CAPSULE DANS L'ÉLÉVATEUR VERTICAL
function spawnElevatorPod(iconSvg, label, direction) {
  // Limite pour fluidité (max 20 capsules)
  if (elevatorTrack.children.length > 20) {
    elevatorTrack.firstElementChild.remove();
  }

  const pod = document.createElement('div');
  pod.className = `mech-pod move-${direction}`;

  // Vitesse de transit vertical (entre 8s et 14s)
  const duration = (Math.random() * 6 + 8).toFixed(1);
  pod.style.animationDuration = `${duration}s`;

  pod.innerHTML = `
    ${iconSvg}
    <span class="pod-tag">${label}</span>
    <span class="pod-light"></span>
  `;

  elevatorTrack.appendChild(pod);
}

function refreshUI() {
  counterEl.textContent = formatNum(zoucs);
  passiveRateEl.textContent = `${formatNum(passiveIncome)} / sec`;

  for (const key in catalog) {
    const item = catalog[key];
    item.btnEl.disabled = zoucs < item.cost;
    item.costEl.textContent = formatNum(item.cost);
    item.qtyEl.textContent = `x${item.qty}`;
  }
}

// Frapper le Bouzouc
function handleStrike(e) {
  zoucs += clickPower;
  refreshUI();

  counterEl.style.transform = 'scale(1.08)';
  setTimeout(() => counterEl.style.transform = 'scale(1)', 50);

  const box = targetBtn.getBoundingClientRect();
  const x = e.clientX || (box.left + box.width / 2);
  const y = e.clientY || (box.top + box.height / 2);
  spawnParticle(x, y, clickPower);
}

// Achat d'une amélioration
function buyItem(key) {
  const item = catalog[key];
  if (zoucs >= item.cost) {
    zoucs -= item.cost;
    item.qty += 1;
    clickPower += item.gainClick;
    passiveIncome += item.gainAuto;
    item.cost = Math.round(item.cost * item.mult);

    // Injection de la capsule mécanique dans la colonne verticale
    spawnElevatorPod(item.icon, item.label, item.dir);

    refreshUI();
  }
}

// Production passive
setInterval(() => {
  if (passiveIncome > 0) {
    zoucs += passiveIncome / 10;
    counterEl.textContent = formatNum(zoucs);

    for (const key in catalog) {
      catalog[key].btnEl.disabled = zoucs < catalog[key].cost;
    }
  }
}, 100);

targetBtn.addEventListener('pointerdown', handleStrike);

refreshUI();