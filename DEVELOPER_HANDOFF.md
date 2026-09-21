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

The expected current result is 142 passing test files and `publicationStatus: NOT_READY`. A nonzero `--check-publication` result is correct until gameplay evidence satisfies the gate. The native replay decoder has now expanded seven authorized real server replays. The six-record batch adds 1,647 records, 44,532 events, 303 complete card-use boundaries and 432 hits with no unknown protocol IDs. The index preserves nonobject presentation payloads, empty Lua maps, and property changes serialized before `AddNewCard`. A strict adapter can bind captured properties, states, card arguments, skill routing and a selected Active hit while keeping the observed result separate. It accepts the replay's one-past-end Lua argument cursor and conservative repeated-hit groups. Fifteen supported candidates exactly match one of the independently evaluated critical/noncritical branches; eleven come from another record on the same stage as the Mouchette case. These checks are retrospective, their RNG draws were not captured, and the battle data has no explicit combat-build fingerprint. The source-hashed row audit remains a static compatibility measure; runtime and gameplay eligibility are separate.

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

`engine/ordered-state-command.mjs` is the next boundary beyond terminal suffixes: it preserves interleaved state-addition, removal, layer-subtraction, ultimate-energy gain, single-parameter Block/Heal and restricted Active/Passive/Fixed/Pure damage order. Later damage expressions can query states created by earlier rows; attacks consume target Block; target Heal changes live HP; and `CmdCaster.ulti_energy` reflects earlier supported energy rows. Active damage consumes supported live state properties; Passive and Fixed rows currently use explicit static target-modifier snapshots. Pure retains `includeStats` metadata without executing statistics. Block and Heal numerical paths have 1,782 exact copied-original component executions; mixed row composition remains authored. Automatic battle-property assembly remains a separate evidence problem because the client battle constructor receives a server-prepared `roleData.properties` vector; see `docs/BATTLE_PROPERTY_INPUT_BOUNDARY.md`. Broader command execution, live energy in mutation expressions, multi-target/repeating Block/Heal effects, encounter phases and reactive event graphs remain incomplete.

## Validation frontier

There are two screenshot-based gameplay records plus seven privately preserved native replays. None is a reviewable prediction or holdout. The next decisive validation work is described in `docs/NEXT_GAMEPLAY_CAPTURE.md`:

1. Reconstruct one controlled high-difficulty action with known build and exact pre-hit state.
2. Save and hash the executable prediction before examining the outcome.
3. Use the first completed case as regression evidence.
4. Freeze a different unseen case as an independent holdout.

Use `tools/freeze_gameplay_prediction.mjs` for steps 2 and 4. It verifies the current runtime, hashes the scenario and pre-outcome evidence, writes a non-overwritable freeze record, and prints the reference expected by the observation audit. It accepts single-hit scenarios and completed resolved-hit, Old Embers, card-action or ordered-command scenarios; partial sequence totals fail closed.

Do not fit unknown modifiers to an already viewed total. Synthetic original-runtime matches prove component behavior only.

## Publishing boundary

The source may be shared as an explicitly unverified research checkpoint. Do not describe the calculator as accurate or deploy it as a verified build recommender until `python tools/verify_research.py --check-publication` passes and the evidence review confirms the gate. Never commit `research/raw/`, `research/extracted/`, `research/observations/`, generated symbol indexes, copied binaries, keys or private screenshots.
