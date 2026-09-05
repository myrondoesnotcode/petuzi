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
| `game.html` / `game.css` / `game.js` | Uzi's Tel Aviv Run |
| `assets/uzi-cut.png` | his cutout, used as the game sprite |

## The counter

GitHub Pages is static, so the shared total lives on [Abacus](https://abacus.jasoncameron.dev),
a free no-signup counter service.

- Namespace / key: `petuzi-84e398402ee5` / `pets`
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

## The game

`game.html` is a flappy-style run through Tel Aviv — Bauhaus blocks to dodge,
🐾 pets and 🦴 treats to collect, the Azrieli trio on the skyline. Everything
but Uzi himself is drawn on a canvas, and the sound effects are synthesised
with the Web Audio API, so the only asset it loads is `assets/uzi-cut.png`.

The cutout was lifted from the original photo with the macOS Vision framework
(`VNGenerateForegroundInstanceMaskRequest`), which is why the fur edges survive.

Game pets are deliberately *not* wired to the shared counter — a good run
would otherwise be worth a few hundred pets and the real total would stop
meaning anything.
