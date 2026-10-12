// Builds docs/corrections.md from the verified results, so every number matches the engine.
import { readFileSync, writeFileSync } from "node:fs";
const r = JSON.parse(readFileSync(new URL("../data/case-gas-sweetening/results.json", import.meta.url)));
const lopaData = JSON.parse(readFileSync(new URL("../data/case-gas-sweetening/lopa-01.json", import.meta.url)));
const et = JSON.parse(readFileSync(new URL("../data/case-gas-sweetening/event-tree-absorber-leak.json", import.meta.url)));
const ft = JSON.parse(readFileSync(new URL("../data/case-gas-sweetening/fault-tree-regen-vce.json", import.meta.url)));

const sup = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
const sci = (x, d = 3) => {
  if (x == null) return "-";
  if (x >= 0.01 && x < 1000) return Number(x.toPrecision(3)).toString();
  const [m, e] = x.toExponential(d - 1).split("e");
  return `${m} × 10${String(Number(e)).split("").map((c) => sup[c]).join("")}`;
};

let md = `---
title: "Gas Sweetening Risk Assessment – Corrected Data"
subtitle: "Frank Deezua Barilugbene · Case study 1 for FPSO Barrier Lab · 12 October 2026"
---

# Summary

- Your submitted coursework stays as it is. This is a corrected working copy for the tool.
- 11 issues fixed across the safety data, LOPA, fault tree, event tree and bowtie.
- The LOPA verdict depends on two things: the initiating event and independence.
- With a realistic loss-of-cooling frequency, the scenario misses the target by ${r.lopa.C.strict.gapFactor.toFixed(1)} times.
- If the alarm and trip share one transmitter, it misses by ${r.lopa.D.strict.gapFactor.toFixed(0)} times.
- A dedicated transmitter and a SIL 2 trip bring it back within target.

Every number here is calculated by the tool's risk engine (\`engine/risk.js\`) and checked by \`scripts/verify.mjs\`. The engine reproduces your original LOPA result of 1.22 × 10⁻⁸ exactly.

Values marked ASSUMED are placeholders. Replace them with sourced values before you present them.

# 1. Safety data corrections

## Method change

- Coursework: PFD = 1 − e^(−λt), with t = 1 year. That is the chance of failure within a year.
- Corrected: PFDavg = λ × T ÷ 2, with proof test interval T = 1 year. This is the IEC 61508 simplified low-demand formula for one channel.
- The source rates are total failure rates. Treating them as dangerous undetected rates is conservative.
- PFDavg only applies to protective functions. For equipment, λ is a failure or leak frequency.

## Protective functions

| Item | λ (per year) | Coursework PFD | Correct 1 − e^(−λ) | Corrected PFDavg | Note |
|---|---|---|---|---|---|
`;
for (const c of r.components.filter((x) => x.type === "protective")) {
  const note = c.id === "GD" ? "Coursework 10× too low" : c.id === "PSV" ? "Use 0.01 in LOPA (CCPS)" : "";
  md += `| ${c.name} | ${sci(c.lambda)} | ${sci(c.courseworkPfd)} | ${sci(c.annualProbability)} | ${sci(c.pfdAvg)} | ${note} |\n`;
}
md += `
The vessel failure rate (2.63 × 10⁻² per year) covers all failure modes. It is far above typical rupture rates. Use it only as a conservative leak frequency.

# 2. LOPA-01: regenerator overpressure, toxic H2S release

Tolerable frequency: ${sci(lopaData.tolerableFrequency)} per year (your coursework target).

Note: UK HSE R2P2 uses 1 × 10⁻⁶ per year as the broadly acceptable level for individual risk. It is not a scenario frequency. Company scenario targets usually sit between 1 × 10⁻⁵ and 1 × 10⁻⁶ per year. Be ready to explain your choice.

| Case | Initiating event (per year) | Alarm | Trip | PSV | Mitigated (per year) | Meets target? | Factor vs target |
|---|---|---|---|---|---|---|---|
`;
for (const c of lopaData.cases) {
  const res = r.lopa[c.id].strict;
  const L = Object.fromEntries(c.layers.map((l) => [l.id, l]));
  const shared = c.id === "D" ? " (shared PT)" : "";
  md += `| ${c.id}. ${c.label} | ${sci(c.initiatingEvent.frequency)} | ${sci(L.ALM.pfd)}${shared} | ${sci(L.TRIP.pfd)}${shared} | ${sci(L.PSV.pfd)} | ${sci(res.mitigated)} | ${res.meets ? "Yes" : "No"} | ${res.meets ? `${res.margin.toFixed(0)}× margin` : `${Number(res.gapFactor.toFixed(1))}× over`} |\n`;
}
md += `
## What each case shows

- **A.** Your coursework as submitted, reproduced by the engine.
- **B.** The CCPS alarm credit (0.1), the corrected trip PFDavg (0.015) and the CCPS PSV credit (0.01). It still passes.
- **C.** Loss of cooling is more likely than total condenser failure. At 0.1 per year it fails by ${r.lopa.C.strict.gapFactor.toFixed(1)}×. One more non-SIL IPL with a PFD of 0.1 or better would close the gap.
- **D.** The alarm and trip read the same transmitter. If that transmitter fails, both layers fail together, so only one can be credited. It fails by ${r.lopa.D.strict.gapFactor.toFixed(0)}×.
- **E.** A dedicated transmitter for the trip, upgraded to SIL 2 (PFD 0.005), gives ${sci(r.lopa.E.strict.mitigated)} per year. It passes with a ${r.lopa.E.strict.margin.toFixed(0)}× margin.

## The independence trap

In case D, a spreadsheet that multiplies every layer gives ${sci(r.lopa.D.naive.mitigated)} per year. That looks like case C. The shared transmitter is invisible unless you check independence.

The engine handles it in three ways:

| Mode | Rule | Case D result (per year) |
|---|---|---|
| Strict (CCPS) | Credit only the best layer in a dependent group | ${sci(r.lopa.D.strict.mitigated)} |
| Beta factor, β = 10% | Group PFD = (1 − β) × product + β × min | ${sci(r.lopa.D.beta10.mitigated)} |
| Naive (wrong) | Multiply everything | ${sci(r.lopa.D.naive.mitigated)} |

Use strict mode for LOPA. The beta factor mode shows how partial dependence erodes credit.

## Coursework LOPA corrections

- IPL2 used the pressure transmitter failure rate. An alarm with operator response is normally credited at 0.1 at best.
- The notes say "level transmitter". The scenario is overpressure.
- IPL3 is labelled "High-High Level Trip" but uses the high pressure trip data.
- RRF was given as residual ÷ tolerable = 1.2 × 10⁻². That ratio is a safety margin, not an RRF. Correct statement: the mitigated frequency meets the target, so no SIF is needed.

# 3. Fault tree FT-01: ignited release, regeneration area

## Formula corrections

| Gate | Coursework formula | Coursework value | Correct formula | Correct value |
|---|---|---|---|---|
| P10 Leak, regeneration section | (P3+P4+P5) − P6×P7×P8 | ${sci(r.faultTree.coursework.P10)} | 1 − (1−P3)(1−P4)(1−P5) | ${sci(r.faultTree.correctedProbOnly.P10)} |
| P11 Ignition source | (P6+P7+P8) − P6×P7×P8 | ${sci(r.faultTree.coursework.P11)} | 1 − (1−P6)(1−P7)(1−P8) | ${sci(r.faultTree.correctedProbOnly.P11)} |
| P13 Top event | P11 × P12 | ${sci(r.faultTree.coursework.P13)} (no unit) | Release frequency × ignition probability | ${sci(r.faultTree.corrected.TOP.value)} per year |

The numbers move only a little. The method is what a panel would probe.

## Corrected tree, in frequency terms

| Node | Gate | Value |
|---|---|---|
| Leak, rich amine section (P1, P2) | OR, sum of frequencies | ${sci(r.faultTree.corrected.G9.value)} per year |
| Leak, regeneration section (P3, P4, P5) | OR, sum of frequencies | ${sci(r.faultTree.corrected.G10.value)} per year |
| Flammable gas release | OR, sum of frequencies | ${sci(r.faultTree.corrected.G12.value)} per year |
| Ignition source present (P6, P7, P8) | OR, probabilities | ${sci(r.faultTree.corrected.G11.value)} |
| Ignited release (top event) | AND | ${sci(r.faultTree.corrected.TOP.value)} per year |

## Open points

- P6 to P8 use equipment failure probabilities as ignition probabilities. That is a proxy. An ignition model based on release rate is better, for example the UKOOA/IP look-up.
- A VCE needs delayed ignition and congestion. This tree gives any ignited release. The event tree splits out the VCE share.

# 4. Event tree ET-01: sour gas leak from absorber C-4401

## Logic corrections

`;
for (const i of et.courseworkIssues) md += `- ${i}\n`;
md += `
## Corrected structure

Leak → gas detection → ESD isolation. If isolation fails: immediate ignition, then delayed ignition, then congestion.

| Branch | Probability | Basis |
|---|---|---|
`;
for (const b of et.branches) md += `| ${b.label} | ${b.failProbability != null ? `${sci(b.failProbability)} (fails)` : sci(b.probability)} | ${b.basis} |\n`;
md += `
Probability that isolation fails: coursework ${sci(r.eventTree.courseworkIsolationFail)}, corrected ${sci(r.eventTree.pIsolationFail)}. The corrected value is about ${(r.eventTree.pIsolationFail / r.eventTree.courseworkIsolationFail).toFixed(1)}× higher, mostly because of the gas detection fix.

| Outcome | Frequency (per year) | Return period (years) |
|---|---|---|
`;
for (const o of et.outcomes) {
  const f = r.eventTree.outcomes[o.id];
  md += `| ${o.label} | ${sci(f)} | ${Math.round(1 / f).toLocaleString("en-GB")} |\n`;
}
md += `
The outcomes add up to the initiating frequency (${sci(r.eventTree.checkSum)} per year), as they must.

The toxic H2S cloud is the most frequent serious outcome. Your coursework had no toxic branch at all.

# 5. Bowtie BT-01: loss of containment from regenerator C-4402

## Barrier classification

| Barrier | Coursework label | Correct type |
|---|---|---|
| Alarm systems | Passive | Active, human (alarm with operator response) |
| Manual shutdown procedures | Passive | Procedural. Supports barriers but is not a barrier on its own |
| Muster points and evacuation | Passive | Mitigation, emergency response |
| Design pressure of vessel | Passive | Passive hardware ✓ |
| Drains | Passive | Passive hardware ✓ |
| PSVs, PSHH, ESD | Active | Active hardware ✓ |

## Other changes

- **Top event:** "Loss of containment from C-4402" replaces "Rupture". Leaks are far more likely than rupture.
- **Threat 1:** "Loss of reflux cooling" replaces "Overpressure of reflux condenser". Overpressure is the result, not the cause.
- **BLEVE removed.** The regenerator runs at low pressure with aqueous amine. Keep it only with a written justification.
- **Barrier owners added.** Every barrier now has an owner role.
- **Escalation factors now carry controls,** for example the inspection backlog tracked as an API 754 Tier 4 indicator.

# 6. Files delivered for the tool

| File | Content |
|---|---|
| data/case-gas-sweetening/components.json | 21 components with λ, coursework PFD, source and flags |
| data/case-gas-sweetening/lopa-01.json | 5 LOPA cases with sensor tags for the independence check |
| data/case-gas-sweetening/fault-tree-regen-vce.json | Corrected fault tree, frequency and probability typed |
| data/case-gas-sweetening/event-tree-absorber-leak.json | Corrected leak event tree with toxic branch |
| data/case-gas-sweetening/bowtie-regenerator.json | Bowtie with typed barriers, owners and escalation controls |
| engine/risk.js | Risk engine: PFDavg, LOPA (strict, beta, naive), fault tree, event tree |
| scripts/verify.mjs | Recomputes and checks every number |

# 7. What you should check before the interview

- Confirm the ASSUMED values: immediate ignition 0.10, delayed ignition 0.30, congestion 0.50.
- Work case D by hand once: 0.1 × 0.015 × 0.01 = 1.5 × 10⁻⁵.
- Be ready to explain why the alarm is credited at 0.1 and not 0.058.
- Be ready to explain why PFDavg is λT/2.
`;
writeFileSync(new URL("../docs/corrections.md", import.meta.url), md);
console.log("written", md.length);
