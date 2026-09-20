# Attribute assembly boundaries

## PvE battle inputs

`tools/pve_property_input_oracle.py` now executes original `PVEGameplay.SpawnCampRoles`, `LoadAwakerConfigProperties`, and the non-primary branch of `CalcInitProperty` with synthetic configuration and spawn observers. Six cases cover levels 70/90 and absent, zero, or fractional supplied character mastery. The player receives `battleInitData.copyProperties` unchanged at this boundary. Characters receive their `attrs`, then only absent recognized attributes are filled from character configuration. Supplied zero survives Lua truthiness; a supplied HP of zero does not trigger HP reconstruction. Missing mastery uses the ceiling of its configuration value at both levels, with no mastery level-growth calculation in this path. Supplied fractional mastery remains fractional until the separate property constructor runs. No final mastery is synthesized for the character.

Evidence: `research/evidence/pve-property-input-boundary.json`. The synthetic values are behavioral probes, not Mouchette or Arachne stats. Role construction, later hooks and server-side assembly are excluded. Together with the constructor evidence, this identifies the missing input boundary: complete initial player `copyProperties`, character `attrs`, and subsequent state changes. It does not prove that their values cannot be reconstructed elsewhere, nor justify replacing player final mastery with a team-preview sum.

The inspected owned-character path does not calculate level-based substats: AwakerDataUtils.UpdateAwakerAttrs copies supplied property values into awaker.attrs, then creates display entries. RevertAwakerAttrExitWorld likewise replaces that attribute table. This observation is limited to these methods; it does not prove no other local calculation exists.

GetNotOwnAwakerAttrs calls GetAwakerBaseAttrValue for non-primary attributes, but that helper returns the ceiling of the configuration value without a level formula for these properties. Therefore the unowned-character preview helper must not be used as evidence for final owned-character substats.

CopyAwakerDataUtils.GetAwakerAttrs reads DataCenter.playerData.DRole.attrs, despite accepting a character ID. For occupation_master it returns the stored value multiplied by `1 + occupation_master_final_add / 100`. This is a player-property getter, not proof that summing character previews reconstructs final team mastery. This getter has source evidence only in this checkpoint.

AwakerAttrModel.baseAttrs applies AttrUtils.GetAwakerFinalAttr to primary display values when a percentage field is present, first converting percentage points to a fraction. The original helper returns `ceil(base * (1 + increase))`, without the catalog epsilon. Null increase returns base unchanged. GetAwakerPhysique similarly applies `ceil(base * (1 + increase) * breakRate)` when increase is present; absent increase bypasses the break factor as well as rounding. Lua zero counts as present.

`tools/attribute_modifier_oracle.py` records 135 original helper executions, including absent and zero increase, fractional bases and physique factors. `engine/attribute-modifiers.mjs` matches those results and exposes each arithmetic stage. These are client display helper semantics, not proof of the origin, availability or battle activation of a Soulforge bonus. A supplied 30% is represented as 0.30 at this helper boundary.

Next investigation should locate authoritative level-substat assembly or independently capture complete input/output properties. Do not promote catalog substat growth, character previews or these display helpers into a complete battle reconstruction without that evidence.
