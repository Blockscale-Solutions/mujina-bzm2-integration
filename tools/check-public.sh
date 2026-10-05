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

# A scan with named exceptions: a line passes only when every match on it is an allowed exact string. The sed
# expression deletes the allowed strings (bounded, so a longer string that merely begins with one still
# matches), and the line is tested again. So an allowed string never licenses a second match beside it.
scan_except() { # label, extended-regex, sed -E expression deleting the allowed strings
    local label=$1 re=$2 strip=$3 out
    out=$(grep -rInE --binary-files=without-match "$re" "$dir" --exclude-dir=.git --exclude=check-public.sh \
            2>/dev/null | while IFS= read -r l; do
                text=${l#*:*:}
                printf '%s' "$text" | sed -E "$strip" | grep -qE "$re" && printf '%s\n' "$l"
            done || true)
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
# QEMU's user-mode network is a fixed constant of QEMU, not a network of ours: the guest is 10.0.2.15 and its
# gateway 10.0.2.2, and image tests name them (the UX session's imagebuilder, 2026-09-28). Those two exact
# addresses pass; any other 10.x, including 10.0.2.150, does not.
scan_except "hosts, private addresses, ssh targets" \
     '(littledoctor|razorclam|192\.168\.[0-9]+\.[0-9]+|10\.[0-9]+\.[0-9]+\.[0-9]+|root@)' \
     's/(^|[^0-9.])10\.0\.2\.(2|15)(\.?([^0-9.]|$))/\1\3/g'
# ronald@ is an ssh target or a personal address, except the one public commit identity (Ronald, 2026-09-28:
# commits come from ronald@reckless.systems). A line passes only if every ronald@ on it is that address.
scan_except "ronald@ addresses other than the public commit identity" 'ronald@' 's/ronald@reckless\.systems//g'
scan "serial-number shapes" \
     '\b[A-Z]{2,4}[0-9]{6,}\b'
# A pool username IS the payout address, and Mujina logs it on accepted
# shares. Anything built from mining-run logs can carry one; it must not ship.
# Two published test vectors pass as those exact strings: BIP-173's example address and the genesis block's
# coinbase address, which an address-masking test needs as input (the UX session's device UI, 2026-09-28). They
# belong to nobody here. Every other address still fails.
scan_except "bitcoin addresses" \
     '\b(bc1[ac-hj-np-z02-9]{11,71}|BC1[AC-HJ-NP-Z02-9]{11,71}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b' \
     's/\b(bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4|1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa)\b//g'
# PERFORMANCE FIGURES. Ronald, 2026-09-28: no performance CLAIMS before the first multi-day run (at least
# 48 hours); then, the same day: "test-reported J/TH and hashrate figures are fine, as long as they're
# attached to a specific test, and not advertised as Mujina on RDS final performance numbers."
# So a line carrying a hashing or efficiency figure passes only when that same line cites a specific test
# (a case id such as MJ-HASH-08, or a run id such as 20260928T155333Z) and frames nothing as final. A
# citation elsewhere on the page does not license a bare headline number, so the check is per line.
FIGURE='[0-9][0-9.,]*[[:space:]]*(-[[:space:]]*[0-9][0-9.,]*[[:space:]]*)?([KMGTPE]H/s|J/TH|W/TH|J/GH|W/GH)\b'
CITED='\b(MJ|RDS)-[A-Z0-9]+-[0-9]+\b|\b20[0-9]{6}T[0-9]{6}Z\b'
FINAL='\b([Ff]inal|[Hh]eadline|[Uu]p to|[Pp]eak|[Mm]ax(imum)?|[Rr]ecord|[Bb]est|[Gg]uaranteed)\b'
out=$(grep -rInE --binary-files=without-match "$FIGURE" "$dir" --exclude-dir=.git --exclude=check-public.sh \
        2>/dev/null | while IFS= read -r l; do
            text=${l#*:*:}
            if ! printf '%s' "$text" | grep -qE "$CITED" || printf '%s' "$text" | grep -qE "$FINAL"; then
                printf '%s\n' "$l"
            fi
        done || true)
if [ -n "$out" ]; then
    printf '\n[%s]\n' "performance figures not tied to a specific test, or framed as final" >&2
    printf '%s\n' "$out" | head -20 | while IFS= read -r l; do hit "$l"; done
    fail=1
fi
scan "internal ledger" \
     '(CLAIMS-INTERNAL|claim ledger resolves|internal ledger.*file:line)'

if [ "$fail" -ne 0 ]; then
    printf '\nREFUSING TO PUBLISH: %s carries material that must not leave.\n' "$dir" >&2
    printf 'Each finding above is a file, a line number and the text. Fix the source, not this check.\n' >&2
    exit 1
fi
printf 'publication check passed: %s\n' "$dir"
