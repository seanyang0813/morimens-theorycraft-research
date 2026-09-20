# State-add request boundary

`engine/add-state-request.mjs` models the PC res144 build51 request path from
BEAddState.DoEffect through BEAddStateParent.AddState for one supplied non-card
target. It is a general command building block, not a character-specific formula.

Requested layers are rounded upward (default one). Nonpositive requests skip the
operation. Immunity is checked before layer calculation. The calculated layer is
initially clamped to zero, but each available limit callback receives the original
calculated value and replaces the candidate result. The total limit can therefore
overwrite the earlier limit. A positive calculated value capped to zero or below
stops the request immediately.

The 150 cases in `tests/synthetic/original-add-state-requests.json` were generated
by `tools/add_state_request_oracle.py` running original DoEffect and AddState
methods together. Their source hashes and adapter scope are recorded in the
fixture. The authored request planner matches their requested creation layers and
observed callback order.

Immunity, layer modifiers and limit calculations remain explicit supplied inputs.
The superclass is a no-op in the oracle; actual CreateState is an observer. The
planner does not create or merge state instances, update properties, fire events,
resolve card targets or verify a whole battle. `createdLayers` records requests at
the creation boundary, not states actually added. This module is not yet exposed
as a supported website effect. Gameplay verification remains outstanding.
