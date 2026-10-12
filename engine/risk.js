// FPSO Barrier Lab - risk engine
// Plain formulas only. Every result can be checked by hand.

export const annualProbability = (lambda, tYears = 1) => 1 - Math.exp(-lambda * tYears);

// Simplified IEC 61508 low-demand PFDavg for a single channel (1oo1).
export const pfdAvg = (lambdaDU, proofTestYears = 1) => (lambdaDU * proofTestYears) / 2;

// OR gate for probabilities (exact for independent events).
export const orProbability = (ps) => 1 - ps.reduce((acc, p) => acc * (1 - p), 1);

// OR gate for frequencies (rare-event approximation: sum).
export const orFrequency = (fs) => fs.reduce((a, f) => a + f, 0);

export const andProbability = (ps) => ps.reduce((a, p) => a * p, 1);

export const silBand = (pfd) => {
  if (pfd >= 0.1) return "No SIL (PFD >= 0.1)";
  if (pfd >= 1e-2) return "SIL 1";
  if (pfd >= 1e-3) return "SIL 2";
  if (pfd >= 1e-4) return "SIL 3";
  if (pfd >= 1e-5) return "SIL 4";
  return "Beyond SIL 4";
};

// Group credited layers that share a sensor. Layers with sensor null are their own group.
const groupBySensor = (layers) => {
  const groups = new Map();
  layers.forEach((l, i) => {
    const key = l.sensor ? `sensor:${l.sensor}` : `solo:${i}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(l);
  });
  return [...groups.values()];
};

// LOPA. mode: "strict" (CCPS: credit only best layer in a dependent group)
//             "beta"   (group PFD = (1 - beta) x product + beta x min)
//             "naive"  (multiply everything, ignores dependence - shows the error)
export function lopa({ initiatingEvent, enablingProbability = 1, layers }, tolerable, { mode = "strict", beta = 0.1 } = {}) {
  const credited = layers.filter((l) => l.credited);
  const groups = groupBySensor(credited);
  const groupResults = groups.map((g) => {
    const pfds = g.map((l) => l.pfd);
    let pfd;
    if (g.length === 1 || mode === "naive") pfd = andProbability(pfds);
    else if (mode === "beta") pfd = (1 - beta) * andProbability(pfds) + beta * Math.min(...pfds);
    else pfd = Math.min(...pfds);
    return { layers: g.map((l) => l.id), dependent: g.length > 1, pfd };
  });
  const totalPfd = andProbability(groupResults.map((g) => g.pfd));
  const unmitigated = initiatingEvent.frequency * enablingProbability;
  const mitigated = unmitigated * totalPfd;
  const meets = mitigated <= tolerable;
  const gapFactor = mitigated / tolerable;           // > 1 means more risk reduction needed
  const requiredExtraPfd = meets ? null : tolerable / mitigated;
  return {
    unmitigated, mitigated, tolerable, meets, gapFactor,
    margin: meets ? tolerable / mitigated : null,
    requiredExtraPfd,
    requiredSil: requiredExtraPfd ? silBand(requiredExtraPfd) : "None - target met",
    groups: groupResults,
  };
}

// Fault tree evaluator. Nodes reference children by id.
export function evaluateFaultTree(nodes) {
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const memo = {};
  const val = (id) => {
    if (memo[id]) return memo[id];
    const n = byId[id];
    let out;
    if (n.basic) out = { value: n.value, kind: n.kind };
    else {
      const kids = n.children.map(val);
      if (n.gate === "OR") {
        const kind = kids[0].kind;
        if (kids.some((k) => k.kind !== kind)) throw new Error(`OR gate ${id} mixes frequency and probability`);
        out = { value: kind === "frequency" ? orFrequency(kids.map((k) => k.value)) : orProbability(kids.map((k) => k.value)), kind };
      } else {
        const freqs = kids.filter((k) => k.kind === "frequency");
        if (freqs.length > 1) throw new Error(`AND gate ${id} multiplies two frequencies`);
        out = { value: andProbability(kids.map((k) => k.value)), kind: freqs.length ? "frequency" : "probability" };
      }
    }
    memo[id] = out;
    return out;
  };
  nodes.forEach((n) => val(n.id));
  return memo;
}

// Event tree for a leak: detect -> isolate -> ignition outcomes.
export function evaluateLeakEventTree(et) {
  const b = Object.fromEntries(et.branches.map((x) => [x.id, x]));
  const f0 = et.initiatingEvent.frequency;
  const pIsoFail = orProbability([b.GD.failProbability, b.ESD.failProbability]);
  const fIso = f0 * (1 - pIsoFail);
  const fUn = f0 * pIsoFail;
  const pImm = b.IMM.probability, pDel = b.DEL.probability, pCng = b.CNG.probability;
  const out = {
    O1: fIso,
    O2: fUn * pImm,
    O3: fUn * (1 - pImm) * pDel * pCng,
    O4: fUn * (1 - pImm) * pDel * (1 - pCng),
    O5: fUn * (1 - pImm) * (1 - pDel),
  };
  const sum = Object.values(out).reduce((a, v) => a + v, 0);
  return { pIsolationFail: pIsoFail, unisolated: fUn, outcomes: out, checkSum: sum, initiating: f0 };
}
