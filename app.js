import { questionsFor, shuffle } from './quiz.js';
import { CORGI } from './corgi.js';
import * as store from './progress.js';

const app = document.querySelector('#app');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const LETTERS = 'ABCDE';
const ASK = ['Which one is it? 🤔', 'You know this one!', 'Take your time 💙', 'Sniff out the answer 🐾'];
const CHEERS = ['Yay! You got it, Babyloves! 💙', 'Woof woof! Correct! 🐾', 'So smart! Keep going!', 'Correct! Future nurse right here 💙', 'Perfect! I’m so proud of you!'];
const COMFORT = ['It’s okay, you got this! 💙', 'Almost! You’ll get it next time 🐾', 'No worries, Babyloves. Keep going!'];

const data = await fetch('data/modules.json').then((r) => r.json());
const modules = data.modules.map((m) => {
  const [name, sub] = m.title.split(' · ');
  const questions = questionsFor(m);
  return { ...m, id: name.match(/\d+/)[0], name, sub, questions, byKey: new Map(questions.map((q) => [q.key, q])) };
});

let lastResult = null;
let onKey = null;

function home() {
  onKey = null;
  app.innerHTML = `
    <header class="hero">
      <h1>Babyloves Review</h1>
      <p class="hello">Study Well, Babyloves 💙</p>
      <p class="course">${esc(modules[0]?.course ?? '')}</p>
    </header>
    <section class="modules">${modules.map(moduleCard).join('')}</section>`;
}

function moduleCard(m) {
  const p = store.moduleProgress(m.id);
  const total = m.questions.length;
  const mastered = m.questions.filter((q) => p.items[q.key]).length;
  const best = Math.max(0, ...p.attempts.map((a) => Math.round((100 * a.correct) / a.total)));
  const tries = p.attempts.length;
  const s = p.session;
  return `
    <article class="card module">
      <p class="eyebrow">${esc(m.name)}</p>
      <h2>${esc(m.sub)}</h2>
      <p class="topics">${esc(m.topics)}</p>
      <div class="meter" role="img" aria-label="${mastered} of ${total} mastered"><span style="width:${(100 * mastered) / total}%"></span></div>
      <p class="stats"><b>${mastered}</b> / ${total} mastered${tries ? ` · best ${best}% · ${tries} ${tries === 1 ? 'try' : 'tries'}` : ''}</p>
      <div class="actions">
        ${s
          ? `<a class="btn" href="#/m/${m.id}">Continue ${Math.min(s.pos + 1, s.order.length)}/${s.order.length}</a>
             <button class="btn ghost" data-start="${m.id}">Start over</button>`
          : `<button class="btn" data-start="${m.id}">Start</button>`}
      </div>
    </article>`;
}

