"""Audit packaged Android native strings without publishing endpoint values."""
from __future__ import annotations

from collections import Counter
from pathlib import Path
from urllib.parse import urlsplit
import hashlib
import ipaddress
import json
import re


ROOT = Path(__file__).resolve().parents[1]
LIB_ROOT = ROOT / "research/raw/android/unpacked/lib/arm64-v8a"
OUTPUT = ROOT / "research/evidence/android-native-endpoint-inspection.json"
PRIVATE_OUTPUT = ROOT / "research/raw/android/native-endpoint-candidates.json"
LIBRARIES = ("libil2cpp.so", "libtuanjie.so", "libxlua.so")
MIN_LENGTH = 4
MAX_LENGTH = 4096

ASCII_RUN = re.compile(rb"[\x20-\x7e]{4,}")
UTF16_RUN = re.compile(rb"(?:[\x20-\x7e]\x00){4,}")
URL = re.compile(r"https?://[^\s\x00<>\"']+", re.I)
TRAILING_URL_PUNCTUATION = ").,;]}"

KNOWN_STANDARDS = (
    "w3.org", "schemas.microsoft.com", "schemas.xmlsoap.org", "unicode.org",
    "iana.org", "ietf.org", "opengroup.org",
)
KNOWN_DOCUMENTATION = (
    "docs.unity3d.com", "docs.unity.cn", "github.com", "githubusercontent.com",
    "bitbucket.org", "llvm.org", "gnu.org", "chromium.org", "sourceware.org",
    "android.googlesource.com", "curl.se",
)
OBSERVED_MARKUP_HOSTS = {
    "www.css", "www.hortcut", "www.icon", "www.interpretation", "www.years",
    "www.world", "www.recent",
}
RESOURCE_MARKERS = (
    "asset", "bundle", "cdn", "download", "game_data", "manifest", "patch",
    "resource", "resversion", "version.json", "ab_info",
)
FRAGMENT_GROUPS = {
    "downloadStorage": ("_game_data_", "download", "persistentdatapath"),
    "bundleArtifacts": ("config.ab", "share.ab", "gamescript.ab", "_ab_info.json", "patches_info.json"),
    "platformRouting": ("platformcode", "downloadplatformcode", "resversion", "branchname"),
    "networkRouting": ("http://", "https://", "cdn", "host", "urlroot"),
    "publisherMarkers": ("qookka", "ejoy"),
}


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def bounded_strings(data: bytes, pattern: re.Pattern[bytes], encoding: str):
    """Return unique strings; reject giant binary runs instead of truncating them."""
    values = set()
    oversized = 0
    for match in pattern.finditer(data):
        raw = match.group(0)
        if len(raw) > MAX_LENGTH * (2 if encoding == "utf-16le" else 1):
            oversized += 1
            continue
        value = raw.decode(encoding, "strict")
        if len(value) >= MIN_LENGTH:
            values.add(value)
    return values, oversized


def normalized_urls(strings):
    values = set()
    for value in strings:
        for candidate in URL.findall(value):
            candidate = candidate.rstrip(TRAILING_URL_PUNCTUATION)
            parsed = urlsplit(candidate)
            if parsed.scheme.lower() in {"http", "https"} and parsed.hostname:
                values.add(candidate)
    return sorted(values)


