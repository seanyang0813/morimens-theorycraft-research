# Developer / agent handoff

## Start here

This repository is an experimental reconstruction of Morimens combat mechanics and a general theorycraft workbench. Mouchette/Arachne is a case study, not the product boundary.

Run the full checkpoint from the repository root:

```powershell
python tools/verify_research.py
```

The verifier needs Python and Node.js. The authored JavaScript tests use Node's built-in test runner and do not require npm installation. To refresh the static workbench after changing an allowlisted engine module:

```powershell
python tools/prepare_local_website.py
python tools/verify_research.py
```

The expected current result is 132 passing test files and `publicationStatus: NOT_READY`. A nonzero `--check-publication` result is correct until gameplay evidence satisfies the gate. The battle-property snapshot adapter accepts complete captured card maps, so Strike/Mortal Blast validation does not silently drop card-instance branches. It derives crits from the recovered rules and refuses chance-dependent results without a captured pre-outcome roll. Monster bonuses, buff/debuff presence and target-state damage eligibility derive from a captured battle tag and active state IDs instead of manually selected flags or property names. An offline replay decoder can expand an explicitly supplied replay with the copied client's native codecs. Its protocol-backed index reconstructs state at every card-use boundary, preserves nested target selections, and attaches candidate action windows containing their hit evidence. It also reconstructs damage-input snapshots at each hit, restoring pre-hit HP and block from explicit `BeHit` fields after the recorded property mutations. A strict adapter can condition-select one ordinary Active row from captured state layers/progression and configured team schools, prove unsupported competing damage branches inactive, derive Super Ultimate from captured energy properties, and turn a narrow single-hit window into a retrospective snapshot regression candidate while keeping the observed hit separate; no actual replay has yet been decoded. The source-hashed row audit follows supported-tag Awakener skills and finds 187 of 198 linked ordinary-Active commands have compatible static replay-candidate shapes; runtime and gameplay eligibility remain separate.

## Architecture

- `engine/`: strict, immutable JavaScript research components. Unsupported or ambiguous inputs should fail or return an explicit unsupported status rather than silently dropping effects.
- `tests/`: component, integration and website tests. `tests/synthetic/` contains frozen outputs from isolated original-runtime probes; these are not gameplay validation.
- `tools/`: CLIs, fixture builders and original-runtime oracle scripts. Oracle scripts require local ignored client material and are not needed to run the frozen test suite.
- `website/dist/`: dependency-free static research workbench. Authored engine copies are generated from the allowlist in `website/engine-modules.json` and verified byte-for-byte.
- `research/evidence/registry.json`: claim-level evidence index and source hashes.
- `research/evidence/verification-snapshot.json`: latest authoritative gate snapshot.
- `docs/`: mechanic scopes, recovered behavior, known gaps and evidence strength.

## Current integration frontier

The general runners can model resolved Active, Passive, Fixed and Pure hits; HP limits; energy and card payment; bounded multi-hit timelines; selected state lifecycle/property effects; and some imported command shapes. The current command frontier is a damage/energy prefix followed by a contiguous suffix of unconditional `BEAddState` rows. Each suffix row may target the caster or selected damage target, repeated definitions merge in command order, and prefix death prevents the suffix. Prepared skills and the Actions workbench use this runner. See `engine/terminal-state-command.mjs` and `docs/TERMINAL_STATE_COMMAND.md`.

`engine/ordered-state-command.mjs` is the next boundary beyond terminal suffixes: it preserves interleaved state-addition, removal, layer-subtraction, ultimate-energy gain and Active-damage order, lets later damage expressions query states created by earlier rows, lets attacks consume their live property effects, and exposes the post-row caster energy to later damage rows as `CmdCaster.ulti_energy`. Automatic battle-property assembly remains a separate evidence problem because the client battle constructor receives a server-prepared `roleData.properties` vector; see `docs/BATTLE_PROPERTY_INPUT_BOUNDARY.md`. Broader command execution, live energy in state-mutation expressions, encounter phases and reactive event graphs remain incomplete.

## Validation frontier

There are two real gameplay records and neither is reviewable. The next decisive validation work is described in `docs/NEXT_GAMEPLAY_CAPTURE.md`:

1. Reconstruct one controlled high-difficulty action with known build and exact pre-hit state.
2. Save and hash the executable prediction before examining the outcome.
3. Use the first completed case as regression evidence.
4. Freeze a different unseen case as an independent holdout.

Use `tools/freeze_gameplay_prediction.mjs` for steps 2 and 4. It verifies the current runtime, hashes the scenario and pre-outcome evidence, writes a non-overwritable freeze record, and prints the reference expected by the observation audit. It accepts single-hit scenarios and completed resolved-hit, Old Embers, card-action or ordered-command scenarios; partial sequence totals fail closed.

Do not fit unknown modifiers to an already viewed total. Synthetic original-runtime matches prove component behavior only.

## Publishing boundary

The source may be shared as an explicitly unverified research checkpoint. Do not describe the calculator as accurate or deploy it as a verified build recommender until `python tools/verify_research.py --check-publication` passes and the evidence review confirms the gate. Never commit `research/raw/`, `research/extracted/`, `research/observations/`, generated symbol indexes, copied binaries, keys or private screenshots.
