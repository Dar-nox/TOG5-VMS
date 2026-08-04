#!/usr/bin/env python3
"""Upload a desktop backup's photos and receipts into Supabase Storage.

    TOG5_EMAIL=owner@tog5vms.local TOG5_PASSWORD='...' \
      python supabase/upload_migration_files.py <backup-dir> migration-files.tsv

Reads the credential from the environment on purpose. It signs in as a normal
user and uploads under that person's own permission, so the access rules still
apply — rather than using a service key, which bypasses every rule in the
project and would have to be handed around to get here.

The object names come from the list the load script wrote, so what lands in
Storage matches what the database rows already point at. Anything already
uploaded is skipped, which makes a second run safe after a failure halfway.

Nothing is compressed. The app shrinks new photos on the way up, but these are
the client's originals and are worth keeping at full quality — all twelve come
to about 36 MB against a 1 GB allowance.
"""

from __future__ import annotations

import json
import mimetypes
import os
import sys
import urllib.error
import urllib.request

PROJECT_URL = os.environ.get("TOG5_SUPABASE_URL", "https://bwohklsdkinastyktcho.supabase.co")
ANON_KEY = os.environ.get(
    "TOG5_SUPABASE_ANON_KEY", "sb_publishable_L-HNRU3AIiF1QZ93GDZfRA_PHqbZrlI"
)


def request(method: str, url: str, token: str, body: bytes | None = None,
            content_type: str | None = None) -> tuple[int, bytes]:
    headers = {"apikey": ANON_KEY, "Authorization": "Bearer %s" % token}
    if content_type:
        headers["Content-Type"] = content_type

    attempt = urllib.request.Request(url, data=body, headers=headers, method=method)

    try:
        with urllib.request.urlopen(attempt) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()


def sign_in(email: str, password: str) -> str:
    url = "%s/auth/v1/token?grant_type=password" % PROJECT_URL
    body = json.dumps({"email": email, "password": password}).encode()
    attempt = urllib.request.Request(
        url, data=body, method="POST",
        headers={"apikey": ANON_KEY, "Content-Type": "application/json"},
    )

    try:
        with urllib.request.urlopen(attempt) as response:
            return json.load(response)["access_token"]
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", "replace")
        raise SystemExit("could not sign in: %s\n%s" % (error.code, detail))


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__, file=sys.stderr)
        return 2

    backup, listing = sys.argv[1], sys.argv[2]
    email = os.environ.get("TOG5_EMAIL")
    password = os.environ.get("TOG5_PASSWORD")

    if not email or not password:
        print("Set TOG5_EMAIL and TOG5_PASSWORD first.", file=sys.stderr)
        return 2

    token = sign_in(email, password)
    print("signed in as %s" % email)

    uploaded = skipped = failed = 0

    with open(listing, encoding="utf-8") as handle:
        for line in handle:
            source, destination = line.rstrip("\n").split("\t")
            bucket, _, name = destination.partition("/")

            # The backup holds the files under files/<folder>/, whatever
            # absolute path the desktop recorded for them.
            local = os.path.join(backup, "files", bucket, os.path.basename(source))

            if not os.path.exists(local):
                print("  missing  %s" % local)
                failed += 1
                continue

            with open(local, "rb") as source_file:
                payload = source_file.read()

            content_type = mimetypes.guess_type(local)[0] or "application/octet-stream"
            url = "%s/storage/v1/object/%s/%s" % (PROJECT_URL, bucket, name)
            status, response = request("POST", url, token, payload, content_type)

            if status in (200, 201):
                print("  uploaded %s (%.1f MB)" % (destination, len(payload) / 1048576))
                uploaded += 1
            elif status == 409:
                print("  already  %s" % destination)
                skipped += 1
            else:
                print("  FAILED   %s: %s %s" % (destination, status,
                                                response.decode("utf-8", "replace")[:200]))
                failed += 1

    print("\n%d uploaded, %d already there, %d failed" % (uploaded, skipped, failed))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
