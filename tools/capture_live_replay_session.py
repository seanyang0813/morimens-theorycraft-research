"""Preserve an outcome-blind Morimens replay baseline or same-process delta.

Replay references and downloaded containers are always written below the
gitignored research/raw directory. Standard output contains counts and hashes,
never replay UUIDs or object names.
"""

from __future__ import annotations

import argparse
import ctypes as C
import hashlib
import json
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PRIVATE_ROOT = (ROOT / "research" / "raw").resolve()
UUID = re.compile(r"^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$")
PROCESS_QUERY_INFORMATION = 0x0400
PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
PROCESS_VM_READ = 0x0010
MEM_COMMIT = 0x1000
PAGE_GUARD = 0x100
PAGE_NOACCESS = 0x01
WINDOWS_EPOCH_100NS = 116444736000000000


class FILETIME(C.Structure):
    _fields_ = [("dwLowDateTime", C.c_ulong), ("dwHighDateTime", C.c_ulong)]


class MBI(C.Structure):
    _fields_ = [
        ("BaseAddress", C.c_void_p),
        ("AllocationBase", C.c_void_p),
        ("AllocationProtect", C.c_ulong),
        ("PartitionId", C.c_ushort),
        ("RegionSize", C.c_size_t),
        ("State", C.c_ulong),
        ("Protect", C.c_ulong),
        ("Type", C.c_ulong),
    ]


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def private_path(value: Path, label: str, *, must_exist: bool = False) -> Path:
    path = value.resolve()
    try:
        path.relative_to(PRIVATE_ROOT)
    except ValueError as error:
        raise ValueError(f"{label} must stay below gitignored research/raw") from error
    if must_exist and not path.is_file():
        raise FileNotFoundError(path)
    return path


def kernel32():
    if not hasattr(C, "WinDLL"):
        raise OSError("Live Morimens capture requires Windows")
    api = C.WinDLL("kernel32", use_last_error=True)
    api.OpenProcess.restype = C.c_void_p
    api.QueryFullProcessImageNameW.argtypes = [C.c_void_p, C.c_ulong, C.c_wchar_p, C.POINTER(C.c_ulong)]
    api.GetProcessTimes.argtypes = [C.c_void_p, C.POINTER(FILETIME), C.POINTER(FILETIME), C.POINTER(FILETIME), C.POINTER(FILETIME)]
    api.VirtualQueryEx.restype = C.c_size_t
    api.ReadProcessMemory.argtypes = [C.c_void_p, C.c_void_p, C.c_void_p, C.c_size_t, C.POINTER(C.c_size_t)]
    return api


def open_morimens(pid: int):
    if not isinstance(pid, int) or pid <= 0:
        raise ValueError("Positive Morimens PID required")
    api = kernel32()
    handle = api.OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_VM_READ, False, pid)
    if not handle:
        raise OSError(C.get_last_error(), "OpenProcess")
    try:
        capacity = C.c_ulong(32768)
        buffer = C.create_unicode_buffer(capacity.value)
        if not api.QueryFullProcessImageNameW(handle, 0, buffer, C.byref(capacity)):
            raise OSError(C.get_last_error(), "QueryFullProcessImageNameW")
        executable = Path(buffer.value).resolve()
        if executable.name.casefold() != "morimens.exe":
            raise ValueError("PID must identify Morimens.exe")
        created, exited, kernel, user = FILETIME(), FILETIME(), FILETIME(), FILETIME()
        if not api.GetProcessTimes(handle, C.byref(created), C.byref(exited), C.byref(kernel), C.byref(user)):
            raise OSError(C.get_last_error(), "GetProcessTimes")
        ticks = (created.dwHighDateTime << 32) | created.dwLowDateTime
        started = datetime.fromtimestamp((ticks - WINDOWS_EPOCH_100NS) / 10_000_000, timezone.utc).isoformat()
        metadata = {"pid": pid, "startedAtUtc": started, "executable": str(executable), "executableSha256": sha(executable.read_bytes())}
        return api, handle, metadata
    except Exception:
        api.CloseHandle(handle)
        raise


