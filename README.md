# Pet Uzi

A single-page pet counter for Uzi. Press the button, the number goes up, Uzi gets petted.

## What's here

| File | |
|---|---|
| `index.html` | the whole page |
| `styles.css` | the whole look |
| `script.js` | counter + video wiring |
| `assets/uzi.jpg` | the good boy |
| `assets/petting-uzi.mp4` | plays on every press |

## The counter

GitHub Pages is static, so the shared total lives on [Abacus](https://abacus.jasoncameron.dev),
a free no-signup counter service.

- Namespace / key: `petuzi-b0ba0ed54db4` / `pets`
- The `738` starting figure is a display offset (`BASELINE` in `script.js`),
  not a stored value — Abacus can only count up from zero.

The namespace is random on purpose: Abacus keys are public and unauthenticated,
so a guessable name can be inflated by anyone.

Abacus has retired its admin endpoints (`/set`, `/reset` now redirect to the docs),
so the running total can't be edited in place. To start over, point `COUNTER` in
`script.js` at a brand-new key — a key that has never been hit reads as zero:

```
curl https://abacus.jasoncameron.dev/create/petuzi-<new-random>/pets
```

If Abacus is ever unreachable the button still works — it quietly falls back to a
per-browser count and the label changes to say so.

## Running it locally

```
python3 -m http.server 8000
```

Then open http://localhost:8000
