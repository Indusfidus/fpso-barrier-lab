// Builds docs/fpso-scenario.md from the FPSO data and verified LOPA results.
import { readFileSync, writeFileSync } from "node:fs";
const load = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const P = load("../data/fpso-process.json");
const L = load("../data/case-fpso/lopa-fpso.json");
const R = load("../data/case-fpso/results-fpso.json");

const sup = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
const sci = (x) => {
  if (x == null) return "-";
  if (x >= 1000 && x < 1e6) return Math.round(x).toLocaleString("en-GB");
  if (x >= 0.01 && x < 1000) return String(Number(x.toPrecision(3)));
  const [m, e] = x.toExponential(1).split("e");
  return `${m.replace(/\.0$/, "")} × 10${String(Number(e)).split("").map((c) => sup[c]).join("")}`;
};
const verdict = (r) => (r.meets ? `Pass (${Number((1 / r.gapFactor).toPrecision(2))}× margin)` : `Fail (${Number(r.gapFactor.toPrecision(3)).toLocaleString("en-GB")}× over)`);
const B = P.basisOfDesign;

let md = `---
title: "Generic FPSO Process Safety Case"
subtitle: "Oil production with gas reinjection · Learning case for FPSO Barrier Lab · Frank Deezua Barilugbene · 12 October 2026"
---

# Summary

- A typical deepwater FPSO: oil goes to the cargo tanks, gas is dried and reinjected, and seawater is injected.
- Capacities match a public Erha-class FPSO. All operating conditions are typical values for learning.
- Your gas sweetening plant maps onto the FPSO's TEG dehydration unit, item for item.
- Four LOPA scenarios cover the classic FPSO hazards. In two of them, a simple LOPA that multiplies every layer passes, but the independence checks show it fails.
- Every LOPA number is calculated by the tool's engine and checked by \`scripts/verify-fpso.mjs\`.

> Educational case. Not a representation of any operator's facility.

# 1. Basis of design

| Item | Value |
|---|---|
| Oil processing | ${B.oilBpd.toLocaleString("en-GB")} bbl/d |
| Gas reinjection | ${B.gasReinjectionMmscfd} MMscf/d |
| Water injection | ${B.waterInjectionBpd.toLocaleString("en-GB")} bbl/d |
| Crude storage | ${(B.storageBbl / 1e6).toFixed(1)} million bbl |
| Hull | ${B.hullLengthM} m × ${B.hullBreadthM} m, ${B.mooring.toLowerCase()} |
| Water depth | ${B.waterDepthM.toLocaleString("en-GB")} m |
| People on board | ${B.pob} |
| Gas-oil ratio | About ${B.fluid.gorScfPerBbl.toLocaleString("en-GB")} scf/bbl (derived) |
| H2S / CO2 | ${B.fluid.h2sPpmv} ppmv / ${B.fluid.co2MolPct} mol% (ASSUMED, slightly sour) |
| Riser arrival | ${B.fluid.arrivalPressureBarg} barg, ${B.fluid.arrivalTempC} °C (ASSUMED) |

# 2. Process overview

![Generic FPSO block flow diagram](fpso-pfd.png){ width=100% }

- **Oil:** HP separator, crude heater, LP separator, electrostatic coalescer, crude cooler, cargo tanks, offloading.
- **Gas:** LP and HP compression, TEG dehydration, then reinjection at 350 barg. Fuel gas is taken off after drying.
- **Water:** produced water is cleaned and discharged overboard. Treated seawater is injected at 250 barg.
- **Heat:** gas turbine exhaust heats hot oil, which serves the crude heater and the TEG reboiler.
- **Flare:** HP and LP flares receive relief and blowdown from every system. Flare gas recovery keeps routine flaring at zero.

# 3. Key equipment and operating conditions

| System | Tag | Equipment | Operating conditions (ASSUMED) |
|---|---|---|---|
`;
for (const s of P.systems) for (const e of s.equipment)
  md += `| ${s.name} | ${e.tag} | ${e.name} | ${[e.op, e.design ? `design ${e.design}` : null].filter(Boolean).join(", ") || "-"} |\n`;

md += `
# 4. How your gas sweetening case maps onto the FPSO

TEG dehydration uses the same kit as amine sweetening: a high-pressure contactor, then a low-pressure regeneration loop. Your What-if, LOPA and bowtie carry over almost unchanged.

| Your coursework item | FPSO equivalent | What changes |
|---|---|---|
`;
const teg = P.systems.find((s) => s.id === "TEG");
const changes = {
  "C-2401": "Removes water, not H2S/CO2",
  "C-2402": "Runs near atmospheric. TEG degrades above about 204 °C",
  "E-2406": "Heated by hot oil from turbine exhaust",
  "V-2406": "Vent gas carries BTEX. Benzene exposure risk",
  "P-2405A/B": "Pump lean TEG up to 70 barg",
};
for (const e of teg.equipment) if (e.coursework) md += `| ${e.coursework} | ${e.tag} ${e.name} | ${changes[e.tag] || "Same role"} |\n`;
md += `| Inlet gas hot oil heater E-4402 | Hot oil system (H-4101, E-2001) | Your hot oil HAZOP applies directly |\n`;

md += `
# 5. Deck layout (stern to bow)

| Zone (m from stern) | System |
|---|---|
`;
for (const s of [...P.systems].sort((a, b) => a.deckZone[0] - b.deckZone[0])) md += `| ${s.deckZone[0]} to ${s.deckZone[1]} | ${s.name} |\n`;
md += `
The accommodation sits at the stern, the flare at the bow. Process modules sit between them, so the hazard rises as you move away from where people live. Risers hang off the port side balcony, and the cargo tanks run below deck for most of the hull.

# 6. Major hazards by system

| System | Major hazards |
|---|---|
`;
for (const s of P.systems) md += `| ${s.name} | ${s.majorHazards.join(". ")} |\n`;