def scan(api, handle) -> tuple[dict[str, set[str]], int]:
    raw_uuid = rb"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"
    patterns = [
        ("object", re.compile(rb"publish/BattleReplay_" + raw_uuid + rb"\.json", re.I)),
        ("field", re.compile(rb"battleUuid[^0-9a-f]{0,64}" + raw_uuid, re.I)),
    ]
    found: dict[str, set[str]] = {}
    address = 0
    bytes_read = 0
    while address < 0x7FFFFFFFFFFF:
        mbi = MBI()
        if not api.VirtualQueryEx(handle, C.c_void_p(address), C.byref(mbi), C.sizeof(mbi)):
            break
        base, size = int(mbi.BaseAddress or 0), int(mbi.RegionSize)
        readable = mbi.State == MEM_COMMIT and not (mbi.Protect & (PAGE_GUARD | PAGE_NOACCESS))
        if readable and 0 < size <= 512 * 1024 * 1024:
            offset, tail = 0, b""
            while offset < size:
                amount = min(1024 * 1024, size - offset)
                buffer, got = C.create_string_buffer(amount), C.c_size_t()
                if api.ReadProcessMemory(handle, C.c_void_p(base + offset), buffer, amount, C.byref(got)) and got.value:
                    data = tail + buffer.raw[: got.value]
                    bytes_read += got.value
                    for suffix, candidate in (("", data), ("-wide", data.decode("utf-16le", "ignore").encode("ascii", "ignore"))):
                        for kind, pattern in patterns:
                            for match in pattern.finditer(candidate):
                                found.setdefault(match.group(1).decode().lower(), set()).add(kind + suffix)
                    tail = data[-512:]
                else:
                    tail = b""
                offset += amount
        address = base + max(size, 0x1000)
    return found, bytes_read


def ensure_reference_inventory(value) -> list[str]:
    if not isinstance(value, list) or value != sorted(set(value)) or any(not isinstance(item, str) or not UUID.fullmatch(item) for item in value):
        raise ValueError("Sorted unique replay-reference inventory required")
    return value


def assert_same_process(baseline: dict, metadata: dict) -> None:
    process = baseline.get("process", {})
    for key in ("pid", "startedAtUtc", "executableSha256"):
        if process.get(key) != metadata.get(key):
            raise ValueError("Live process does not match the private baseline")


def baseline_report(metadata: dict, found: dict[str, set[str]], bytes_read: int, captured_at: str) -> dict:
    return {"schemaVersion": 1, "kind": "MORIMENS_PRIVATE_REPLAY_SESSION_BASELINE", "capturedAtUtc": captured_at, "process": metadata, "bytesRead": bytes_read, "replayReferences": sorted(found)}


def public_summary(report: dict) -> dict:
    if report.get("kind") == "MORIMENS_PRIVATE_REPLAY_SESSION_BASELINE":
        return {"capturedAtUtc": report["capturedAtUtc"], "replayReferenceCount": len(report["replayReferences"]), "bytesRead": report["bytesRead"]}
    rows = report["results"]
    return {"capturedAtUtc": report["capturedAtUtc"], "baselineReferenceCount": report["baselineReferenceCount"], "currentReferenceCount": report["currentReferenceCount"], "newReferenceCount": report["newReferenceCount"], "validContainers": sum(row.get("validContainer") is True for row in rows), "containerHashes": [row["sha256"] for row in rows if row.get("privateFile")], "bytesRead": report["bytesRead"]}


def download_container(replay_uuid: str) -> tuple[bytes, str | None]:
    url = f"https://z1g-warreport.qookkagames.com/publish/BattleReplay_{replay_uuid}.json"
    request = urllib.request.Request(url, headers={"User-Agent": "Morimens-research-controlled-capture/2.0"})
    with urllib.request.urlopen(request, timeout=15) as response:
        return response.read(), response.headers.get("Last-Modified")


