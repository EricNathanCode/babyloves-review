# Babyloves Review 💙🐶

A multiple choice reviewer for Babyloves' nursing modules. Each question shows a description from her reviewer PDFs
and she picks the matching name. Choices come from the same group, so it is never a giveaway.

## Put it online (GitHub Pages)

1. **GitHub Desktop** → File → Add local repository → pick this folder → click **create a repository** → Create.
2. Commit everything to `main`, then **Publish repository**. Untick "Keep this code private"
   (free GitHub accounts only serve public repos with Pages).
3. On github.com open the repo → **Settings → Pages** → Source: *Deploy from a branch* → `main` / `(root)` → Save.
4. After a minute the site is at `https://<your-username>.github.io/babyloves-review/`. Send her that link.

Her progress saves automatically in the browser she uses. It stays on that device, and clearing the
browser's site data resets it.

## Add or update modules

Run the importer with **every** module PDF, because it rewrites `data/modules.json` from scratch:

```bash
node tools/import-pdfs.mjs "C:\Users\Nathan\Desktop\Module_1_Reviewer.pdf" "C:\Users\Nathan\Desktop\Module_2_Reviewer.pdf"
```

It prints each module's group sizes and warns about any group with fewer than 2 names. It needs Node and
Poppler (`winget install oschwartz10612.Poppler`). Then check nothing broke:

```bash
node --test tests/quiz.test.mjs
```

## How questions are built

- One question per item: the description is the question, the names in its set are the choices (shuffled).
- Groups of 5 or fewer names are one set. Bigger groups split in PDF order into sets of 4, using 5s for leftovers
  and 3s when needed: 6 → 3+3, 7 → 4+3, 8 → 4+4, 9 → 5+4, 11 → 4+4+3, 14 → 5+5+4.
- Italic intro lines and teacher's notes under a heading aren't questions.
