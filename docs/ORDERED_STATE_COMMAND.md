# Ordered state and damage command

`engine/ordered-state-command.mjs` adapts a narrow exported command shape into the existing state-sequence engine while preserving row order. It currently accepts unconditional `BEAddState`, `BERemoveState` and `BESubStateLayer` rows, `BEGainUltiEnergy` for the command caster, and ordinary `BEActiveDamage` rows against one explicitly supplied target. A state may belong to the caster or that target. Every state definition, application request, initial live property, energy context and numeric command variable remains explicit.

Unlike the terminal-state runner, state rows may appear before, between or after damage rows. Later damage conditions and parameters can use an explicitly bound live `GetStateLayer` query, and damage uses property changes made by earlier states. Death stops later rows through the existing sequence boundary.

The first connected real command fixture is Cmd45948. Its first row applies State19534 Vulnerable to `UpperTarget`; its second row deals Active damage to the same target. With a supplied base of 100 and neutral remaining modifiers, the ordered execution deals 125. Reversing the rows deals 100 before applying Vulnerable. The exported 350 ms `DelayTime` is retained in the row plan but treated as inert only because the experiment requires `otherEvents: "assumed-absent"`.

Removal reverses the stored property contribution once. Layer subtraction follows the recovered `SubLayer` order: reduce layers, update a `ChangedLayer` contribution, record the change, and run life end if the state reaches zero. Caster-layer attribution remains excluded.

The same ordered runner can now execute the three effect types in actual Cmd57564: damage, caster ultimate-energy gain and caster State2669. Energy uses the recovered capped gain boundary. A later damage row may read `CmdCaster.ulti_energy`, using the value after earlier supported energy rows execute. State-mutation expressions still require supplied static variables.

The runner rejects unsupported effects, unknown row fields, conditional state rows, automatic target acquisition and mismatched state owners or layers. State-row expressions currently use supplied numeric variables; live state queries are connected for later damage rows. This is an authored component composition, not an independently validated gameplay prediction or a complete command VM.