def container_json_encoding(data: bytes) -> str | None:
    """Identify the replay envelope without decoding its compressed battle data."""
    try:
        decoded = json.loads(data.decode("utf-8"))
        encoding = "utf8"
    except UnicodeDecodeError:
        try:
            decoded = json.loads(data.decode("latin-1"))
            encoding = "latin1"
        except json.JSONDecodeError:
            return None
    except json.JSONDecodeError:
        return None
    return encoding if isinstance(decoded, dict) and isinstance(decoded.get("compStr"), str) else None


def capture_baseline(pid: int, output_value: Path) -> dict:
    output = private_path(output_value, "Baseline output")
    if output.exists():
        raise FileExistsError("Refusing to overwrite session baseline")
    api, handle, metadata = open_morimens(pid)
    try:
        found, bytes_read = scan(api, handle)
    finally:
        api.CloseHandle(handle)
    report = baseline_report(metadata, found, bytes_read, datetime.now(timezone.utc).isoformat())
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    return report


def capture_delta(pid: int, baseline_value: Path, output_value: Path) -> dict:
    baseline_path = private_path(baseline_value, "Private baseline", must_exist=True)
    output = private_path(output_value, "Delta output")
    if output.exists():
        raise FileExistsError("Refusing to overwrite session delta")
    baseline_bytes = baseline_path.read_bytes()
    baseline = json.loads(baseline_bytes)
    if baseline.get("schemaVersion") != 1 or baseline.get("kind") != "MORIMENS_PRIVATE_REPLAY_SESSION_BASELINE":
        raise ValueError("Private session baseline required")
    before = set(ensure_reference_inventory(baseline.get("replayReferences")))
    api, handle, metadata = open_morimens(pid)
    try:
        assert_same_process(baseline, metadata)
        found, bytes_read = scan(api, handle)
    finally:
        api.CloseHandle(handle)
    rows = []
    for index, replay_uuid in enumerate(sorted(set(found) - before), 1):
        row = {"uuid": replay_uuid, "discovery": sorted(found[replay_uuid])}
        try:
            data, last_modified = download_container(replay_uuid)
            json_encoding = container_json_encoding(data)
            valid = json_encoding is not None
            row.update(httpStatus=200, bytes=len(data), sha256=sha(data), validContainer=valid, objectLastModified=last_modified)
            if json_encoding:
                row["jsonEncoding"] = json_encoding
            if last_modified:
                row["objectLastModifiedUtc"] = parsedate_to_datetime(last_modified).astimezone(timezone.utc).isoformat()
            if valid:
                container = output.parent / f"session-delta-{output.stem}-{index:02d}-container.json"
                if container.exists():
                    raise FileExistsError(container)
                container.write_bytes(data)
                row["privateFile"] = container.name
        except urllib.error.HTTPError as error:
            row["httpStatus"] = error.code
        except Exception as error:
            row["error"] = type(error).__name__
        rows.append(row)
    report = {"schemaVersion": 1, "kind": "MORIMENS_PRIVATE_REPLAY_SESSION_DELTA", "capturedAtUtc": datetime.now(timezone.utc).isoformat(), "privateBaselineSha256": sha(baseline_bytes), "process": metadata, "bytesRead": bytes_read, "baselineReferenceCount": len(before), "currentReferenceCount": len(found), "newReferenceCount": len(rows), "results": rows}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    return report


def main() -> None:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    baseline = sub.add_parser("baseline", help="Capture an ignored pre-battle replay inventory")
    baseline.add_argument("--pid", required=True, type=int)
    baseline.add_argument("--output", required=True, type=Path)
    delta = sub.add_parser("delta", help="Capture only references newly loaded by the same process")
    delta.add_argument("--pid", required=True, type=int)
    delta.add_argument("--baseline", required=True, type=Path)
    delta.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    report = capture_baseline(args.pid, args.output) if args.command == "baseline" else capture_delta(args.pid, args.baseline, args.output)
    print(json.dumps(public_summary(report)))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        sys.stderr.write(json.dumps({"status": "ERROR", "error": type(error).__name__, "message": str(error)}) + "\n")
        raise SystemExit(1)
