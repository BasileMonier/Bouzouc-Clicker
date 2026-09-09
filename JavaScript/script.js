// --- ÉTAT DU JEU ---
let count = 0;
let clickPower = 1;      // Nombre de zoucs par clic manuel
let passivePerSec = 0;   // Nombre de zoucs auto par seconde

// --- PRIX INITIAUX ---
let costAutoclick = 15;
let costMultiplier = 25;
let costSuperclick = 100;

// --- RÉCUPÉRATION DU DOM ---
const counterEl = document.getElementById('counter');
const passiveRateEl = document.getElementById('passive-rate');
const btn = document.getElementById('bouzouc');

const btnAutoclick = document.getElementById('buy-autoclick');
const btnMultiplier = document.getElementById('buy-multiplier');
const btnSuperclick = document.getElementById('buy-superclick');

const costAutoclickEl = document.getElementById('cost-autoclick');
const costMultiplierEl = document.getElementById('cost-multiplier');
const costSuperclickEl = document.getElementById('cost-superclick');

// --- AFFICHAGE FLOTTANT (+X) ---
function createPopNumber(x, y, value) {
  const el = document.createElement('div');
  el.className = 'pop-number';
  el.textContent = `+${value}`;
  const randX = (Math.random() - 0.5) * 40;
  el.style.left = `${x + randX}px`;
  el.style.top = `${y}px`;
  document.body.appendChild(el);

  setTimeout(() => el.remove(), 700);
}

// --- MISE À JOUR DE LA BOUTIQUE (ACTIVER / DÉSACTIVER) ---
function updateShopUI() {
  btnAutoclick.disabled = count < costAutoclick;
  btnMultiplier.disabled = count < costMultiplier;
  btnSuperclick.disabled = count < costSuperclick;
}

// --- MISE À JOUR DU SCORE GLOBAL ---
function updateScoreUI() {
  counterEl.textContent = Math.floor(count);
  passiveRateEl.textContent = `+${passivePerSec} zouc/sec`;
  updateShopUI();
}

// --- CLIC MANUEL SUR LE BOUZOUC ---
function handleClick(e) {
  count += clickPower;
  updateScoreUI();

  // Animation sursaut du score
  counterEl.style.transform = 'scale(1.12)';
  setTimeout(() => counterEl.style.transform = 'scale(1)', 60);

  // Position du pop-up +X
  const rect = btn.getBoundingClientRect();
  const x = e.clientX || (rect.left + rect.width / 2);
  const y = e.clientY || (rect.top + rect.height / 2);
  createPopNumber(x, y, clickPower);
}

// --- ACHATS EN BOUTIQUE ---

// 1. Robot Zouc (Auto-clicker)
btnAutoclick.addEventListener('click', () => {
  if (count >= costAutoclick) {
    count -= costAutoclick;
    passivePerSec += 1;
    costAutoclick = Math.round(costAutoclick * 1.15); // +15% plus cher
    costAutoclickEl.textContent = `${costAutoclick} Zoucs`;
    updateScoreUI();
  }
});

// 2. Doigt Agile (+1 au clic)
btnMultiplier.addEventListener('click', () => {
  if (count >= costMultiplier) {
    count -= costMultiplier;
    clickPower += 1;
    costMultiplier = Math.round(costMultiplier * 1.2);
    costMultiplierEl.textContent = `${costMultiplier} Zoucs`;
    updateScoreUI();
  }
});

// 3. Méga Tacle (+5 au clic)
btnSuperclick.addEventListener('click', () => {
  if (count >= costSuperclick) {
    count -= costSuperclick;
    clickPower += 5;
    costSuperclick = Math.round(costSuperclick * 1.25);
    costSuperclickEl.textContent = `${costSuperclick} Zoucs`;
    updateScoreUI();
  }
});

// --- BOUCLE TEMPORELLE (CLICS AUTOMATIQUES CHAQUE SECONDE) ---
setInterval(() => {
  if (passivePerSec > 0) {
    count += passivePerSec;
    updateScoreUI();
  }
}, 1000);

// Écouteur principal sur la tête
btn.addEventListener('pointerdown', handleClick);

// Initialisation au chargement
updateScoreUI();