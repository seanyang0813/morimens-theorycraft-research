# Presentation can call battle randomness

The original `BattleEffectServer.PlayEffectSfx` reads `battleEngine.rand`. With VFX present and player-role targets, it retrieves each player's Awakener list. Every nonempty list causes `rand:random(1, #awakerList)` and the selected Awakener UID is appended to the presentation record. This includes a singleton list. Empty lists cause no random call. With no VFX, this entire path is skipped.

`tools/effect_vfx_rng_oracle.py` executes the original method in ten cases: no targets, empty lists, singleton and multiple Awakeners, and multiple player targets; each runs with and without VFX. The supplied random observer selects the last index, and the tool asserts ordered random calls followed by recorded UIDs. Results and original source fingerprint are in `research/evidence/effect-vfx-rng.json`.

This proves the call path, not how the actual PRNG updates its state or whether a particular later combat outcome changes. Target-role checks, Awakener lists, random results and recording are explicit adapters. Other presentation branches are outside the probe.

The whole-command compatibility inspector therefore retains the VFX field blocker and adds `PRESENTATION_RNG`. A generic importer must establish the target branch and preserve any relevant random consumption before claiming equivalent simulation. VFX cannot yet be discarded universally as harmless metadata. The restricted import adapter now retains `BaseSortID` separately while preserving row-index order; this does not relax VFX handling.
