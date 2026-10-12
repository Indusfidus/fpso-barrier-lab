// Runs every FPSO LOPA scenario in naive and strict mode and checks the expected verdicts.
// Run: node scripts/verify-fpso.mjs
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { lopa, silBand } from "../engine/risk.js";

const load = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const proc = load("../data/fpso-process.json");
const data = load("../data/case-fpso/lopa-fpso.json");
const target = Object.fromEntries(proc.riskCriteria.bySeverity.map((s) => [s.severity, s.tolerablePerYear]));

const out = {};
for (const s of data.scenarios) {
  const tol = target[s.severity];
  out[s.id] = { title: s.title, severity: s.severity, tolerable: tol, cases: {} };
  for (const c of s.cases) {
    out[s.id].cases[c.id] = {
      label: c.label,
      naive: lopa(c, tol, { mode: "naive" }),
      strict: lopa(c, tol, { mode: "strict" }),
    };
  }
}

// Expected teaching outcomes
const v = (s, c, m) => out[s].cases[c][m];
assert.ok(!v("F1", "A", "strict").meets && v("F1", "B", "strict").meets, "F1");
assert.ok(v("F2", "A", "naive").meets && !v("F2", "A", "strict").meets && v("F2", "B", "strict").meets, "F2: naive hides the fast-response error");
assert.ok(v("F3", "A", "naive").meets && !v("F3", "A", "strict").meets && v("F3", "B", "strict").meets, "F3: naive hides the shared transmitter");
assert.ok(!v("F4", "A", "strict").meets && v("F4", "B", "strict").meets, "F4");
for (const s of Object.values(out)) for (const c of Object.values(s.cases))
  assert.ok(c.strict.mitigated >= c.naive.mitigated, "Strict can never be less conservative than naive");

writeFileSync(new URL("../data/case-fpso/results-fpso.json", import.meta.url), JSON.stringify(out, null, 2));
const e = (x) => x.toExponential(2);
for (const [id, s] of Object.entries(out)) for (const [cid, c] of Object.entries(s.cases))
  console.log(`${id}${cid} ${s.severity} tol ${e(s.tolerable)} | naive ${e(c.naive.mitigated)} ${c.naive.meets ? "PASS" : "FAIL"} | strict ${e(c.strict.mitigated)} ${c.strict.meets ? "PASS" : "FAIL"} x${c.strict.gapFactor.toPrecision(3)} | rejected: ${c.strict.rejected.map((r) => r.id + " (" + r.reasons.join("; ") + ")").join(", ") || "none"}`);
console.log("All FPSO checks passed.");
