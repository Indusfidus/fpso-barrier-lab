---
title: "FPSO Barrier Lab – Presenter's Guide"
subtitle: "The reasoning behind every scenario, and how to explain it · Frank Deezua Barilugbene · 12 October 2026"
---

# How to use this guide

- Part 1 gives you the four ideas the whole tool rests on. Learn these first.
- Part 2 walks through each scenario, case by case: the plant, the cause, each layer, the sums, the fix, and a short script.
- Part 3 is a 3-minute live demo.
- Part 4 lists the questions an audience is likely to ask, with answers.

Live tool: https://indusfidus.github.io/fpso-barrier-lab/

# Part 1. The four ideas behind the tool

## Idea 1. What LOPA does

LOPA asks one question: how often will this accident happen, given the protection we have?

It starts with how often the cause happens. That is the **initiating event frequency**, in events per year.

Each protection layer then has a **probability of failure on demand (PFD)**. That is the chance it fails when it is needed. A PFD of 0.1 means it fails 1 time in 10.

You multiply them:

> **Mitigated frequency = initiating event frequency × PFD₁ × PFD₂ × PFD₃**

Then you compare the result with a **target frequency** set by how bad the consequence is. If the result is below the target, the risk is tolerable. If not, you need more or better protection.

## Idea 2. Multiplying only works if the layers are independent

Multiplying probabilities is only valid when the events are independent.

An everyday example. You set two alarm clocks to wake you up. If each fails 1 time in 10, both fail 1 time in 100. But if both clocks run off the same plug, one power cut stops both. Now they fail together, about 1 time in 10. The second clock added almost nothing.

On a plant, the "same plug" is usually a **shared sensor**. If an alarm and a trip both read one pressure transmitter, a failed transmitter blinds both.

CCPS says a valid independent protection layer (IPL) must be:

- **Independent** of the cause and of the other layers
- **Specific** to the scenario
- **Dependable**, meaning it works often enough to deserve its PFD
- **Auditable**, meaning you can test and prove it

## Idea 3. The three checks the tool applies

"Simple LOPA" multiplies every layer someone claimed. "Independence checked" applies three tests first:

1. **Does the layer share a sensor with the cause?** If the cause is a failed transmitter, any layer reading that transmitter fails too. It earns no credit.
2. **Does an operator have time to act?** An alarm needs the operator to notice, diagnose and act. The tool uses a 10-minute minimum, in line with common CCPS practice. With less time, the alarm earns no credit.
3. **Is the relief valve sized for this scenario?** A PSV sized for a fire may be far too small for a gas blowby. If it can't pass the flow, it can't protect.

Then one more rule. **Layers that share a sensor with each other count once**, at the best PFD in the group.

## Idea 4. How to read the risk staircase

- The chart starts at the top left, at the cause frequency.
- Each step down is a layer that earned credit. A PFD of 0.1 is one step of one decade.
- A flat section is a layer that earned nothing. The label under it says why: "rejected" or "counted once".
- The dashed horizontal line is the target.
- The solid line is the checked result. The dashed grey line is the simple LOPA.
- The dot at the end is green if it lands below the target, red if above.

The gap between the grey and black lines is the risk that a simple LOPA hides.

## Where the numbers come from

| Number | Value | Source |
|---|---|---|
| Control loop failure | 0.1 per year | CCPS generic value for a BPCS loop |
| Loss of cooling | 0.1 per year | CCPS generic value |
| Alarm with operator response | PFD 0.1 | CCPS maximum credit for a human response |
| SIL 1 trip | PFD 0.015 | Your coursework trip: λ = 0.03 per year, PFDavg = λ × T ÷ 2 with T = 1 year |
| SIL 2 trip | PFD 0.005 | Mid-point of the SIL 2 band (0.01 to 0.001), a design target |
| SIL 3 trip | PFD 0.0005 | Mid-point of the SIL 3 band (0.001 to 0.0001) |
| PSV | PFD 0.01 | CCPS generic value |
| Catastrophic target | 1 × 10⁻⁶ per year | Example criterion for multiple fatalities |
| Major target | 1 × 10⁻⁵ per year | Example criterion for a single fatality or major release |

