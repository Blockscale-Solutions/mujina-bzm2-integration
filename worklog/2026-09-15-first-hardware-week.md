# Bringing Mujina up on real BZM2 hardware

*2026-09-15*

The driver had been written and reviewed but never run against silicon. This
week it was, on an RDS 2.0 control board, and the interesting part is not that
it worked. It is what running it found.

## Five defects, and four of them were ours

The bench exists to find defects in the part. It found defects in our test
harness first, then in our daemon, and the vendor stack was not implicated in
any of them.

**A launcher that did not exist.** The harness started the daemon with a detach
helper the target's shell does not provide, and sent its own error output to
nowhere. So a program that was never launched reported itself as "the daemon
produced no output" — a true statement about the wrong thing. Keeping a
launcher's error output costs one line and would have saved an afternoon.

**A liveness check that could only answer one way.** The busybox on this target
matches process names against the whole command line, so the check was false
for every daemon ever started with arguments. Every liveness test in the
harness had been answering "not running", including a stop-confirmation that
could therefore only ever report success. The same defect was present in three
more scripts. Liveness now reads the process name directly, which is exact and
cannot match the shell doing the asking.

**A counter that scored formatting as information.** To decide which log level
is worth running, we count distinct *message shapes* — a line with its numbers
and hex literals replaced — so half a million lines reporting different values
collapse to the one statement that produced them. The counter collapsed numbers
but not whitespace, so a table printed with different column padding counted as
several different statements.

It was caught only because it produced an impossible ordering: a lower log
level appearing to carry more distinct information than a higher one. Had the
inflation been ten percent rather than an inversion, it would have been
believed. That is the uncomfortable part.

**A cap that guarded the wrong thing.** Debug captures are capped so they cannot
exhaust the target's memory, and the cap watched the capture file. The daemon
also writes every line to the system log, in the same filesystem. A run that
believed it had spent a third of the budget had spent two thirds of it. The cap
measured the artifact when the constraint was the filesystem.

**A board destroyed milliseconds after being created.** This one was in the
daemon rather than the harness. Boards can be discovered through a transport or
attached from configuration. The event loop that services transports returns
immediately when there are none — which is the normal case for an embedded
deployment with discovery compiled out — and the task that owned it then tore
down every configured board. The daemon stayed up and served an empty board
list, so nothing looked broken until something asked it for a board.

## A protective check that disabled protection

The most instructive failure of the week was a fix.

Telemetry frames carry a device address. After taking over a chain that another
controller was already driving, our first read lands mid-stream rather than on
a frame boundary, and the parser produced readings attributed to a device
outside the chain, a die temperature below ambient, and a hardware fault that
never happened. A fabricated fault is the worst of the three, because the
natural response to a fault is to power something down.

So we added a check: ignore frames from devices the chain does not contain.
Correct for telemetry, where publishing a reading from a device we do not have
turns a framing error into a plausible measurement.

It was wrong on the fault path, twice, in one day.

The first version discarded such frames outright, which would suppress a real
over-temperature trip from a device we were simply not configured for. One bug
fabricates faults; the other hides them. Corrected to escalate loudly instead
of acting.

The second version looked right and was worse. The configured chain carries
addresses that are global across several buses, while the wire reports
addresses local to each bus. On the first bus the two coincide, which is
exactly the configuration the bench runs and every test covers. On any bus
after the first they diverge completely, so every genuine frame read as
out-of-chain and over-temperature shutdown was disabled for most of the
machine, with a log line as the only symptom.

The check is now off the fault path entirely. An asserted fault is acted on
wherever it claims to come from, and an unrecognised address is reported as
evidence that the line or the configuration is wrong rather than used as a
reason to do nothing.

**Between a spurious stop and a missing stop, the spurious stop is the safe
failure.** It is visible, recoverable, and costs a restart. A missing stop
costs silicon. That rule is now written down, because we got it wrong while
believing we were applying it — the principle "an unknown reading must be
treated as the dangerous case" had been written into an issue the day before.

The underlying address mismatch is filed and will be fixed properly, at which
point the check can return, because it will mean what it says.

## What made the difference

Two things, neither of them clever.

**Escalating cost deliberately.** The log-level survey runs cheapest first. The
first three harness defects surfaced on a run that produced nineteen lines and
cost four minutes. The same defects found on the largest run would have cost a
capture the size of the target's memory and the run it was measuring.

**Being able to test without the hardware.** Two experiments were burned on
defects in a shell script before the harness grew a mode that runs everything
except the part needing powered hardware. After that, the same class of defect
cost seconds. One attempt per power cycle is too expensive a way to debug a
shell script, and it took paying it twice to act on that.

## Next

The test matrix on this site shows where each case stands. The short version:
the vendor stack is characterised for everything except sustained hashing, our
daemon attaches to a real chain and reads it, and the remaining gap before we
can drive the hardware ourselves is an interlock that refuses to dispatch work
we cannot thermally protect. That is specified and not yet built, and nothing
hashes under our control until it is.
