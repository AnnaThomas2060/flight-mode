// SHOP (Section 5.8): seat classes purchasable with miles. Cosmetic only —
// never gates the timer. Balance can never go negative.
import * as store from '../store.js';
import { PRICES } from '../points.js';
import { updateHeader } from '../app.js';

const ITEMS = [
  { itemId: 'seat_economy', cls: 'economy', label: 'Economy', cost: 0,
    desc: 'Navy classic. Where every journey starts.', swatch: ['#34466f', '#c8344a'] },
  { itemId: 'seat_business', cls: 'business', label: 'Business', cost: PRICES.seat_business,
    desc: 'Plum tones, gold trim, extra legroom energy.', swatch: ['#4a3f66', '#b9933e'] },
  { itemId: 'seat_first', cls: 'first', label: 'First Class', cost: PRICES.seat_first,
    desc: 'Burgundy leather and champagne accents.', swatch: ['#5e3038', '#d8c49a'] }
];

export default function shop(root, { navigate }) {
  const d = store.get();

  function owned(itemId) {
    return itemId === 'seat_economy' || d.unlocks.some(u => u.itemId === itemId);
  }

  function render() {
    const cards = ITEMS.map(item => {
      const isOwned = owned(item.itemId);
      const isActive = d.activeSeatClass === item.cls;
      const affordable = d.wallet.points >= item.cost;
      let action;
      if (isActive) action = `<button disabled>✓ Active</button>`;
      else if (isOwned) action = `<button class="primary" data-use="${item.cls}">Use</button>`;
      else action = `<button class="primary" data-buy="${item.itemId}" ${affordable ? '' : 'disabled'}>
                       ${item.cost.toLocaleString()} mi</button>`;
      return `
        <div class="shop-card ${isOwned ? 'owned' : 'locked'}">
          <div class="swatch" style="background:linear-gradient(135deg, ${item.swatch[0]} 60%, ${item.swatch[1]} 60%)"></div>
          <h2>${item.label}</h2>
          <p class="sub">${item.desc}</p>
          ${action}
        </div>`;
    }).join('');

    root.innerHTML = `
      <div class="screen-pad">
        <h1>Seat shop</h1>
        <p class="sub">Your miles: <strong>${d.wallet.points.toLocaleString()} mi</strong>.
        Upgrades are cosmetic — focus is always free.</p>
        <div class="shop-grid">${cards}</div>
        <button id="back">← Back to terminal</button>
      </div>`;

    root.querySelector('#back').addEventListener('click', () => navigate('home'));
    root.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', () => {
      const item = ITEMS.find(i => i.itemId === b.dataset.buy);
      if (d.wallet.points < item.cost) return; // never negative
      d.wallet.points -= item.cost;
      d.unlocks.push({ itemId: item.itemId, type: 'seat_class', unlockedAt: new Date().toISOString() });
      d.activeSeatClass = item.cls; // wear it right away
      store.save();
      updateHeader();
      render();
    }));
    root.querySelectorAll('[data-use]').forEach(b => b.addEventListener('click', () => {
      d.activeSeatClass = b.dataset.use;
      store.save();
      updateHeader();
      render();
    }));
  }

  render();
}
