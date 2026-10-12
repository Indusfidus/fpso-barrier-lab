// Recomputes every number in the gas sweetening case and checks it.
// Run: node scripts/verify.mjs
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { annualProbability, pfdAvg, lopa, evaluateFaultTree, evaluateLeakEventTree, orProbability } from "../engine/risk.js";

const dir = new URL("../data/case-gas-sweetening/", import.meta.url);
const load = (f) => JSON.parse(readFileSync(new URL(f, dir)));
const comps = load("components.json");
const lopaData = load("lopa-01.json");
const ft = load("fault-tree-regen-vce.json");
const et = load("event-tree-absorber-leak.json");

const close = (a, b, rel = 0.01) => Math.abs(a - b) <= rel * Math.abs(b);
const results = { components: [], lopa: {}, faultTree: {}, eventTree: {} };

// 1. Components
for (const c of comps.components) {
  const ap = annualProbability(c.lambda);
  const row = { id: c.id, name: c.name, type: c.type, lambda: c.lambda, courseworkPfd: c.courseworkPfd, annualProbability: ap,
    pfdAvg: c.type === "protective" ? pfdAvg(c.lambda) : null };
  if (c.courseworkPfd != null) row.courseworkMatches = close(ap, c.courseworkPfd, 0.02);
  results.components.push(row);
}
const gd = results.components.find((r) => r.id === "GD");
assert.equal(gd.courseworkMatches, false, "Gas detection error should be detected");
const mismatches = results.components.filter((r) => r.courseworkMatches === false).map((r) => r.id);

// 2. LOPA
for (const c of lopaData.cases) {
  const strict = lopa(c, lopaData.tolerableFrequency, { mode: "strict" });
  const naive = lopa(c, lopaData.tolerableFrequency, { mode: "naive" });
  const beta = lopa(c, lopaData.tolerableFrequency, { mode: "beta", beta: 0.1 });
  results.lopa[c.id] = { label: c.label, ie: c.initiatingEvent.frequency, strict, naive, beta10: beta };
}
assert.ok(close(results.lopa.A.strict.mitigated, 1.2196e-8, 0.001), "Case A must reproduce coursework 1.2196e-8");
assert.ok(results.lopa.B.strict.meets);
assert.ok(!results.lopa.C.strict.meets);
assert.ok(!results.lopa.D.strict.meets);
assert.ok(results.lopa.E.strict.meets);
assert.ok(close(results.lopa.D.naive.mitigated, results.lopa.C.strict.mitigated, 1e-9), "Naive D equals C: the shared sensor error is invisible without the independence check");

// 3. Fault tree: corrected vs coursework formulas
const ftv = evaluateFaultTree(ft.nodes);
const p = Object.fromEntries(ft.nodes.filter((n) => n.basic).map((n) => [n.id, comps.components.find((c) => c.id === n.component)]));
const cwP = { P1: 0.0488, P2: 0.0198, P3: 0.026, P4: 0.0198, P5: 0.002995, P6: 0.0392, P7: 0.0429, P8: 0.0429 };
const coursework = {
  P9: cwP.P1 + cwP.P2 - cwP.P1 * cwP.P2,
  P10: cwP.P3 + cwP.P4 + cwP.P5 - cwP.P6 * cwP.P7 * cwP.P8,
  P11: cwP.P6 + cwP.P7 + cwP.P8 - cwP.P6 * cwP.P7 * cwP.P8,
};
coursework.P12 = coursework.P9 + coursework.P10 - coursework.P9 * coursework.P10;
coursework.P13 = coursework.P11 * coursework.P12;
const correctedProbOnly = {
  P10: orProbability([cwP.P3, cwP.P4, cwP.P5]),
  P11: orProbability([cwP.P6, cwP.P7, cwP.P8]),
};
assert.ok(close(coursework.P13, 1.413e-2, 0.01), "Coursework top event reproduced");
results.faultTree = { coursework, correctedProbOnly, corrected: Object.fromEntries(Object.entries(ftv).map(([k, v]) => [k, v])) };

// 4. Event tree
const etv = evaluateLeakEventTree(et);
assert.ok(close(etv.checkSum, etv.initiating, 1e-9), "Event tree outcomes must sum to the initiating frequency");
const cwEt = { pIsolationFail: orProbability([0.00317, 0.00315]) };
results.eventTree = { ...etv, courseworkIsolationFail: cwEt.pIsolationFail };

results.mismatches = mismatches;
writeFileSync(new URL("../data/case-gas-sweetening/results.json", import.meta.url), JSON.stringify(results, null, 2));

const s = (x) => (x == null ? "-" : x.toExponential(2));
console.log("Component PFD mismatches vs coursework:", mismatches.join(", ") || "none");
for (const [id, r] of Object.entries(results.lopa))
  console.log(`LOPA ${id} ${r.label}: strict ${s(r.strict.mitigated)} meets=${r.strict.meets} gap=${r.strict.gapFactor.toFixed(2)} SIL=${r.strict.requiredSil} | naive ${s(r.naive.mitigated)} | beta10 ${s(r.beta10.mitigated)}`);
console.log("FT coursework P10,P11,P13:", s(coursework.P10), s(coursework.P11), s(coursework.P13));
console.log("FT corrected prob-only P10,P11:", s(correctedProbOnly.P10), s(correctedProbOnly.P11));
console.log("FT corrected (freq):", Object.entries(ftv).filter(([k]) => k.startsWith("G") || k === "TOP").map(([k, v]) => `${k}=${s(v.value)} ${v.kind}`).join(" | "));
console.log("ET isolation fail coursework vs corrected:", s(cwEt.pIsolationFail), s(etv.pIsolationFail));
console.log("ET outcomes /yr:", Object.entries(etv.outcomes).map(([k, v]) => `${k}=${s(v)}`).join(" "), "sum", s(etv.checkSum));
console.log("All checks passed.");
