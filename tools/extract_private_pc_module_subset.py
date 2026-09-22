"""Extract an explicit Lua-module subset from a local PC build into ignored storage."""
from __future__ import annotations

from pathlib import Path
import argparse
import hashlib
import json

import UnityPy


ROOT = Path(__file__).resolve().parents[1]
BUNDLES = ("share.ab", "gamescript.ab", "foundation.ab")


def sha(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--install-root", required=True, type=Path)
    parser.add_argument("--expected-build", required=True)
    parser.add_argument("--module", required=True, action="append")
    parser.add_argument("--output-root", required=True, type=Path)
    args = parser.parse_args()
    requested = tuple(dict.fromkeys(name if name.endswith(".lua") else name + ".lua" for name in args.module))
    if len(requested) != len(args.module):
        raise ValueError("Module names must be unique")

    install = args.install_root.resolve()
    download = install / "_game_data_" / "DownLoad"
    version_bytes = (download / "_version.json").read_bytes()
    version = json.loads(version_bytes.decode("utf-8-sig"))["versionInfo"]
    build = f"pc-res{version['resVersion']}-build{version['buildVersion']}"
    if build != args.expected_build:
        raise ValueError(f"Expected {args.expected_build}, found {build}")
    output_root = args.output_root.resolve()
    try:
        output_root.relative_to(ROOT / "research/observations")
    except ValueError as error:
        raise ValueError("Private module output must stay below research/observations") from error

    key = ROOT / "research/raw/bundle-key.bin"
    if not key.is_file():
        raise FileNotFoundError("Local bundle key is required")
    UnityPy.set_assetbundle_decrypt_key(key.read_bytes())
    found: dict[str, list[bytes]] = {name: [] for name in requested}
    for bundle_name in BUNDLES:
        path = download / bundle_name
        environment = UnityPy.load(str(path))
        for obj in environment.objects:
            if obj.type.name != "TextAsset":
                continue
            value = obj.read()
            name = value.m_Name
            if name not in found:
                continue
            payload = value.m_Script.encode("utf-8", "surrogateescape") if isinstance(value.m_Script, str) else bytes(value.m_Script)
            found[name].append(payload)
    missing = [name for name, values in found.items() if not values]
    duplicates = [name for name, values in found.items() if len(values) != 1 and values]
    if missing or duplicates:
        raise ValueError(f"Module subset is not unique; missing={missing}, duplicates={duplicates}")

    output_root.mkdir(parents=True, exist_ok=True)
    results = []
    for name in requested:
        payload = found[name][0]
        destination = output_root / name
        if destination.exists() and destination.read_bytes() != payload:
            raise FileExistsError(f"Refusing to replace a different private module: {destination}")
        destination.write_bytes(payload)
        results.append({"name": name, "bytes": len(payload), "sha256": sha(payload)})
    print(json.dumps({
        "build": build,
        "versionManifestSha256": sha(version_bytes),
        "modules": results,
        "privateOutputRoot": str(output_root.relative_to(ROOT)).replace("\\", "/"),
    }, indent=2))


if __name__ == "__main__":
    main()
