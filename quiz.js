// One question per item: show its description, pick its name from the names in the item's set.
// Groups of 5 or fewer are one set. Bigger groups split in PDF order into sets of 4,
// with 5s soaking up leftovers (9 → 5+4, 14 → 5+5+4) and 3s when 5s can't (7 → 4+3, 11 → 4+4+3).
export function splitSizes(n) {
  if (n <= 5) return [n];
  const fours = Math.floor(n / 4), extra = n % 4;
  if (extra <= fours) return [...Array(extra).fill(5), ...Array(fours - extra).fill(4)];
  const threes = (3 * extra) % 4;
  return [...Array((n - 3 * threes) / 4).fill(4), ...Array(threes).fill(3)];
}

export function questionsFor(module) {
  const questions = [];
  for (const group of module.groups) {
    let start = 0;
    for (const size of splitSizes(group.items.length)) {
      const set = group.items.slice(start, (start += size));
      for (const item of set) {
        questions.push({
          key: `${group.name}|${item.name}`,
          group: group.name,
          description: item.description,
          answer: item.name,
          choices: set.map((i) => i.name),
        });
      }
    }
  }
  return questions;
}

export function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