md += `
# 7. Risk criteria (example)

| Severity | Description | Tolerable frequency (per year) |
|---|---|---|
`;
for (const c of P.riskCriteria.bySeverity) md += `| ${c.severity} | ${c.description} | ${sci(c.tolerablePerYear)} |\n`;
md += `
These are example targets for learning. Each company sets its own.

# 8. LOPA scenarios

Each scenario is calculated in two ways:

- **Naive:** multiplies every layer someone claimed.
- **Strict:** applies three CCPS-style checks:
    - a layer cannot share a sensor with the initiating event
    - a human layer needs at least 10 minutes to respond
    - a relief valve must be sized for the scenario

    Layers that share a sensor with each other count as one layer.

| Scenario | Severity | Case | Naive result (per year) | Strict result (per year) | Strict verdict |
|---|---|---|---|---|---|
`;
for (const s of L.scenarios) for (const c of s.cases) {
  const r = R[s.id].cases[c.id];
  md += `| ${s.id} ${s.title} | ${s.severity} | ${c.label} | ${sci(r.naive.mitigated)} | ${sci(r.strict.mitigated)} | ${verdict(r.strict)} |\n`;
}

const lessons = {
  F1: [
    "The low level alarm comes from the same transmitter as the control loop that failed. It cannot protect against its own failure.",
    "A PSV sized only for fire cannot be credited for gas blowby. Blowby needs a much larger relief rate.",
    "The fix needs an independent transmitter, a SIL 2 trip and a resized PSV.",
  ],
  F2: [
    "Discharge pressure reaches the relief set point in about a minute. An operator cannot respond in time, so the alarm earns no credit.",
    "Naive LOPA passes. Strict LOPA fails by 5×.",
    "The fix is a SIL 3 high-integrity trip with 2oo3 voting, plus the PSV. Keep the alarm as an aid.",
  ],
  F3: [
    "Your coursework scenario on the FPSO. It is the same mechanism, but the consequence is a fire, not toxic H2S, so the target is 1 × 10⁻⁵.",
    "The alarm and trip share PT-1. Naive LOPA passes, but strict LOPA fails by 1.5×.",
    "The fix is cheap: a dedicated transmitter for the trip.",
  ],
  F4: [
    "The high level alarm uses the same radar gauge that failed. At Buncefield the gauge stuck and the independent switch was inoperable.",
    "The high-high alarm and the trip share switch LS-2, so only one counts.",
    "The fix needs an independent switch, a SIL 2 trip and a passive overflow line to the slop tank.",
  ],
};

for (const s of L.scenarios) {
  md += `\n## ${s.id}. ${s.title}\n\n- **Cause:** ${s.cause}\n- **Consequence:** ${s.consequence}\n- **Severity:** ${s.severity}. Target ${sci(R[s.id].tolerable)} per year.\n\n`;
  for (const c of s.cases) {
    const r = R[s.id].cases[c.id];
    md += `**${c.label}.** Initiating event: ${c.initiatingEvent.description}, ${sci(c.initiatingEvent.frequency)} per year${c.initiatingEvent.sensor ? ` (sensor ${c.initiatingEvent.sensor})` : ""}.\n\n| Layer | PFD | Sensor | Strict check |\n|---|---|---|---|\n`;
    for (const l of c.layers) {
      const rej = r.strict.rejected.find((x) => x.id === l.id);
      const grp = r.strict.groups.find((g) => g.dependent && g.layers.includes(l.id));
      const check = !l.credited ? "Not claimed" : rej ? `Rejected: ${rej.reasons.join("; ")}` : grp ? `Shares a sensor with ${grp.layers.filter((x) => x !== l.id).join(", ")}. Counted once` : "Valid";
      md += `| ${l.name} | ${sci(l.pfd)} | ${l.sensor || "-"} | ${check} |\n`;
    }
    md += `\nNaive: ${sci(r.naive.mitigated)} per year. Strict: ${sci(r.strict.mitigated)} per year, ${verdict(r.strict).toLowerCase()}.\n\n`;
  }
  md += `What this teaches:\n\n${lessons[s.id].map((x) => `- ${x}`).join("\n")}\n`;
}

md += `
# 9. Personnel safety tasks

These tasks cover the HSE advisory side of the role.

| Task | Permit | Key controls |
|---|---|---|
`;
for (const t of P.personnelSafetyTasks) md += `| ${t.task} | ${t.permit} | ${t.key.join(". ")} |\n`;

md += `
# 10. Assumptions to check

- Operating pressures and temperatures are typical values. They are not from any real facility.
- H2S at 50 ppmv is assumed so the H2S lessons still apply.
- The initiating event frequencies for F2 and F4 are ASSUMED generic values.
- The example risk criteria are for learning. Know why you'd use them.

# 11. Next steps

1. Review this case and change anything you disagree with.
2. Build the 3D FPSO. Each system is a clickable module that opens its hazards and LOPA.
3. Add the independence toggle. Re-assign a sensor and watch the verdict flip.
4. Add case studies: Buncefield on the cargo tanks, Piper Alpha on permits, Cidade de São Mateus on a pump room leak.
`;
writeFileSync(new URL("../docs/fpso-scenario.md", import.meta.url), md);
console.log("written", md.length);
