# Mujina BZM2 integration

Bringing up the [Mujina](https://github.com/256foundation/mujina) mining daemon
on Intel Blockscale BZM2 hardware, starting with the RDS 2.0 control board.

**Live site (story, worklog, matrix, RDS schematic): https://blockscale-solutions.github.io/mujina-bzm2-integration/**

This repository is the public face of that work: the validation test matrix,
its live results, and a worklog. The driver itself is developed elsewhere and
will reach Mujina as pull requests.

## What is here

| path | what |
| --- | --- |
| `site/` | the published site, deployed to Pages on every push to `main` |
| `site/data/campaign-status.json` | live per-case status and timings, regenerated from test artifacts |
| `site/data/test-cases-index.json` | case objectives, procedures and pass criteria |
| `worklog/` | narrative notes on the work |
| `site/rds-viz/` | RDS 2.0 control-board schematic |
| `drawings/rds/` | SVG schematic sources |
| `docs/rds/` | public topology notes |
| `tools/check-public.sh` | the publication guard, run in CI |

## How the results get here

Every test run writes an artifact directory with a computed result. A generator
reads those artifacts and the case records and produces the two JSON files
above. Nothing on this site is typed by hand, which is the point: a dashboard
that can disagree with its evidence is worse than no dashboard.

A case with no artifact shows as not executed. There is no overall percentage
and no summary flag anywhere on the site, deliberately — the set of case ids
present is the fact.

## What is deliberately not here

Measurements, temperatures, voltages, serial numbers, host names and file
paths. Status and timings are published; numbers are not.

That is not modesty about the data. It is that this repository is public and
the work draws on material that is not, so the publishable set is defined by a
rule rather than by judgement in the moment. See
[`PUBLISHING.md`](PUBLISHING.md), and note that the rule is enforced by a check
that fails the deploy rather than by anybody remembering.

## Related

- [`bzm2-hwref`](https://github.com/Blockscale-Solutions/bzm2-hwref) — hardware
  reference documentation for the BZM2 ASIC ([Pages](https://blockscale-solutions.github.io/bzm2-hwref/))
- [Mujina](https://github.com/256foundation/mujina) — the mining firmware

## Provenance of the site code

The matrix page, theme and status loader began as an internal lab dashboard and
were adapted here for this firmware bring-up. Same authors, different hardware.
Domain-specific storage-lab chrome has been removed; what carried over is the
phase/case status renderer, the theme, and the publish pipeline.
