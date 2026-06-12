// Sticky-note task checklist (Section 5.10): docked to the right edge,
// collapses to a thin tab, yellow notepad with blue ruled lines.
// Mounted once at boot; persists per settings.tasksPersistAcrossFlights
// (clearing happens in arrival.js).
import * as store from '../store.js';

export function mountTaskPanel() {
  const dock = document.createElement('div');
  dock.id = 'task-dock';
  dock.className = 'collapsed';
  dock.innerHTML = `
    <button class="dock-tab" title="Tasks">📝</button>
    <div class="notepad">
      <div class="note-head">
        <span>Tasks</span>
        <button id="clear-done" title="Clear completed">clear done</button>
      </div>
      <ul id="task-list"></ul>
      <form id="task-add">
        <input type="text" id="task-text" placeholder="Add a task…" maxlength="120" />
        <button type="submit">+</button>
      </form>
    </div>`;
  document.body.appendChild(dock);

  const list = dock.querySelector('#task-list');

  function renderTasks() {
    const tasks = store.get().tasks;
    list.innerHTML = tasks.map(t => `
      <li data-id="${t.id}" class="${t.checked ? 'done' : ''}">
        <input type="checkbox" ${t.checked ? 'checked' : ''} />
        <span class="task-label" contenteditable="true" spellcheck="false"></span>
        <button class="del" title="Delete">×</button>
      </li>`).join('');
    // set text via textContent so user input is never parsed as HTML
    list.querySelectorAll('li').forEach(li => {
      const t = tasks.find(x => x.id === li.dataset.id);
      li.querySelector('.task-label').textContent = t.text;
    });
  }

  dock.querySelector('.dock-tab').addEventListener('click', () => dock.classList.toggle('collapsed'));

  dock.querySelector('#task-add').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = dock.querySelector('#task-text');
    const text = input.value.trim();
    if (!text) return;
    store.get().tasks.push({ id: crypto.randomUUID(), text, checked: false, createdAt: new Date().toISOString() });
    input.value = '';
    store.save();
    renderTasks();
  });

  dock.querySelector('#clear-done').addEventListener('click', () => {
    const d = store.get();
    d.tasks = d.tasks.filter(t => !t.checked);
    store.save();
    renderTasks();
  });

  list.addEventListener('change', (e) => {
    if (e.target.type !== 'checkbox') return;
    const li = e.target.closest('li');
    const t = store.get().tasks.find(x => x.id === li.dataset.id);
    t.checked = e.target.checked;
    li.classList.toggle('done', t.checked);
    store.save();
  });

  list.addEventListener('click', (e) => {
    if (!e.target.classList.contains('del')) return;
    const li = e.target.closest('li');
    const d = store.get();
    d.tasks = d.tasks.filter(x => x.id !== li.dataset.id);
    store.save();
    renderTasks();
  });

  // inline edit: save on blur / Enter
  list.addEventListener('blur', (e) => {
    if (!e.target.classList.contains('task-label')) return;
    const li = e.target.closest('li');
    const t = store.get().tasks.find(x => x.id === li.dataset.id);
    const text = e.target.textContent.trim();
    if (text) { t.text = text; } else { e.target.textContent = t.text; }
    store.save();
  }, true);
  list.addEventListener('keydown', (e) => {
    if (e.target.classList.contains('task-label') && e.key === 'Enter') {
      e.preventDefault();
      e.target.blur();
    }
  });

  // re-render when another screen changes tasks (arrival clear, import, reset)
  window.addEventListener('tasks-changed', renderTasks);

  renderTasks();
  return { renderTasks };
}