Say this plainly to an audience: these are generic, textbook-style values for learning. A real study uses the site's own data and criteria.

# Part 2. The scenarios, case by case

## F1. HP separator gas blowby to the LP separator

**The plant.** Well fluids arrive at the HP separator at 15 barg. Oil leaves through a level control valve to the LP separator, which runs at 3 barg and is designed for 10 barg. The liquid level in the HP separator acts as a seal. It keeps gas from following the oil downstream.

**The cause.** The level control loop fails, either transmitter LT-1 or the valve. The valve opens too far, the level drops, and the seal is lost. High-pressure gas now rushes through the valve into the LP separator. Gas flows through a valve far faster than liquid, so pressure in the LP separator climbs fast.

**Why 0.1 per year.** That is the CCPS generic failure frequency of a basic control loop.

**The consequence.** The LP separator is pushed above its 10 barg design pressure. It could rupture in the middle of the process deck. That means fire, explosion and multiple fatalities, so the severity is **Catastrophic** and the target is **1 × 10⁻⁶ per year**.

### Case A: as found

| Layer | PFD | Sensor | Verdict | Why |
|---|---|---|---|---|
| Low level alarm + operator | 0.1 | LT-1 | Rejected | LT-1 is the transmitter in the failed loop. If LT-1 reads wrongly, the alarm reads wrongly too. |
| Low-low level trip (SIL 1) closes the outlet | 0.015 | LT-2 | Valid | Its own transmitter, separate from the cause. |
| LP separator PSV | 0.01 | – | Rejected | Sized for the fire case only. Full gas blowby needs a much bigger valve. |

The sums:

- Simple LOPA: 0.1 × 0.1 × 0.015 × 0.01 = **1.5 × 10⁻⁶**. It fails by 1.5×, but only just. It looks like a small gap.
- Checked: 0.1 × 0.015 = **1.5 × 10⁻³**. It fails by **1,500×**.

**The point.** Two of the three layers were never real protection for this scenario. The simple LOPA made a serious gap look marginal.

The PSV point is a common real-world finding. API 521 lists gas blowby as a relief case that often governs the valve size. Older designs sometimes missed it.

### Case B: the fix

| Change | Why |
|---|---|
| Move the alarm to its own transmitter, LT-3 | It becomes independent of the cause. It now earns 0.1. |
| Upgrade the trip to SIL 2 (0.005) | Adds one more factor of 3 in risk reduction. |
| Resize the PSV for full gas blowby | It can now pass the flow, so it earns 0.01. |

Checked result: 0.1 × 0.1 × 0.005 × 0.01 = **5 × 10⁻⁷**. It passes with a 2× margin.

**Script.**

> "The control loop fails and gas blows through to the LP separator. On paper there are three layers. But the alarm reads the same transmitter that failed, and the PSV was only sized for fire. Only the trip is real. The simple LOPA says we're 1.5 times off. The real answer is 1,500 times."

## F2. Reinjection compressor discharge blocked

**The plant.** The reinjection compressor raises dry gas from 68 to 350 barg and sends it down the injection riser. The discharge piping is designed for 385 barg.

**The cause.** The riser ESD valve, SDV-2701, closes by mistake while the compressor is running. A spurious closure is an ASSUMED generic frequency of **0.1 per year**. Gas has nowhere to go, so discharge pressure rises.

**The consequence.** The pipe is overpressured above 385 barg. A release at 350 barg gives a large jet fire that can escalate across the deck. That is **Catastrophic**, target **1 × 10⁻⁶ per year**.

### Case A: as found

