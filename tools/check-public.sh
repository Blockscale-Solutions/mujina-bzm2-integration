#!/usr/bin/env bash
# Refuse to publish anything carrying material that must not leave.
#
#   check-public.sh <dir>        exits non-zero on the first finding
#
# This is a gate, not a review. A class of leak that has to be caught by
# somebody remembering will eventually ship, so it is checked on every publish
# and the publish fails rather than warns.
#
# What it looks for, and why each one:
#   - confidentiality markers, the most obvious and the easiest to paste in
#   - vendor document and part filenames, which identify a source even when the
#     text around them is ours
#   - absolute paths from either of our machines, which leak layout and names
#   - host names, private addresses and ssh targets
#   - serial numbers
#   - the internal claim ledger, which resolves opaque ids to real sources
#
# It cannot catch a paraphrase of something confidential. Nothing can. It
# catches the mechanical leaks, which are the ones that actually happen.
set -euo pipefail
dir=${1:?directory to check}
[ -d "$dir" ] || { echo "no such directory: $dir" >&2; exit 2; }
fail=0
hit() { printf '  %s\n' "$*" >&2; fail=1; }

scan() { # label, extended-regex
    local label=$1 re=$2 out
    out=$(grep -rInE --binary-files=without-match "$re" "$dir" \
            --exclude-dir=.git --exclude=check-public.sh 2>/dev/null || true)
    if [ -n "$out" ]; then
        printf '\n[%s]\n' "$label" >&2
        printf '%s\n' "$out" | head -20 | while IFS= read -r l; do hit "$l"; done
        fail=1
    fi
}

scan "confidentiality markers" \
     '(INTEL CONFIDENTIAL|CONFIDENTIAL AND PROPRIETARY|DO ?NOT ?SHARE|NDA[- ]only|Intel Corporation)'
scan "vendor document or part filenames" \
     '\b(MFI[0-9]+|IM9[0-9]+|BZM[0-9]_[A-Za-z0-9_]+|bzm_[0-9]+i[0-9]+)[A-Za-z0-9_.-]*'
scan "absolute paths from our machines" \
     '(/home/ronald|/srv/storage|C:\\\\Users|OneDrive|reckless-worklog|bzm2-proprietary)'
# "bonanza" is NOT here: Ronald cleared it on 2026-09-23 as a generic
# hostname, fine to publish. The unit's name is how every case record and run
# path refers to it; scrubbing it would make the published records say less.
scan "hosts, private addresses, ssh targets" \
     '(littledoctor|razorclam|192\.168\.[0-9]+\.[0-9]+|10\.[0-9]+\.[0-9]+\.[0-9]+|root@|ronald@)'
scan "serial-number shapes" \
     '\b[A-Z]{2,4}[0-9]{6,}\b'
# A pool username IS the payout address, and Mujina logs it on accepted
# shares. Anything built from mining-run logs can carry one; it must not ship.
scan "bitcoin addresses" \
     '\b(bc1[ac-hj-np-z02-9]{11,71}|BC1[AC-HJ-NP-Z02-9]{11,71}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b'
scan "internal ledger" \
     '(CLAIMS-INTERNAL|claim ledger resolves|internal ledger.*file:line)'

if [ "$fail" -ne 0 ]; then
    printf '\nREFUSING TO PUBLISH: %s carries material that must not leave.\n' "$dir" >&2
    printf 'Each finding above is a file, a line number and the text. Fix the source, not this check.\n' >&2
    exit 1
fi
printf 'publication check passed: %s\n' "$dir"
