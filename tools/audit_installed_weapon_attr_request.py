"""Record the installed client's narrow weapon-attribute request boundary.

The report contains source hashes and function names only. It does not export
the copied Lua bytecode, proprietary tables, or a guessed enhancement curve.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from audit_installed_item_utils import CURRENT_SOURCE, OLD_SOURCE, read_proto


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "research/evidence/pc-res151-weapon-attribute-request.json"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    installed = read_proto(CURRENT_SOURCE)
    historical = read_proto(OLD_SOURCE)
    names = set(installed["constants"])
    if not {"ReqCalWeaponAttr", "GetItemAttrValByAttrName", "GetWeaponAttrValue"}.issubset(names):
        raise ValueError("Installed ItemDataUtils weapon-attribute entry points changed")
    request = installed["children"][102]
    if request != historical["children"][102]:
        raise ValueError("Weapon-attribute request body differs from historical PC client")
    if not {"ReqServer", "GameRequest", "OnCalWeaponAttr"}.issubset(set(request["constants"])):
        raise ValueError("Expected server request is absent")
    if len(request["children"]) != 2:
        raise ValueError("Expected success and failure request callbacks")
    callback_text = [
        {constant for constant in child["constants"] if isinstance(constant, str)}
        for child in request["children"]
    ]
    if not any("ReqCalWeaponAttr Successful" in row for row in callback_text):
        raise ValueError("Success callback changed")
    if not any("ReqCalWeaponAttr Failed" in row for row in callback_text):
        raise ValueError("Failure callback changed")

    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_PC_WEAPON_ATTRIBUTE_REQUEST_BOUNDARY",
        "analysisTrack": "mechanics",
        "status": "CLIENT_REQUEST_IDENTIFIED_VALUE_ALGORITHM_UNRESOLVED",
        "build": "pc-res151-build51",
        "sourceHashes": {
            "installedItemDataUtilsSha256": digest(CURRENT_SOURCE),
            "historicalItemDataUtilsSha256": digest(OLD_SOURCE),
        },
        "findings": {
            "requestMethod": "ReqCalWeaponAttr",
            "protocolPath": "ProtoManager.Instance.ReqServer(GameRequest.OnCalWeaponAttr)",
            "successAndFailureCallbacksPresent": True,
            "requestBodyEqualToHistoricalPc": True,
            "attributeReadEntryPointsPresent": ["GetItemAttrValByAttrName", "GetWeaponAttrValue"],
        },
        "scope": "Static request and callback boundary in ItemDataUtils only. The client sends a weapon-attribute calculation request; this inspection does not identify the server's numeric algorithm or prove that any particular response becomes a battle property.",
        "limitations": [
            "No enhancement scaling curve, request payload, response values, server implementation, or gameplay result is recovered.",
            "This does not validate the pinned SKeyDB Wheel main-stat series against the installed client.",
            "No copied Lua bytes, private paths, player identifiers, or item rows are published.",
        ],
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"status": report["status"], "output": str(OUTPUT.relative_to(ROOT)).replace("\\", "/")}))


if __name__ == "__main__":
    main()