| Layer | PFD | Sensor | Verdict | Why |
|---|---|---|---|---|
| High pressure alarm + operator trips compressor | 0.1 | PT-1 | Rejected | About 1 minute from blocked outlet to relief pressure. No one can notice, diagnose and act that fast. |
| High-high pressure trip (SIL 2) | 0.005 | PT-2 | Valid | Automatic and fast. |
| Discharge PSV | 0.01 | – | Valid | Sized for this case. |

The sums:

- Simple LOPA: 0.1 × 0.1 × 0.005 × 0.01 = **5 × 10⁻⁷**. It **passes**.
- Checked: 0.1 × 0.005 × 0.01 = **5 × 10⁻⁶**. It **fails by 5×**.

**The point.** This is the most dangerous kind of error. The simple LOPA says you're safe. The time an operator needs is part of whether the layer exists at all.

### Case B: the fix

| Change | Why |
|---|---|
| Keep the alarm, but stop crediting it | It still helps the operator understand what happened. It just isn't protection. |
| Upgrade the trip to SIL 3, with 2-out-of-3 voting transmitters | Three transmitters, two must agree. One failed transmitter neither blocks a trip nor causes a false one. This is a high-integrity pressure protection system (HIPPS) style design. |

Checked result: 0.1 × 0.0005 × 0.01 = **5 × 10⁻⁷**. It passes with a 2× margin.

**A better fix to mention.** Attack the cause. Tie the riser ESD valve to the compressor, so the compressor trips before or as the valve closes. That lowers the initiating event frequency itself. Fixing the cause beats adding layers.

**Script.**

> "On paper the operator trips the compressor. But pressure hits the relief set point in about a minute. That isn't a barrier, it's a hope. Remove it and the scenario fails by 5 times. The fix is a fast automatic trip with voting transmitters."

## F3. TEG regenerator overpressure (your coursework, moved to the FPSO)

**The plant.** The TEG unit dries the gas before reinjection. Rich glycol is boiled in the regenerator by a hot-oil reboiler, and a reflux condenser at the top cools the vapour. It is the same arrangement as the amine regenerator in your MSc coursework.

**The cause.** The condenser loses cooling, or the still vent is blocked, while the reboiler keeps firing. Vapour builds up and pressure rises. Loss of cooling is a CCPS generic **0.1 per year**.

**The consequence.** The regenerator is overpressured, releasing hot glycol and hydrocarbon vapour, with fire in the module. On the FPSO the gas is sweet enough that toxic H2S is not the main outcome, so this is **Major**, target **1 × 10⁻⁵ per year**.

That differs from your coursework, where the H2S release made it Catastrophic at 1 × 10⁻⁶. Same mechanism, different consequence, different target. That is worth saying out loud.

### Case A: as found

| Layer | PFD | Sensor | Verdict | Why |
|---|---|---|---|---|
| High pressure alarm + operator | 0.1 | PT-1 | Counted once | Shares PT-1 with the trip. |
| High-high pressure trip cuts hot oil (SIL 1) | 0.015 | PT-1 | Counted once | Same transmitter as the alarm. |
| Regenerator PSV | 0.01 | – | Valid | Sized for this case. |

Both shared layers pass the individual checks. The operator has 20 minutes, and PT-1 is not the cause. But if PT-1 freezes or reads low, neither the alarm nor the trip sees the pressure rise. They fail together, so the pair counts once at its better PFD, 0.015.

The sums:

- Simple LOPA: 0.1 × 0.1 × 0.015 × 0.01 = **1.5 × 10⁻⁶**. It **passes**, with a 6.7× margin.
- Checked: 0.1 × 0.015 × 0.01 = **1.5 × 10⁻⁵**. It **fails by 1.5×**.

### Case B: the fix

Give the trip its own transmitter, PT-2. Nothing else changes.

Checked result: 0.1 × 0.1 × 0.015 × 0.01 = **1.5 × 10⁻⁶**. It passes with a 6.7× margin.

**The point.** The cheapest fix in the tool is one extra transmitter. It moves the scenario from a fail to a comfortable pass. This is your best live demo, and it comes from your own MSc work.

