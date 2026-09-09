let count = 0;
const counterEl = document.getElementById('counter');
const btn = document.getElementById('kante');
const statusEl = document.getElementById('status');

// Messages selon la progression
const perks = [
  { at: 10,  msg: "Il est petit, il est gentil ! 🎶" },
  { at: 30,  msg: "Il a mangé Leo Messi ! 🎶" },
  { at: 60,  msg: "N'Golo Kanté sur tous les ballons !" },
  { at: 100, msg: "70% de la Terre est couverte par l'eau, les 30% restants par Kanté." },
  { at: 200, msg: "Il vient de faire 4 marathons d'affilée en souriant." },
  { at: 500, msg: "Le moteur thermique n'a plus de secret pour lui." },
  { at: 1000, msg: "Légende absolue du football mondial. 🏆" }
];

function createPopNumber(x, y) {
  const el = document.createElement('div');
  el.className = 'pop-number';
  el.textContent = '+1';
  const randX = (Math.random() - 0.5) * 40;
  el.style.left = `${x + randX}px`;
  el.style.top = `${y}px`;
  document.body.appendChild(el);

  setTimeout(() => el.remove(), 700);
}

function handleClick(e) {
  count++;
  counterEl.textContent = count;

  counterEl.style.transform = 'scale(1.15)';
  setTimeout(() => counterEl.style.transform = 'scale(1)', 60);

  const rect = btn.getBoundingClientRect();
  const x = e.clientX || (rect.left + rect.width / 2);
  const y = e.clientY || (rect.top + rect.height / 2);
  createPopNumber(x, y);

  for (let i = perks.length - 1; i >= 0; i--) {
    if (count >= perks[i].at) {
      statusEl.textContent = perks[i].msg;
      break;
    }
  }
}

btn.addEventListener('pointerdown', handleClick);