def classify_url(value: str) -> str:
    parsed = urlsplit(value)
    host = (parsed.hostname or "").lower().rstrip(".")
    if host in {"localhost", "127.0.0.1", "::1"}:
        return "localhost"
    try:
        ipaddress.ip_address(host)
        plausible_host = True
    except ValueError:
        labels = host.split(".")
        plausible_host = (
            len(labels) >= 2 and len(host) <= 253
            and all(re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", label) for label in labels)
            and re.fullmatch(r"[a-z]{2,24}", labels[-1]) is not None
        )
    if not plausible_host:
        return "malformedOrNonDns"
    if any(host == suffix or host.endswith("." + suffix) for suffix in KNOWN_STANDARDS):
        return "standards"
    if any(host == suffix or host.endswith("." + suffix) for suffix in KNOWN_DOCUMENTATION):
        return "documentation"
    if host in OBSERVED_MARKUP_HOSTS:
        return "markupFragment"
    lowered = value.lower()
    if any(marker in lowered for marker in RESOURCE_MARKERS):
        return "resourceDownloadCandidate"
    return "otherExternal"


def fragment_counts(strings):
    lowered = [value.lower() for value in strings]
    return {
        group: {
            fragment: sum(fragment in value for value in lowered)
            for fragment in fragments
        }
        for group, fragments in FRAGMENT_GROUPS.items()
    }


def main():
    missing = [name for name in LIBRARIES if not (LIB_ROOT / name).is_file()]
    if missing:
        raise SystemExit("Missing packaged ARM64 libraries: " + ", ".join(missing))

    public_libraries = []
    private_libraries = []
    overall_classes = Counter()
    overall_url_hashes = set()
    for name in LIBRARIES:
        path = LIB_ROOT / name
        data = path.read_bytes()
        ascii_strings, oversized_ascii = bounded_strings(data, ASCII_RUN, "ascii")
        utf16_strings, oversized_utf16 = bounded_strings(data, UTF16_RUN, "utf-16le")
        all_strings = ascii_strings | utf16_strings
        urls = normalized_urls(all_strings)
        classes = Counter(classify_url(value) for value in urls)
        url_hashes = sorted(sha256_bytes(value.encode("utf-8")) for value in urls)
        candidate_hashes = sorted(
            sha256_bytes(value.encode("utf-8")) for value in urls
            if classify_url(value) == "resourceDownloadCandidate"
        )
        overall_classes.update(classes)
        overall_url_hashes.update(url_hashes)
        public_libraries.append({
            "name": name,
            "bytes": len(data),
            "sha256": sha256_bytes(data),
            "extraction": {
                "uniqueAsciiStrings": len(ascii_strings),
                "uniqueUtf16LeStrings": len(utf16_strings),
                "oversizedAsciiRunsRejected": oversized_ascii,
                "oversizedUtf16LeRunsRejected": oversized_utf16,
            },
            "literalUrls": {
                "total": len(urls),
                "classifications": {key: classes.get(key, 0) for key in (
                "standards", "documentation", "localhost",
                    "malformedOrNonDns", "markupFragment", "resourceDownloadCandidate", "otherExternal",
                )},
                "resourceCandidateSha256Commitments": candidate_hashes,
            },
            "fragmentHits": fragment_counts(all_strings),
        })
        private_libraries.append({
            "name": name,
            "sha256": sha256_bytes(data),
            "urls": [{"value": value, "classification": classify_url(value), "sha256": sha256_bytes(value.encode("utf-8"))} for value in urls],
        })

    candidate_count = overall_classes.get("resourceDownloadCandidate", 0)
    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_ANDROID_NATIVE_ENDPOINT_INSPECTION",
        "status": "RESOURCE_DOWNLOAD_CANDIDATES_REQUIRE_PRIVATE_REVIEW" if candidate_count else "NO_LITERAL_RESOURCE_DOWNLOAD_ENDPOINT_FOUND",
        "input": {
            "abi": "arm64-v8a",
            "libraryCount": len(public_libraries),
            "minimumStringLength": MIN_LENGTH,
            "maximumStringLength": MAX_LENGTH,
            "encodings": ["ASCII", "UTF-16LE"],
        },
        "libraries": public_libraries,
        "summary": {
            "literalUrls": sum(overall_classes.values()),
            "classifications": {key: overall_classes.get(key, 0) for key in (
                "standards", "documentation", "localhost",
                "malformedOrNonDns", "markupFragment", "resourceDownloadCandidate", "otherExternal",
            )},
            "distinctUrlCommitments": len(overall_url_hashes),
        },
        "privacy": {
            "publishedEndpointValues": 0,
            "privateCandidateInventory": str(PRIVATE_OUTPUT.relative_to(ROOT)).replace("\\", "/"),
            "privateInventorySha256": None,
        },
        "scope": "Deterministic printable-string extraction from the three packaged Android ARM64 native libraries. Values are not executed, decoded as managed metadata, or treated as network observations.",
        "limitations": [
            "Absence of a printable literal cannot exclude an encoded, encrypted, assembled, server-supplied or downloaded endpoint",
            "A URL marker classifies a string for review; it does not prove that the client uses it for Morimens resources",
            "Native string evidence does not supply Android combat bundles or establish formula parity with PC",
            "No gameplay, prediction or holdout credit",
        ],
        "nextEvidenceNeeded": "If no privately reviewed native candidate resolves the resource path, capture the client-defined DownLoad and _game_data_/DownLoad trees from a version-fingerprinted Android session.",
    }
    private = {
        "schemaVersion": 1,
        "kind": "MORIMENS_PRIVATE_ANDROID_NATIVE_ENDPOINT_INVENTORY",
        "libraries": private_libraries,
    }
    private_bytes = (json.dumps(private, indent=2, ensure_ascii=False) + "\n").encode("utf-8")
    PRIVATE_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    PRIVATE_OUTPUT.write_bytes(private_bytes)
    report["privacy"]["privateInventorySha256"] = sha256_bytes(private_bytes)
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({
        "status": report["status"],
        "libraries": len(public_libraries),
        "literalUrls": report["summary"]["literalUrls"],
        "resourceDownloadCandidates": candidate_count,
        "otherExternal": overall_classes.get("otherExternal", 0),
        "output": str(OUTPUT.relative_to(ROOT)),
    }, indent=2))


if __name__ == "__main__":
    main()
