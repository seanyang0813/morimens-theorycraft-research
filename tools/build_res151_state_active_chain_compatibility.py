"""Compose the proved resource-151 singular state handoff into an ordered chain."""
from pathlib import Path
import hashlib
import json


ROOT = Path(__file__).resolve().parents[1]
SINGULAR = ROOT / "research/evidence/pc-res151-state-active-sequence-compatibility.json"
ACTIVE = ROOT / "research/evidence/pc-res151-replay-adapter-compatibility.json"
EXAMPLE = ROOT / "research/examples/theorycraft-installed-prepared-state-active-chain.json"
ENGINE = ROOT / "engine/prepared-state-active-chain.mjs"
OUTPUT = ROOT / "research/evidence/pc-res151-state-active-chain-compatibility.json"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    singular = json.loads(SINGULAR.read_text(encoding="utf-8"))
    active = json.loads(ACTIVE.read_text(encoding="utf-8"))
    example = json.loads(EXAMPLE.read_text(encoding="utf-8"))
    actions = example.get("input", {}).get("activeSkills", [])
    schemas = sorted({row.get("schemaVersion") for row in actions})
    if singular.get("status") != "SUPPORTED_BY_DIRECT_RUNTIME_AND_EXACT_COMPOSITION" or singular.get("operation") != "run-prepared-state-active-sequence":
        raise ValueError("Singular resource-151 state-to-Active boundary is incomplete")
    if active.get("status") != "SUPPORTED_FOR_NARROW_REPLAY_ADAPTER_BY_EXACT_CARRYFORWARD":
        raise ValueError("Resource-151 Active boundary is incomplete")
    if example.get("operation") != "run-prepared-state-active-chain" or example.get("input", {}).get("build") != "pc-res151-build51" or not actions or any(row.get("build") != "pc-res151-build51" or row.get("schemaVersion") not in (1, 4) for row in actions):
        raise ValueError("Installed chain example exceeds the bounded Active schemas")
    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_PC_STATE_ACTIVE_CHAIN_COMPATIBILITY",
        "build": "pc-res151-build51",
        "status": "SUPPORTED_BY_EXACT_COMPONENT_COMPOSITION",
        "operation": "run-prepared-state-active-chain",
        "sourceHashes": {
            "singularCompatibility": sha(SINGULAR),
            "activeCompatibility": sha(ACTIVE),
            "installedExample": sha(EXAMPLE),
            "chainEngine": sha(ENGINE),
        },
        "composedEvidence": {
            "directStateMutationFixtures": singular["directRuntime"]["fixtures"],
            "directStateMutationMismatches": singular["directRuntime"]["mismatches"],
            "catalogSemanticChanges": singular["composedEvidence"]["catalogSemanticChanges"],
            "activeClientModuleDependencies": len(active["clientModuleDependencies"]),
            "activeConfigDependencies": len(active["configDependencies"]),
            "supportedActiveSchemas": [1, 4],
            "installedExampleActions": len(actions),
            "installedExampleSchemas": schemas,
        },
        "scope": "One supported resource-151 catalog state setup followed by a nonempty ordered list of schema-1 or schema-4 prepared Active actions, carrying only state-derived caster properties/layers, target HP/Block and any already exposed energy.",
        "limitations": [
            "Schema 2/3 prepared Active actions remain excluded from this chain even though ultimate energy has a separate resource-151 boundary",
            "Costs, card zones, expiry, callbacks, reactive effects, retargeting, other actors and death execution are excluded",
            "No gameplay, prediction or holdout credit",
        ],
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"status": report["status"], "actions": len(actions), "operation": report["operation"], "output": str(OUTPUT.relative_to(ROOT))}, indent=2))


if __name__ == "__main__":
    main()
