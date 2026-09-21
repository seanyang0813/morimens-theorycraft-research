"""Generate original-runtime mixed Strike/Ulti card-target fixtures."""
import json
import random

from card_target_oracle import CardTargetOracle, ROOT


def main():
    oracle = CardTargetOracle()
    old = json.loads((ROOT / "tests/synthetic/original-target-runtime.json").read_text(encoding="utf-8"))
    base = old["fixtures"][0]["input"]
    rng = random.Random(20260924)
    cases = []
    for strike in (False, True):
        for ulti in (False, True):
            for crit in (False, True):
                for instruction in (False, True):
                    for trigger in (False, True):
                        cases.append((100, {**base, "isCrit": crit, "awakerCritDamage": 150,
                            "cardCritDamage": 25, "awakerCardCritDamage": 10,
                            "skillTypeCritDamage": 20, "ultiSkillTypeCritDamage": 40,
                            "critDamagePer": 50, "beDamagePer4": 45, "beDamagePer5": 35,
                            "cardBlockBarrierPer": 30, "instruction": instruction,
                            "stateTriggerAdd": trigger, "block": 10, "barrier": False,
                            "strike": strike, "ulti": ulti}))
    for _ in range(192):
        values = {key: rng.choice([-25, 0, 0.1, 25, 150]) for key in base
                  if key not in ("isCrit", "enemyStateDmgMultiplier")}
        values.update(isCrit=rng.choice((False, True)), enemyStateDmgMultiplier=1,
                      instruction=rng.choice((False, True)), stateTriggerAdd=rng.choice((False, True)),
                      block=rng.choice((0, 10)), barrier=rng.choice((False, True)),
                      strike=rng.choice((False, True)), ulti=rng.choice((False, True)),
                      ultiSkillTypeCritDamage=rng.choice((-25, 0, 20, 75)))
        cases.append((rng.randint(1, 100000), values))
    fixtures = []
    for value, inputs in cases:
        expected = oracle.final_damage(value, inputs)
        resolved = {key: inputs[key] for key in base}
        resolved["skillTypeCritDamage"] = ((inputs["skillTypeCritDamage"] if inputs["strike"] else 0) +
                                                   (inputs["ultiSkillTypeCritDamage"] if inputs["ulti"] else 0))
        if inputs["stateTriggerAdd"] or not inputs["ulti"]:
            resolved["beDamagePer4"] = 0
        if inputs["stateTriggerAdd"] or not inputs["instruction"]:
            resolved["beDamagePer5"] = 0
        if not inputs["block"] > 0 and not inputs["barrier"]:
            resolved["cardBlockBarrierPer"] = 0
        fixtures.append({"showDamage": value, "adapterInputs": inputs, "input": resolved, "expected": expected})
    output = ROOT / "tests/synthetic/original-card-target-mixed.json"
    output.write_text(json.dumps({
        "kind": "SYNTHETIC_ORIGINAL_RUNTIME", "build": "pc-res144-build51",
        "scope": "Original target methods with none, Strike, Ulti and combined tags; explicit card and barrier eligibility; no HP or gameplay",
        "sourceHash": oracle.assets["BattleCmdServer.lua"]["sha256"], "fixtures": fixtures,
    }, indent=2) + "\n", encoding="utf-8", newline="\n")
    print("Generated", len(fixtures), "mixed-tag card/target cases")


if __name__ == "__main__":
    main()
