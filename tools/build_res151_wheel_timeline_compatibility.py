"""Compose the resource-151 Wheel timeline from exact catalog/component evidence."""
from pathlib import Path
import hashlib
import json


ROOT = Path(__file__).resolve().parents[1]
WHEEL = ROOT / "research/evidence/pc-res144-to-res150-wheel-transitions.json"
CATALOGS = ROOT / "research/evidence/pc-res150-to-res151-config-catalogs.json"
ACTIVE = ROOT / "research/evidence/pc-res151-replay-adapter-compatibility.json"
PAYMENT = ROOT / "research/evidence/pc-res151-paid-state-active-chain-compatibility.json"
OUTPUT = ROOT / "research/evidence/pc-res151-wheel-timeline-compatibility.json"
OPERATIONS = [
    "advance-after-use-card-wheel-trigger",
    "advance-after-keeper-skill-wheel-trigger",
    "advance-after-pursuit-wheel-triggers",
    "run-wheel-event-sequence",
    "run-wheel-active-timeline",
    "compare-wheel-active-timelines",
    "run-paid-wheel-active-timeline",
    "run-prepared-paid-wheel-active-timeline",
    "search-paid-wheel-orders",
]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    wheel = json.loads(WHEEL.read_text(encoding="utf-8"))
    catalogs = json.loads(CATALOGS.read_text(encoding="utf-8"))
    active = json.loads(ACTIVE.read_text(encoding="utf-8"))
    payment = json.loads(PAYMENT.read_text(encoding="utf-8"))
    if wheel.get("status") != "SUPPORTED_WITH_EXPLICIT_ATTACK_PROPERTY_MIGRATION" or wheel.get("summary") != {"stateRows": 9, "commandRows": 4, "gameplayEqualRows": 12, "attackPropertyMigrationRows": 1, "unexpectedRows": 0}:
        raise ValueError("Resource-150 Wheel transition boundary is incomplete")
    if catalogs.get("status") != "LUA_SEMANTICALLY_EQUIVALENT" or catalogs.get("summary", {}).get("luaSemanticChangedSharedRows") != 0:
        raise ValueError("Resource-151 Wheel catalogs changed")
    if active.get("status") != "SUPPORTED_FOR_NARROW_REPLAY_ADAPTER_BY_EXACT_CARRYFORWARD":
        raise ValueError("Resource-151 Active boundary is incomplete")
    if payment.get("status") != "SUPPORTED_BY_EXACT_DEPENDENCY_CARRYFORWARD_AND_COMPOSITION":
        raise ValueError("Resource-151 payment boundary is incomplete")
    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_PC_WHEEL_TIMELINE_COMPATIBILITY",
        "build": "pc-res151-build51",
        "status": "SUPPORTED_BY_EXACT_CATALOG_AND_COMPONENT_CARRYFORWARD",
        "operations": OPERATIONS,
        "sourceHashes": {"resource150WheelTransitions": sha(WHEEL), "catalogCompatibility": sha(CATALOGS), "activeCompatibility": sha(ACTIVE), "paymentCompatibility": sha(PAYMENT)},
        "composedEvidence": {
            "wheelStateRows": wheel["summary"]["stateRows"],
            "wheelCommandRows": wheel["summary"]["commandRows"],
            "catalogSemanticChanges": catalogs["summary"]["luaSemanticChangedSharedRows"],
            "activeClientModuleDependencies": len(active["clientModuleDependencies"]),
            "activeConfigDependencies": len(active["configDependencies"]),
            "ordinaryPveCardPlayFixtures": payment["composedEvidence"]["ordinaryPveCardPlayFixtures"],
            "energyPaymentFixtures": payment["composedEvidence"]["energyPaymentFixtures"],
        },
        "buildSpecificRule": {"doomsdayOwnerAttackSourceProperty": "AtkForce", "reason": "Resource 151 is Lua-semantically equal to the resource-150 Wheel rows containing the migrated StateOwner.AtkForce expression"},
        "scope": "The four recovered Wheel transitions and their explicit event, complete-property Active, payment, catalog-preparation, comparison and bounded permutation compositions on resource 151.",
        "limitations": ["Pursuit generation and post-pursuit events remain explicit rather than inferred", "Only recovered Doomsday Rampage, Light of Intellect, Eternal Weave and Rota Fortunae transitions are included", "No connected trigger scheduling, automatic deck mutation, global optimization, gameplay, prediction or holdout credit"],
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"status": report["status"], "operations": len(OPERATIONS), "output": str(OUTPUT.relative_to(ROOT))}, indent=2))


if __name__ == "__main__":
    main()
