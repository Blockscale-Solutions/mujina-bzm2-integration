# What may be published here

This repository is public. The work behind it draws on material that is not,
including vendor documentation under non-disclosure. This file is the rule that
decides what crosses.

It is short on purpose. A rule nobody can recite is a rule nobody applies.

## The rule

**Publish what we did, what we measured about our own software, and what we
decided. Do not publish anyone else's documents, their contents, or their
identity.**

Concretely, never in this repository:

1. **No proprietary documents.** Not copied, not attached, not converted, not
   summarised section by section.
2. **No verbatim quotes from material under non-disclosure**, and no
   paraphrase close enough that the original could be reconstructed from it.
3. **No naming of confidential sources.** Not filenames, not document titles,
   not page numbers. A claim that needs a citation gets an opaque id resolving
   to an internal ledger, the way the hardware reference does it.
4. **No host names, addresses, ssh targets, absolute paths or serial numbers.**
5. **No measurements** — temperatures, voltages, currents, hash rates,
   efficiencies — without an explicit decision to publish that specific figure.
   Characterising a vendor product's performance is a commercial question, not
   a technical one, and it is not made by whoever is writing the commit.

## What is therefore publishable, and is the point of the site

- Case identity, objectives, requirements, procedures, pass and fail criteria.
  We wrote them.
- Per-run status and timings. That a case passed at a time is not a
  measurement of anything but our own process.
- Defects in **our own** code, in our own words, including the reasoning that
  found them. Most of the worklog is this, and it is the most useful part.
- Method: how a test is built, why it is ordered the way it is, what a harness
  got wrong.

## Enforcement

`tools/check-public.sh` scans the publish set for confidentiality markers,
vendor document and part filenames, machine paths, host names, private
addresses and serial-number shapes. It runs in CI on every push and **fails the
deploy** rather than warning.

It cannot catch a paraphrase, and nothing can. It catches the mechanical leaks,
which are the ones that actually happen. The judgement calls are still
judgement calls, and rule 5 exists because the tempting ones all look like
rule 5.

## If in doubt

Do not publish it. The cost of leaving something out of a worklog is that a
worklog is slightly less interesting. The cost of the other mistake is not
symmetrical and is not recoverable.