**Script.**

> "This is my MSc LOPA, moved onto the FPSO. The alarm and the trip both read PT-1. One failed transmitter and both are blind. Watch. I give the trip its own transmitter, and the verdict goes from fail to pass. One instrument, a tenfold change in risk."

## F4. Cargo tank overfill (Buncefield analogue)

**The plant.** Treated crude is pumped into the cargo tanks under an inert gas blanket. The level is tracked by a radar gauge, RLG-1.

**The cause.** Either the radar gauge sticks and shows a level lower than the real one, or a tank is lined up wrongly during changeover. The tool treats this as one ASSUMED generic frequency of **0.1 per year**.

**The consequence.** Crude overflows through the P/V valves onto the main deck. That means a pool fire, a vapour cloud and oil in the sea. The severity is **Major**, target **1 × 10⁻⁵ per year**.

**Why Buncefield.** In December 2005, at the Buncefield fuel depot in the UK, a tank overfilled. The automatic gauge had stuck, and the independent high-level switch, meant as the backstop, was inoperable. The escaping petrol formed a vapour cloud that exploded. It is the classic case of a "second" layer that was not truly there.

### Case A: as found

| Layer | PFD | Sensor | Verdict | Why |
|---|---|---|---|---|
| High level alarm from the radar gauge | 0.1 | RLG-1 | Rejected | Same gauge that failed. A stuck gauge never raises its own alarm. |
| High-high level alarm from switch LS-2 | 0.1 | LS-2 | Counted once | Shares LS-2 with the trip. |
| Overfill trip closes the tank inlet (SIL 1) | 0.015 | LS-2 | Counted once | Same switch as the alarm. |

The sums:

- Simple LOPA: 0.1 × 0.1 × 0.1 × 0.015 = **1.5 × 10⁻⁵**. It fails by 1.5×.
- Checked: 0.1 × 0.015 = **1.5 × 10⁻³**. It fails by **150×**.

### Case B: the fix

| Change | Why |
|---|---|
| Move the high-high alarm to its own switch, LS-3 | Independent of the gauge and of the trip. |
| Upgrade the overfill trip to SIL 2 (0.005) | More risk reduction from the automatic layer. |
| Add an overflow line to the slop tank | A passive layer, with no sensor or logic needed. It takes 0.01. |

Checked result: 0.1 × 0.1 × 0.005 × 0.01 = **5 × 10⁻⁷**. It passes with a 20× margin.

**An honest refinement to mention.** The cause lumps together "gauge sticks" and "wrong lineup". For a wrong lineup, the gauge works fine, so its alarm would be a valid layer. A careful study splits these into two scenarios. Raising this yourself shows judgement.

**Script.**

> "On paper there are three layers. One alarm uses the gauge that failed. The other two share one switch. That's Buncefield: what looked like several barriers was really one. Checked properly, the overfill risk is 150 times over the target."

## LOPA-01. Your MSc coursework (amine regenerator, toxic H2S)

This is your original scenario on the gas sweetening plant, kept as you submitted it, plus the corrected cases. The target is 1 × 10⁻⁶ per year (Catastrophic, toxic H2S).

| Case | What changes | Result per year | Verdict |
|---|---|---|---|
| A. As submitted | Initiating event 3 × 10⁻³ (condenser equipment failure). Alarm 0.058, trip 0.0296, PSV 0.00236 | 1.22 × 10⁻⁸ | Passes, 82× margin |
| B. Corrected credits | Alarm 0.1 (CCPS cap), trip PFDavg 0.015, PSV 0.01 | 4.5 × 10⁻⁸ | Passes, 22× margin |
| C. Realistic cause | Initiating event 0.1 per year (loss of cooling, not just condenser failure) | 1.5 × 10⁻⁶ | Fails, 1.5× over |
| D. Shared transmitter | Alarm and trip both on PT-1 | 1.5 × 10⁻⁵ | Fails, 15× over |
| E. Fix | Dedicated transmitter, SIL 2 trip | 5 × 10⁻⁷ | Passes, 2× margin |

