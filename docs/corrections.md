---
title: "Gas Sweetening Risk Assessment – Corrected Data"
subtitle: "Frank Deezua Barilugbene · Case study 1 for FPSO Barrier Lab · 12 October 2026"
---

# Summary

- Your submitted coursework stays as it is. This is a corrected working copy for the tool.
- 11 issues fixed across the safety data, LOPA, fault tree, event tree and bowtie.
- The LOPA verdict depends on two things: the initiating event and independence.
- With a realistic loss-of-cooling frequency, the scenario misses the target by 1.5 times.
- If the alarm and trip share one transmitter, it misses by 15 times.
- A dedicated transmitter and a SIL 2 trip bring it back within target.

Every number here is calculated by the tool's risk engine (`engine/risk.js`) and checked by `scripts/verify.mjs`. The engine reproduces your original LOPA result of 1.22 × 10⁻⁸ exactly.

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
| Gas detection system | 0.0322 | 3.17 × 10⁻³ | 0.0317 | 0.0161 | Coursework 10× too low |
| Emergency shutdown system | 3.16 × 10⁻³ | 3.15 × 10⁻³ | 3.16 × 10⁻³ | 1.58 × 10⁻³ |  |
| Flare stack | 0.01 | 9.95 × 10⁻³ | 9.95 × 10⁻³ | 5.00 × 10⁻³ |  |
| Pressure safety valve | 2.36 × 10⁻³ | 2.36 × 10⁻³ | 2.36 × 10⁻³ | 1.18 × 10⁻³ | Use 0.01 in LOPA (CCPS) |
| High pressure trip (PSHH) | 0.03 | 0.0296 | 0.0296 | 0.015 |  |
| Pressure transmitter | 0.06 | 0.0582 | 0.0582 | 0.03 |  |

The vessel failure rate (2.63 × 10⁻² per year) covers all failure modes. It is far above typical rupture rates. Use it only as a conservative leak frequency.

# 2. LOPA-01: regenerator overpressure, toxic H2S release

Tolerable frequency: 1.00 × 10⁻⁶ per year (your coursework target).

Note: UK HSE R2P2 uses 1 × 10⁻⁶ per year as the broadly acceptable level for individual risk. It is not a scenario frequency. Company scenario targets usually sit between 1 × 10⁻⁵ and 1 × 10⁻⁶ per year. Be ready to explain your choice.

| Case | Initiating event (per year) | Alarm | Trip | PSV | Mitigated (per year) | Meets target? | Factor vs target |
|---|---|---|---|---|---|---|---|
| A. Coursework as submitted | 3.00 × 10⁻³ | 0.0582 | 0.0296 | 2.36 × 10⁻³ | 1.22 × 10⁻⁸ | Yes | 82× margin |
| B. Corrected credits, same initiating event | 3.00 × 10⁻³ | 0.1 | 0.015 | 0.01 | 4.50 × 10⁻⁸ | Yes | 22× margin |
| C. Realistic initiating event: loss of cooling | 0.1 | 0.1 | 0.015 | 0.01 | 1.50 × 10⁻⁶ | No | 1.5× over |
| D. Alarm and trip share one transmitter | 0.1 | 0.1 (shared PT) | 0.015 (shared PT) | 0.01 | 1.50 × 10⁻⁵ | No | 15× over |
| E. Fix: separate transmitter and SIL 2 trip | 0.1 | 0.1 | 5.00 × 10⁻³ | 0.01 | 5.00 × 10⁻⁷ | Yes | 2× margin |

## What each case shows

- **A.** Your coursework as submitted, reproduced by the engine.
- **B.** The CCPS alarm credit (0.1), the corrected trip PFDavg (0.015) and the CCPS PSV credit (0.01). It still passes.
- **C.** Loss of cooling is more likely than total condenser failure. At 0.1 per year it fails by 1.5×. One more non-SIL IPL with a PFD of 0.1 or better would close the gap.
- **D.** The alarm and trip read the same transmitter. If that transmitter fails, both layers fail together, so only one can be credited. It fails by 15×.
- **E.** A dedicated transmitter for the trip, upgraded to SIL 2 (PFD 0.005), gives 5.00 × 10⁻⁷ per year. It passes with a 2× margin.

