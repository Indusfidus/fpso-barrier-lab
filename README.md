# FPSO Barrier Lab

Live tool: https://indusfidus.github.io/fpso-barrier-lab/

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

## Generic FPSO case (oil production with gas reinjection)

- `data/fpso-process.json` – basis of design, systems, equipment, deck zones, hazards, risk criteria, personnel safety tasks
- `data/case-fpso/lopa-fpso.json` – four LOPA scenarios (separator blowby, reinjection compressor, TEG regenerator, cargo tank overfill)
- `docs/presenter-guide.md` – reasoning behind every scenario, demo script and Q&A
- `docs/fpso-scenario.md` and `docs/fpso-pfd.svg` – scenario write-up and block flow diagram
- `node scripts/verify-fpso.mjs` – naive vs strict LOPA with independence checks

## The 3D tool

- `index.html` and `app/` – Three.js model of the FPSO and the LOPA lab. No build step.
- Click a module to see its equipment, hazards, permit tasks and barrier scenarios.
- In a scenario, change a sensor, PFD, response time or relief sizing and watch the verdict move.

Run it locally: `python3 -m http.server` in this folder, then open http://localhost:8000.
