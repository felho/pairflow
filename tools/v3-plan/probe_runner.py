#!/usr/bin/env python3
"""Mutation-probe runner — R-DERIVED-PROBES' execution protocol
(adopted at the ch12 boundary; the self-report gap raised by the owner).

Every builder mutation probe runs THROUGH this tool, never by hand:

  1. the target file is backed up by BYTE COPY into the receipts dir
     (git-independent — git-based restore is FORBIDDEN for mutation
     rollback: git knows the committed state, not uncommitted work;
     three live incidents),
  2. the caller-supplied MUTATED variant replaces the target,
  3. the test command runs; its FULL output is captured to a receipt
     log file,
  4. the target is restored FROM THE BACKUP COPY and the restore is
     verified by byte comparison — a mismatch is a LOUD failure that
     leaves the backup in place,
  5. a receipt JSON is written; the Build-record probe table cites it
     by probe id. The receipt is the machine evidence the arm's
     spot-check audits — never the builder's prose.

Exit codes: 0 = probe ran, the suite went RED, restore byte-verified
(the expected outcome); 3 = the suite STAYED GREEN (a blind probe — a
build-time finding; receipt still written, restore verified); 2 =
usage error (missing file, no-op mutation); 4 = restore verification
FAILED (backup preserved at the printed path — recover before
anything else).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def files_identical(a: Path, b: Path) -> bool:
    return a.read_bytes() == b.read_bytes()


# module-level seam so the selftest can drive the restore-failure path
_restore_copy = shutil.copyfile


def run_probe(
    probe_id: str,
    target: Path,
    mutated: Path,
    test_command: str,
    receipts_dir: Path,
    cwd: Path,
) -> int:
    if not target.is_file() or not mutated.is_file():
        print(f"probe-runner FAIL [{probe_id}]: target/mutated file missing")
        return 2
    if files_identical(target, mutated):
        print(
            f"probe-runner FAIL [{probe_id}]: mutated variant is byte-identical "
            f"to the target — a no-op mutation proves nothing"
        )
        return 2

    receipts_dir.mkdir(parents=True, exist_ok=True)
    backup = receipts_dir / f"{probe_id}.backup"
    out_file = receipts_dir / f"{probe_id}.out"
    receipt_file = receipts_dir / f"{probe_id}.receipt.json"

    original_digest = digest(target)
    shutil.copyfile(target, backup)
    shutil.copyfile(mutated, target)
    try:
        with out_file.open("wb") as out:
            proc = subprocess.run(
                test_command, shell=True, cwd=cwd, stdout=out, stderr=subprocess.STDOUT
            )
        exit_code = proc.returncode
    finally:
        _restore_copy(backup, target)

    restore_verified = files_identical(target, backup) and digest(target) == original_digest
    receipt = {
        "probe_id": probe_id,
        "file": str(target),
        "original_sha256": original_digest,
        "mutated_sha256": digest(mutated),
        "test_command": test_command,
        "exit_code": exit_code,
        "suite_red": exit_code != 0,
        "output_file": str(out_file),
        "restore_verified": restore_verified,
    }
    receipt_file.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")

    if not restore_verified:
        print(
            f"probe-runner FAIL [{probe_id}]: RESTORE VERIFICATION FAILED — the "
            f"working tree may still carry the mutation; backup preserved at "
            f"{backup}"
        )
        return 4
    if exit_code == 0:
        print(
            f"probe-runner [{probe_id}]: suite stayed GREEN under the mutation — "
            f"a BLIND probe (build-time finding); receipt: {receipt_file}"
        )
        return 3
    print(
        f"probe-runner [{probe_id}]: observed RED (exit {exit_code}), restore "
        f"byte-verified; receipt: {receipt_file}"
    )
    return 0


def selftest() -> int:
    global _restore_copy
    failures: list[str] = []

    def expect(label: str, cond: bool) -> None:
        if not cond:
            failures.append(label)

    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        target = root / "mod.txt"
        mutated = root / "mod.mutated.txt"
        receipts = root / "receipts"
        target.write_text("original\n", encoding="utf-8")
        mutated.write_text("mutated\n", encoding="utf-8")

        # red path: mutation makes the "suite" fail -> 0, restored, receipt
        code = run_probe("p-red", target, mutated, "exit 1", receipts, root)
        expect("red-path-exit-0", code == 0)
        expect("red-path-target-restored", target.read_text() == "original\n")
        receipt = json.loads((receipts / "p-red.receipt.json").read_text())
        expect("red-path-receipt-suite-red", receipt["suite_red"] is True)
        expect("red-path-receipt-restore-ok", receipt["restore_verified"] is True)
        expect("red-path-output-captured", (receipts / "p-red.out").exists())

        # blind path: suite stays green -> 3, still restored + receipted
        code = run_probe("p-green", target, mutated, "exit 0", receipts, root)
        expect("green-path-exit-3", code == 3)
        expect("green-path-target-restored", target.read_text() == "original\n")
        receipt = json.loads((receipts / "p-green.receipt.json").read_text())
        expect("green-path-receipt-suite-not-red", receipt["suite_red"] is False)

        # no-op mutation -> 2 (proves nothing)
        noop = root / "mod.noop.txt"
        noop.write_text("original\n", encoding="utf-8")
        expect("noop-mutation-exit-2", run_probe("p-noop", target, noop, "exit 1", receipts, root) == 2)

        # adversarial: the restore-failure path must go LOUD (exit 4);
        # driven by disabling the restore seam in-process
        _restore_copy = lambda src, dst: None  # noqa: E731
        try:
            code = run_probe("p-tamper", target, mutated, "exit 1", receipts, root)
        finally:
            _restore_copy = shutil.copyfile
        expect("restore-failure-exit-4", code == 4)
        receipt = json.loads((receipts / "p-tamper.receipt.json").read_text())
        expect("restore-failure-receipted", receipt["restore_verified"] is False)
        # recover the fixture from the preserved backup (the tool's own advice)
        shutil.copyfile(receipts / "p-tamper.backup", target)
        expect("backup-recovers-target", target.read_text() == "original\n")

        # files_identical is able to fail (the verify claim's negative)
        expect("files-identical-negative", files_identical(target, mutated) is False)

    if failures:
        print(f"probe-runner selftest: {len(failures)} failure(s): {failures}")
        return 1
    print("probe-runner selftest: 12 case(s) exercised, 0 failure(s)")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--probe-id")
    parser.add_argument("--file", dest="target")
    parser.add_argument("--mutated", help="path to the mutated variant of --file")
    parser.add_argument("--test", help="shell command whose RED proves the probe")
    parser.add_argument("--receipts-dir")
    parser.add_argument("--cwd", default=".")
    parser.add_argument("--selftest", action="store_true")
    args = parser.parse_args()
    if args.selftest:
        return selftest()
    required = [args.probe_id, args.target, args.mutated, args.test, args.receipts_dir]
    if any(v is None for v in required):
        parser.print_usage()
        return 2
    return run_probe(
        args.probe_id,
        Path(args.target),
        Path(args.mutated),
        args.test,
        Path(args.receipts_dir),
        Path(args.cwd),
    )


if __name__ == "__main__":
    sys.exit(main())