## The independence trap

In case D, a spreadsheet that multiplies every layer gives 1.50 × 10⁻⁶ per year. That looks like case C. The shared transmitter is invisible unless you check independence.

The engine handles it in three ways:

| Mode | Rule | Case D result (per year) |
|---|---|---|
| Strict (CCPS) | Credit only the best layer in a dependent group | 1.50 × 10⁻⁵ |
| Beta factor, β = 10% | Group PFD = (1 − β) × product + β × min | 2.85 × 10⁻⁶ |
| Naive (wrong) | Multiply everything | 1.50 × 10⁻⁶ |

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
| P10 Leak, regeneration section | (P3+P4+P5) − P6×P7×P8 | 0.0487 | 1 − (1−P3)(1−P4)(1−P5) | 0.0481 |
| P11 Ignition source | (P6+P7+P8) − P6×P7×P8 | 0.125 | 1 − (1−P6)(1−P7)(1−P8) | 0.12 |
| P13 Top event | P11 × P12 | 0.0141 (no unit) | Release frequency × ignition probability | 0.0143 per year |

The numbers move only a little. The method is what a panel would probe.

## Corrected tree, in frequency terms

| Node | Gate | Value |
|---|---|---|
| Leak, rich amine section (P1, P2) | OR, sum of frequencies | 0.07 per year |
| Leak, regeneration section (P3, P4, P5) | OR, sum of frequencies | 0.0493 per year |
| Flammable gas release | OR, sum of frequencies | 0.119 per year |
| Ignition source present (P6, P7, P8) | OR, probabilities | 0.12 |
| Ignited release (top event) | AND | 0.0143 per year |

## Open points

- P6 to P8 use equipment failure probabilities as ignition probabilities. That is a proxy. An ignition model based on release rate is better, for example the UKOOA/IP look-up.
- A VCE needs delayed ignition and congestion. This tree gives any ignited release. The event tree splits out the VCE share.

# 4. Event tree ET-01: sour gas leak from absorber C-4401

## Logic corrections

- Gas detection PFD 0.00317 was 10x too low. Corrected PFDavg = 0.0322/2 = 0.0161.
- The 'No ignition' branch (0.70) led to a vapour cloud explosion. No ignition cannot give an explosion. A VCE needs delayed ignition in a congested area.
- PSV and flare branches belong to an overpressure tree. A PSV does not stop a leak. For a leak the sequence is detect, isolate, then ignition.
- 'Loss of containment' was listed as an outcome. It is the initiating event. Outcomes are jet fire, flash fire, VCE, toxic cloud or safe dispersal.
- No toxic outcome despite sour gas containing H2S.

## Corrected structure

Leak → gas detection → ESD isolation. If isolation fails: immediate ignition, then delayed ignition, then congestion.

| Branch | Probability | Basis |
|---|---|---|
| Gas detection works | 0.0161 (fails) | PFDavg = 3.22e-2 x 1 yr / 2 |
| ESD isolation works | 1.58 × 10⁻³ (fails) | PFDavg = 3.16e-3 x 1 yr / 2 |
| Immediate ignition | 0.1 | ASSUMED. Replace with release-rate based value. |
| Delayed ignition (given no immediate) | 0.3 | Coursework ignition value (0.30) reused for delayed ignition. ASSUMED. |
| Cloud reaches congested area | 0.5 | ASSUMED. Depends on module layout. |

Probability that isolation fails: coursework 6.31 × 10⁻³, corrected 0.0177. The corrected value is about 2.8× higher, mostly because of the gas detection fix.

| Outcome | Frequency (per year) | Return period (years) |
|---|---|---|
| Detected and isolated: limited release | 0.0258 | 39 |
| Jet fire | 4.64 × 10⁻⁵ | 21,537 |
| Vapour cloud explosion | 6.27 × 10⁻⁵ | 15,953 |
| Flash fire | 6.27 × 10⁻⁵ | 15,953 |
| Toxic H2S cloud | 2.93 × 10⁻⁴ | 3,419 |

The outcomes add up to the initiating frequency (0.0263 per year), as they must.

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
