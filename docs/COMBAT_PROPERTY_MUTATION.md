# Combat property storage and state contributions

`engine/combat-property-mutation.mjs` performs ChangeProperty arithmetic for an
explicit allowlist of 17 non-resource combat properties: basic damage amplification,
flat damage, tentacle damage, three received-damage slots,
vulnerability/weakness/frailty, and eight critical chance/damage properties.
Unsupported properties fail explicitly because HP, resources, mastery and derived
stats have different limits and refresh behavior.

Ordinary properties preserve fractional changes and can go below zero. Positive
critical-property changes multiply by their matching internal critical bonus and
round upward. Negative changes are applied directly without that amplification.
A positive request can become zero or negative when the supplied amplification
is sufficiently negative; the original positive branch still executes its
callbacks. A zero request itself causes no mutation or callbacks and returns nil.
An explicitly supplied castValue of zero is retained.

Tentacle damage requires explicit battle context. In PvE, a monster with no
positive maximum tentacle capacity stores no change and returns zero. Other
contexts use the ordinary numeric path. Supplying no context, incomplete context,
or tentacle context for another property fails instead of assuming the missing
battle/owner data.

The return value includes stored value, original-style return value, castValue,
and ordered owner/notification callback payloads. These are outputs to dispatch,
not proof that any downstream listener has run.

Evidence:

- `tools/combat_property_mutation_oracle.py` executes the original ChangeProperty,
  add/subtract, pre/post and property-category helpers for 1,536 cases: 1,440
  ordinary cases across 16 properties plus 96 tentacle-gate cases. Stored values,
  gate behavior and callback order match the authored model.
- `tools/verify_current_combat_property_mutation.py` executes the installed
  resource-150 BattlePropertyServer and its current dependencies over the same
  1,536 inherited fixtures. All outputs match the baseline fixture exactly.
- `tools/state_property_mutation_bridge_oracle.py` connects original state
  initialization/update, special-bonus calculation and recipient routing to the
  original property server in the same Lua state. The 432 cases cover ordinary
  damage amplification and vulnerability. The authored contribution plus mutation
  composition matches final stored stats, retained contributions and callbacks.

Both use explicit synthetic inputs. The connected bridge uses initial property
10, one non-card/non-player owner, an existing non-Awakener caster, supplied
expression results and property getters, and observational callbacks. It does
not construct the full state, evaluate the real expressions, dispatch listeners,
execute damage, or constitute an independent gameplay observation. Full state
creation and automatic live-property binding to damage remain unfinished.