**The reasoning, step by step.**

1. **A to B.** Credits were too generous. An alarm can't beat 0.1, because a person must respond. PFDavg is λ × T ÷ 2, not 1 − e^(−λ). A PSV is normally credited at 0.01. It still passes.
2. **B to C.** The cause was too narrow. "Total condenser failure" is rare. "Loss of cooling" also covers fan trips, power loss, fouling and control faults. That is about 30 times more likely, and the scenario now fails.
3. **C to D.** If the alarm and trip share a transmitter, they count once. It now fails by 15×.
4. **D to E.** Separate the transmitter and upgrade the trip, and it passes again.

**Script.**

> "When I revisited my MSc LOPA, I found my answer depended on two choices. Was my cause realistic, and were my layers truly independent? Fix both honestly, and a scenario that passed by 82 times needs a SIL 2 trip."

# Part 3. A 3-minute live demo

1. **Open the home page (20 seconds).**
   > "This is a generic deepwater FPSO, sized like an Erha-class unit. Every module is clickable. The table compares a simple LOPA with one that checks independence."

   Point at F2 and F3: simple says pass, checked says fail.
2. **Click TEG dehydration, then F3 (30 seconds).** Read the cause and consequence. Point at the "counted once" label under the alarm on the staircase.
3. **Edit live (40 seconds).** In the trip's sensor box, change PT-1 to PT-2 and press Tab. The verdict turns green and the staircase drops a step.
   > "One transmitter. Tenfold."
4. **Show F2 (40 seconds).** Point at "Only 1 min to respond". Then change the minutes to 15 to show it passes.
   > "This is exactly the edit you must not make on paper without changing the plant."

   Change it back.
5. **Close (30 seconds).**
   > "LOPA is only as honest as its independence checks. On a real asset, I'd check this against the cause and effect charts and the safety requirements specification, then verify it in the field."

# Part 4. Questions you may be asked

**Why is an alarm capped at 0.1?**
A person has to notice, diagnose and act, often under stress. CCPS treats 0.1 as the best credit for a routine alarm response, and only with enough time. Claiming better needs a human reliability assessment.

**Why not credit the control system itself?**
In F1 and F4 the control system is the cause. A failed system cannot protect against its own failure. CCPS allows a BPCS layer only if it is independent of the cause, and normally only one.

**Isn't the strict rule too harsh? Sharing a sensor doesn't make two layers identical.**
True. They can still fail separately in their logic or valves. Strict is the conservative CCPS position. The engine also has a beta-factor mode, which credits partial independence. In F3, a 10% beta factor gives about 2.9 × 10⁻⁶, between the two answers.

**Where do your numbers come from?**
CCPS generic values, and failure rates from my MSc coursework data. Assumed values are labelled. On a real asset I'd use site data, OREDA and the SRS.

**If a scenario passes, is it safe?**
Not on its own. Passing LOPA means the risk meets that target. You still check ALARP, keep proof tests on schedule, manage bypasses and track demands on safety systems as API 754 Tier 3 indicators.

**Why does the target differ between scenarios?**
The target follows the worst credible consequence. Multiple fatalities get 1 × 10⁻⁶ per year. A single fatality or major release gets 1 × 10⁻⁵.

**Is this ExxonMobil's FPSO?**
No. It uses public capacities for an Erha-class unit and typical design values. It is an educational model and is labelled as one.

**How would this help on a real asset?**
It turns an IPL register into a checklist. For each claimed layer, ask three questions. What sensor does it read? Is that sensor part of the cause or shared with another layer? How long does the operator really have?

**Did you use AI to build it?**
Answer honestly. For example:
> "I designed the scenarios and the safety logic from my MSc work, and used AI-assisted coding to build the 3D interface. I can walk through every number."
