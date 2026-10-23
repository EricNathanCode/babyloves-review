import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { splitSizes, questionsFor } from '../quiz.js';

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
  const { modules } = JSON.parse(readFileSync(new URL('../data/modules.json', import.meta.url)));
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
