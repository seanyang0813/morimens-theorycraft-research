# Morimens damage research preview

This is a shareable checkpoint of an unfinished reverse-engineering project. It explains the current damage model and exposes the calculator workbench, but it does **not** claim that a complete Mouchette rotation or general build prediction has been verified against gameplay.

## Best two documents to read

- [How damage stacks](output/pdf/morimens-damage-stacking-mouchette.pdf) explains additive buckets, separate multipliers, flat Strike damage, critical damage, Mouchette's follow-ups, her temporary Strike stacks, and Frenzy Old Embers.
- [Mouchette + Arachne conditional worksheet](output/pdf/mouchette-arachne-conditional-breakdown.pdf) shows the current five-pair equations for the requested level-90 setup with Mouchette's maximum signature Wheel and 150% Damage Amplification. It deliberately leaves final Realm Mastery unresolved instead of inventing a value.

## What currently explains the large in-game number

The earlier 97,228 and 168,039 totals were intermediate conditional models. Later reconstruction found additional Arachne realm effects whose size depends on the final player Realm Mastery. The current worksheet therefore gives equations rather than pretending one final direct-damage total is established.

Frenzy's Old Embers is also a separate HP-change event. For an eligible Active hit with enough Old Embers, the recovered command selects up to the incoming amount, consumes that many Old Embers, and requests another three times that amount as HP loss. This can turn a conditional 168,039 direct-damage comparison into 672,156 combined damage before later HP limits. That is a useful explanation for a reported 500,000-1,000,000 result, but it has not been proven to be the cause of the friend's specific run.

## Calculator preview

The local site under [`website/dist`](website/dist/index.html) contains:

- a general Active, Passive, Fixed and Pure formula sandbox;
- Actions, States and Timeline workbenches for comparing sequences;
- character and Wheel build-data browsing;
- a rule/evidence browser;
- the Mouchette/Arachne case study as a separate example.

The engine reconstructs explicit pieces of the client logic in JavaScript. It does not run the game or execute arbitrary game Lua directly. Python oracle tools load selected copied Lua functions through the copied local runtime only to generate isolated comparison fixtures; the website runs the authored JavaScript reconstruction.

## Evidence status

The latest automated checkpoint passes 120 test files. These cover many isolated arithmetic, targeting, state, resource and event-order boundaries, including thousands of exact comparisons against selected original-runtime functions with synthetic inputs.

Gameplay verification is still incomplete:

- reviewable reconstructed gameplay predictions: **0**;
- independently frozen gameplay holdouts: **0**;
- current publication gate: **NOT_READY**.

The strongest high-difficulty observation so far is a Frenzy statistics record crediting Arachne with 2,205 Strike damage and 6,615 Old Embers damage. Its exact 3:1 ratio is consistent with the recovered Old Embers rule, but missing pre-hit build and event state prevents treating it as a complete prediction.

## What remains

The next decisive step is a controlled high-difficulty capture with the build and pre-hit state recorded before the result is inspected. One reconstructed observation is needed for regression, followed by a separately frozen unseen holdout. Character/build assembly, arbitrary command/state execution, encounter phases and browser QA also remain incomplete.

Data-derived SKeyDB material is credited to dansa and contributors under CC BY-NC-SA 4.0. No copied game binaries, decryption keys, extracted client scripts or private screenshots are included in the publishable repository.
