// Progress is saved in this browser's localStorage, so each device keeps its own.
const KEY = 'babyloves-review';

const progress = read() ?? { modules: {} };

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
}

export const moduleProgress = (id) => (progress.modules[id] ??= { attempts: [], items: {}, session: null });

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch { /* private mode: keep it in memory */ }
}
