"""Prove the resource-151 ordinary PvE resource and paid state-chain boundary."""
from pathlib import Path
import hashlib
import json


ROOT = Path(__file__).resolve().parents[1]
MODULE_ROOT = ROOT / "research/observations/current-res151-build51/modules"
CARD_MODULES = ROOT / "research/evidence/pc-res150-card-modules.json"
CARRY = ROOT / "research/evidence/pc-res150-to-res151-combat-carryforward.json"
PLAY = ROOT / "research/evidence/pc-res150-card-play-runtime.json"
PAYMENT = ROOT / "research/evidence/pc-res150-energy-payment-runtime.json"
CHAIN = ROOT / "research/evidence/pc-res151-state-active-chain-compatibility.json"
OUTPUT = ROOT / "research/evidence/pc-res151-paid-state-active-chain-compatibility.json"
MODULES = ("BattleUnitBase", "BattleCardServer", "BEBeforeUseCard", "BattleUnitPlayer", "BattleConst", "BattleUtilServer", "BattlePropertyServer")


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    card = json.loads(CARD_MODULES.read_text(encoding="utf-8"))
    carry = json.loads(CARRY.read_text(encoding="utf-8"))
    play = json.loads(PLAY.read_text(encoding="utf-8"))
    payment = json.loads(PAYMENT.read_text(encoding="utf-8"))
    chain = json.loads(CHAIN.read_text(encoding="utf-8"))
    expected = {row["name"].removesuffix(".lua"): row["current"]["sha256"] for row in card["modules"]}
    expected.update({row["name"].removesuffix(".lua"): row["after"][0]["sha256"] for row in carry["modules"] if row.get("status") == "IDENTICAL"})
    rows = []
    for name in MODULES:
        path = MODULE_ROOT / f"{name}.lua"
        if not path.is_file() or name not in expected:
            raise FileNotFoundError(f"Missing resource-151 paid-chain dependency: {name}")
        actual = sha(path)
        rows.append({"name": f"{name}.lua", "resource150Sha256": expected[name], "resource151Sha256": actual, "status": "IDENTICAL" if actual == expected[name] else "CHANGED"})
    if any(row["status"] != "IDENTICAL" for row in rows):
        raise ValueError("A resource-151 paid-chain dependency changed")
    if play.get("status") != "EXACT_MATCH_IN_FIXTURE_DOMAIN" or play.get("fixtures") != 90 or play.get("mismatches") != 0:
        raise ValueError("Resource-150 card-play evidence is incomplete")
    if payment.get("status") != "EXACT_MATCH_IN_FIXTURE_DOMAIN" or payment.get("fixtures") != 222 or payment.get("mismatches") != 0:
        raise ValueError("Resource-150 payment evidence is incomplete")
    if chain.get("status") != "SUPPORTED_BY_EXACT_COMPONENT_COMPOSITION" or chain.get("operation") != "run-prepared-state-active-chain":
        raise ValueError("Resource-151 state chain evidence is incomplete")
    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_PC_PAID_STATE_ACTIVE_CHAIN_COMPATIBILITY",
        "build": "pc-res151-build51",
        "status": "SUPPORTED_BY_EXACT_DEPENDENCY_CARRYFORWARD_AND_COMPOSITION",
        "operations": ["run-card-resource-timeline", "run-paid-prepared-state-active-chain"],
        "sourceHashes": {"cardModules": sha(CARD_MODULES), "combatCarryforward": sha(CARRY), "cardPlayRuntime": sha(PLAY), "energyPaymentRuntime": sha(PAYMENT), "stateActiveChain": sha(CHAIN)},
        "modules": rows,
        "composedEvidence": {"ordinaryPveCardPlayFixtures": play["fixtures"], "ordinaryPveCardPlayMismatches": play["mismatches"], "energyPaymentFixtures": payment["fixtures"], "energyPaymentMismatches": payment["mismatches"], "stateMutationFixtures": chain["composedEvidence"]["directStateMutationFixtures"], "supportedActiveSchemas": chain["composedEvidence"]["supportedActiveSchemas"]},
        "scope": "Ordinary non-keeper PvE supplied card legality, resolved cost and energy payment before one supported resource-151 state card and schema-1/4 prepared Active actions.",
        "limitations": ["Card instances, hand/status facts and cost modifiers remain explicit inputs", "Hand removal, draws, refunds, changing costs, turn gates, callbacks, reactive effects and death execution are excluded", "No gameplay, prediction or holdout credit"],
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"status": report["status"], "modules": len(rows), "operations": report["operations"], "output": str(OUTPUT.relative_to(ROOT))}, indent=2))


if __name__ == "__main__":
    main()
