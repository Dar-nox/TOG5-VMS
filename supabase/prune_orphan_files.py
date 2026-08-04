#!/usr/bin/env python3
"""Delete stored files that no record points at any more.

    TOG5_EMAIL=... TOG5_PASSWORD='...' python supabase/prune_orphan_files.py [--delete]

Without --delete it only lists what it would remove, which is the way to run it
first.

Rows and files are two separate stores, and deleting a row does not take its
file with it. That gap opens whenever records are removed in bulk — clearing
test data, most obviously — and the leftovers are invisible from inside the
app while still counting against the storage allowance.

Deliberately conservative: a file is only a candidate if no photo or document
row names it, *including* soft-deleted rows. Somebody who deletes a vehicle can
still change their mind, and the picture should still be there when they do.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

PROJECT_URL = os.environ.get("TOG5_SUPABASE_URL", "https://bwohklsdkinastyktcho.supabase.co")
ANON_KEY = os.environ.get(
    "TOG5_SUPABASE_ANON_KEY", "sb_publishable_L-HNRU3AIiF1QZ93GDZfRA_PHqbZrlI"
)

BUCKETS = ["vehicle-photos", "fuel-receipts", "maintenance-receipts", "maintenance-photos"]


def call(method: str, url: str, token: str, payload=None):
    body = json.dumps(payload).encode() if payload is not None else None
    headers = {"apikey": ANON_KEY, "Authorization": "Bearer %s" % token}
    if body:
        headers["Content-Type"] = "application/json"

    request = urllib.request.Request(url, data=body, headers=headers, method=method)

    try:
        with urllib.request.urlopen(request) as response:
            text = response.read().decode("utf-8", "replace")
            return response.status, (json.loads(text) if text.strip() else None)
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode("utf-8", "replace")


def sign_in(email: str, password: str) -> str:
    request = urllib.request.Request(
        "%s/auth/v1/token?grant_type=password" % PROJECT_URL,
        data=json.dumps({"email": email, "password": password}).encode(),
        headers={"apikey": ANON_KEY, "Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request) as response:
            return json.load(response)["access_token"]
    except urllib.error.HTTPError as error:
        raise SystemExit("could not sign in: %s\n%s"
                         % (error.code, error.read().decode("utf-8", "replace")))


def referenced_paths(token: str) -> set[str]:
    """Every storage path a record names, soft-deleted rows included."""
    paths: set[str] = set()

    for table in ["vehicle_photos", "vehicle_documents"]:
        status, rows = call(
            "GET", "%s/rest/v1/%s?select=storage_path" % (PROJECT_URL, table), token
        )
        if status != 200:
            raise SystemExit("could not read %s: %s %s" % (table, status, rows))

        paths.update(row["storage_path"] for row in rows if row.get("storage_path"))

    return paths


def stored_paths(token: str) -> list[str]:
    found: list[str] = []

    for bucket in BUCKETS:
        status, items = call(
            "POST", "%s/storage/v1/object/list/%s" % (PROJECT_URL, bucket), token,
            {"prefix": "", "limit": 1000, "sortBy": {"column": "name", "order": "asc"}},
        )
        if status != 200:
            raise SystemExit("could not list %s: %s %s" % (bucket, status, items))

        # A folder placeholder has no id and is not a file.
        found.extend("%s/%s" % (bucket, item["name"]) for item in items if item.get("id"))

    return found


def main() -> int:
    email = os.environ.get("TOG5_EMAIL")
    password = os.environ.get("TOG5_PASSWORD")

    if not email or not password:
        print("Set TOG5_EMAIL and TOG5_PASSWORD first.", file=sys.stderr)
        return 2

    delete = "--delete" in sys.argv[1:]
    token = sign_in(email, password)

    keep = referenced_paths(token)
    stored = stored_paths(token)
    orphans = sorted(path for path in stored if path not in keep)

    print("%d files stored, %d named by a record, %d unreferenced"
          % (len(stored), len(keep), len(orphans)))

    if not orphans:
        return 0

    for path in orphans:
        if not delete:
            print("  would delete %s" % path)
            continue

        bucket, _, name = path.partition("/")
        status, response = call(
            "DELETE", "%s/storage/v1/object/%s/%s" % (PROJECT_URL, bucket, name), token
        )

        if status == 200:
            print("  deleted %s" % path)
        else:
            print("  FAILED  %s: %s %s" % (path, status, response))

    if not delete:
        print("\nNothing was removed. Pass --delete to go ahead.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
