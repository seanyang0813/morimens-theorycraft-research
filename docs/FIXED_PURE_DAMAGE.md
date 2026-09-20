# Fixed and Pure damage: pre-hit research

These modules reconstruct one effect iteration from PC resource 144, build 51. They do not establish damage actually lost from HP, repeat scheduling, statistics, or state callbacks.

`engine/fixed-pure-prehit.mjs` implements the recovered arithmetic. The main research API now accepts these categories through explicit `effect` inputs and optional hit-resolution properties. Neither category is enabled in the website yet.

Fixed damage multiplies its explicit base by five independent target property factors, each `1 + property / 100`, then rounds upward. The original `CalFinalVal` applies the dimension modifier only when that rounded value is positive, rounds upward again, and the effect enforces minimum damage 1. Dead targets are skipped.

Pure damage skips dead targets and nonpositive bases. A positive base is rounded upward and passed directly to `BeHit`. The effect does not read Fixed target multipliers or apply `CalFinalVal`. This establishes pre-hit arithmetic only; it does not establish that Pure bypasses every later mitigation mechanic. The original effect also controls statistics inclusion through its third parameter; the arithmetic module does not simulate statistics.

Evidence: `BEFixedDamage`, `BEPureDamage`, and `BattleEffectServer` original modules, with SHA-256 hashes saved in the two runtime fixture files. `tools/fixed_pure_runtime_oracle.py` executes their original Lua effect methods using the copied client runtime, supplies explicit synthetic target properties, and intercepts `BeHit`. It does not run a battle. Results: 372 Fixed and 322 Pure cases, including dead targets, nonpositive and fractional bases, negative modifiers, and deterministic randomized inputs. Varying the dimension adapter for Pure leaves its results unchanged.

An additional 15 original BeHit/HP cases cover Fixed and Pure shields, generic immunity, caps, prevention ineligibility and death resistance. Fixed includes a Puncture case; the original Pure effect always supplies subtype 0, so the API rejects Pure Puncture. The API still requires the caller to resolve immunity eligibility. Its HP comparison stitches separately checked components; it does not execute the original effect-to-BeHit chain or downstream events.

Independent complete gameplay predictions and frozen holdouts remain zero. Publication remains NOT_READY. The Mouchette/Arachne PDF still needs the team's final Realm Mastery; these new category tests do not supply that missing input or resolve the reported 500k–1m discrepancy.
