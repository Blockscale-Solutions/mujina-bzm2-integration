# RDS 2.0 notes (public)

Public, publish-safe notes about the RDS 2.0 control board topology used in the Mujina BZM2 bring-up.

## Topology we discuss publicly

- **Control board** — host/MCU, fan headers, power input, chain UART toward hashboards
- **PSU** — system power into the control board
- **Fans** — PWM / sense from the control board
- **Hashboards** — BZM2 ASIC boards on the chain (shown as seats HB0–HB2 in the schematic)

## Drawings

Original schematics live in this repository:

- [`drawings/rds/`](../../drawings/rds/) — SVG source + README (schematic ≠ photo)
- [`site/rds-viz/`](../../site/rds-viz/) — interactive page on the public site

Do not paste vendor documents, NDA figures, serials, host names, or measurements here. See [`PUBLISHING.md`](../../PUBLISHING.md).

Hardware reference material that is already public may be cited by link (for example [`bzm2-hwref`](https://github.com/Blockscale-Solutions/bzm2-hwref)); redraw topology as original schematic art rather than copying figures.