function quiz(m) {
  const p = store.moduleProgress(m.id);
  if (!p.session) return start(m);
  const s = p.session;
  if (s.pos >= s.order.length) return finish(m);
  const q = m.byKey.get(s.order[s.pos]);
  if (!q) { s.order.splice(s.pos, 1); store.save(); return quiz(m); } // item gone after a re-import

  const choices = shuffle(q.choices);
  const last = s.pos === s.order.length - 1;
  app.innerHTML = `
    <section class="quiz">
      <div class="topbar">
        <a class="pill back" href="#/">‹ Modules</a>
        <span class="where">${esc(m.name)}</span>
        <span class="pill">${s.pos + 1} / ${s.order.length}</span>
      </div>
      <div class="meter"><span style="width:${(100 * s.pos) / s.order.length}%"></span></div>
      <div class="stage">
        <article class="card question">
          <p class="group">${esc(q.group)}</p>
          <p class="desc">${esc(q.description)}</p>
          <div class="choices">
            ${choices.map((c, i) => `<button class="choice" data-i="${i}"><span class="letter">${LETTERS[i]}</span><span>${esc(c)}</span></button>`).join('')}
          </div>
        </article>
        <aside class="buddy">${CORGI}<p class="bubble" aria-live="polite">${pick(ASK)}</p></aside>
      </div>
      <div class="next-row">
        <span class="pill score">✓ ${s.correct} correct</span>
        <button class="btn next" hidden>${last ? 'See my score' : 'Next'} ›</button>
      </div>
    </section>`;

  const buttons = [...app.querySelectorAll('.choice')];
  const next = app.querySelector('.next');
  const corgi = app.querySelector('.corgi');
  const bubble = app.querySelector('.bubble');

  const answer = (i) => {
    if (!next.hidden) return;
    const ok = choices[i] === q.answer;
    buttons.forEach((b, j) => {
      b.disabled = true;
      if (choices[j] === q.answer) b.classList.add('right');
    });
    if (!ok) buttons[i].classList.add('wrong');
    p.items[q.key] = ok;
    s.pos++;
    if (ok) s.correct++;
    store.save();
    corgi.classList.add(ok ? 'happy' : 'cheer');
    bubble.innerHTML = ok ? pick(CHEERS) : `${pick(COMFORT)}<br><span class="answer">Answer: <b>${esc(q.answer)}</b></span>`;
    app.querySelector('.score').textContent = `✓ ${s.correct} correct`;
    next.hidden = false;
    next.focus({ preventScroll: true });
    next.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };
  buttons.forEach((b, i) => b.addEventListener('click', () => answer(i)));
  next.addEventListener('click', () => { quiz(m); scrollTo(0, 0); });
  onKey = (key) => {
    const i = '12345'.indexOf(key) + 1 || 'abcde'.indexOf(key.toLowerCase()) + 1;
    if (i && i <= choices.length) answer(i - 1);
  };
}

function start(m) {
  store.moduleProgress(m.id).session = { order: shuffle(m.questions.map((q) => q.key)), pos: 0, correct: 0 };
  store.save();
  go(`#/m/${m.id}`);
}

function finish(m) {
  const p = store.moduleProgress(m.id);
  const { correct, order } = p.session;
  p.attempts.push({ at: Date.now(), correct, total: order.length });
  p.session = null;
  store.save();
  lastResult = { id: m.id, name: m.name, correct, total: order.length };
  go(`#/m/${m.id}/done`);
}

function results(r) {
  onKey = null;
  const pct = Math.round((100 * r.correct) / r.total);
  const message = pct >= 90 ? 'Amazing, Babyloves! You’re going to ace this! 🎉'
    : pct >= 75 ? 'Great job! So proud of you 💙'
    : pct >= 50 ? 'Good work! A little more practice and you’ve got it 🐾'
    : 'It’s okay, you got this! Let’s go again 💙';
  app.innerHTML = `
    <section class="card results">
      <div class="buddy">${CORGI}</div>
      <p class="eyebrow">${esc(r.name)} done!</p>
      <p class="big">${pct}%</p>
      <p class="stats">${r.correct} of ${r.total} correct</p>
      <p class="bubble">${message}</p>
      <div class="actions">
        <button class="btn" data-start="${r.id}">Try again</button>
        <a class="btn ghost" href="#/">All modules</a>
      </div>
    </section>`;
  app.querySelector('.corgi').classList.add(pct >= 75 ? 'happy' : 'cheer');
}

function route() {
  const [, id, done] = location.hash.match(/^#\/m\/(\d+)(\/done)?$/) ?? [];
  const m = modules.find((x) => x.id === id);
  if (!m) home();
  else if (done) lastResult?.id === id ? results(lastResult) : home();
  else quiz(m);
  scrollTo(0, 0);
}
const go = (hash) => (location.hash === hash ? route() : (location.hash = hash));

app.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-start]');
  if (btn) start(modules.find((x) => x.id === btn.dataset.start));
});
addEventListener('keydown', (e) => { if (onKey && !e.ctrlKey && !e.metaKey && !e.altKey) onKey(e.key); });
addEventListener('hashchange', route);
route();
