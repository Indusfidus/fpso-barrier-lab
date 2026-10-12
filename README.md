# FPSO Barrier Lab

An educational 3D process safety and risk tool for a generic West Africa deepwater FPSO.
Built by Frank Deezua Barilugbene (MSc Process Safety Engineering, University of Aberdeen).

> Educational tool. Not for design or operational decisions. Uses public data and the author's own MSc work only.
> No operator, contractor or employer data is used.

## Case study 1: Amine gas sweetening (gas treatment module)

- `data/case-gas-sweetening/` – component data, LOPA, fault tree, event tree, bowtie
- `engine/risk.js` – plain-formula risk engine (PFDavg, LOPA with independence check, fault and event trees)
- `scripts/verify.mjs` – recomputes and checks every number

```
node scripts/verify.mjs
```

## Licence

MIT. See `LICENSE`.
