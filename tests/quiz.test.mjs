import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { splitSizes, questionsFor, resolveModule } from '../quiz.js';

const read = (file) => JSON.parse(readFileSync(new URL(`../data/${file}`, import.meta.url)));

test('groups split into sets of 4, with 5s then 3s for leftovers', () => {
  const expected = {
    2: [2], 3: [3], 5: [5], 6: [3, 3], 7: [4, 3], 8: [4, 4], 9: [5, 4], 10: [5, 5],
    11: [4, 4, 3], 12: [4, 4, 4], 13: [5, 4, 4], 14: [5, 5, 4], 15: [5, 5, 5],
  };
  for (const [n, sizes] of Object.entries(expected)) assert.deepEqual(splitSizes(+n), sizes, `group of ${n}`);
});

test('choices come from neighbouring names in the PDF', () => {
  const items = Array.from({ length: 9 }, (_, i) => ({ name: `N${i}`, description: `d${i}` }));
  const qs = questionsFor({ groups: [{ name: 'G', items }] });
  assert.deepEqual(qs[0].choices, ['N0', 'N1', 'N2', 'N3', 'N4']);
  assert.deepEqual(qs[8].choices, ['N5', 'N6', 'N7', 'N8']);
});

test('every reviewer item becomes one question with its own name among the choices, text untouched', () => {
  const { modules } = read('modules.json');
  for (const m of modules) {
    const items = m.groups.flatMap((g) => g.items);
    const qs = questionsFor(m);
    assert.equal(qs.length, items.length, m.title);
    qs.forEach((q, i) => {
      assert.equal(q.answer, items[i].name);
      assert.equal(q.description, items[i].description);
      assert.ok(q.choices.includes(q.answer));
      assert.ok(q.choices.length >= 2 && q.choices.length <= 5, `${q.key} has ${q.choices.length} choices`);
    });
  }
});

test('the midterm only uses real reviewer items, word for word, plus flagged extra items', () => {
  const { modules } = read('modules.json');
  const midterm = resolveModule(read('midterm.json'), modules);
  const reviewer = new Set(modules.flatMap((m) => m.groups.flatMap((g) => g.items.map((i) => `${i.name}\n${i.description}`))));
  const seen = new Set();
  for (const g of midterm.groups) {
    assert.ok(g.items.length >= 2, `${g.name} needs at least 2 items`);
    for (const i of g.items) {
      assert.ok(i.written || reviewer.has(`${i.name}\n${i.description}`), `${i.name} is not from a reviewer`);
      const text = `${i.name}\n${i.description}`;
      assert.ok(!seen.has(text), `${i.name} is in the midterm twice`);
      seen.add(text);
    }
    assert.equal(new Set(g.items.map((i) => i.name)).size, g.items.length, `${g.name} has duplicate names`);
  }
});

test('a midterm reference to a missing reviewer item fails loudly', () => {
  const { modules } = read('modules.json');
  assert.throws(() => resolveModule({ groups: [{ name: 'G', items: ['1|Homeostasis|Nope'] }] }, modules), /not found/);
});
