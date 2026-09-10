import {v4 as uuidv4} from "uuid";

import type {LogicPin} from "./LogicPin";
import {LogicState} from "./LogicState";
import {bitMask} from "../util/bits";

/**
 * The pins joined to one line, and what that line is called.
 *
 * A name picks out at most one net, within one board only.
 *
 * LogicPin is typed rather than imported, so nothing here runs before that module exists.
 */
class Net {
  readonly uuid: string = uuidv4();

  /** Empty until the user names it. A net may be unnamed, and a name may outlive its driver. */
  name: string = "";

  /** Pins that only put a value on the line. */
  readonly sources = new Set<LogicPin>();
  /** Pins that only read it. */
  readonly sinks = new Set<LogicPin>();
  /** Pins that do both. The three sets are disjoint: a pin is in exactly one. */
  readonly both = new Set<LogicPin>();

  /**
   * Lines this one is part of by construction rather than by a wire.
   *
   * A subcomponent's pin and the line it answers to inside are one line, and nothing a user does
   * outside should be able to take that apart — so unlike a join made by a wire, a bond is not
   * derived from anything that can be deleted.
   */
  readonly bonded = new Set<Net>();

  get members(): LogicPin[] {
    return [...this.sources, ...this.sinks, ...this.both];
  }

  /**
   * Every net joined to this one, itself included.
   *
   * A wire between two pins that each already belong to a line joins those lines rather than
   * moving a pin off one of them. Nothing records the join: it *is* the wires, so deleting one
   * unjoins exactly what it joined, two wires between the same pair keep them joined until both
   * are gone, and a line inside a subcomponent cannot be taken apart by anything done outside it.
   */
  get family(): Net[] {
    const found = new Set<Net>([this]);
    const pending: Net[] = [this];

    while (pending.length > 0) {
      const net = pending.pop()!;
      const reach = (across: Net | undefined) => {
        if (across && !found.has(across)) {
          found.add(across);
          pending.push(across);
        }
      };

      net.bonded.forEach(reach);
      for (const pin of net.members) {
        for (const connection of pin.connections.values()) {
          reach(connection.source === pin ? connection.sink.net : connection.source.net);
        }
      }
    }

    return [...found];
  }

  /** Every pin on the line, wherever along it that is. */
  get line(): LogicPin[] {
    return this.family.flatMap(net => net.members);
  }

  /** Everything putting a value on the line, wherever along it that is. */
  get drivers(): LogicPin[] {
    return this.family.flatMap(net => [...net.sources, ...net.both]);
  }

  /** Everything reading it. */
  get listeners(): LogicPin[] {
    return this.family.flatMap(net => [...net.sinks, ...net.both]);
  }

  /**
   * What the line answers to, asked of the whole of it.
   *
   * A join leaves each net its own name, so a name stays a property of one line on one board and
   * instances of a subcomponent cannot come to share one. Which of them the line goes by is the
   * rule it has always been: the driver owns the name, so a driven line is called whatever the
   * driver's own net is called and nothing at all if that is unnamed. A line still waiting for a
   * driver keeps the name it was given while it waited.
   */
  get lineName(): string {
    const family = this.family;
    const driven = family.filter(net => net.sources.size > 0 || net.both.size > 0);

    return driven.length > 0
        ? driven.find(net => net.name)?.name ?? ""
        : family.find(net => net.name)?.name ?? "";
  }

  get size(): number {
    return this.sources.size + this.sinks.size + this.both.size;
  }

  has(pin: LogicPin): boolean {
    return this.sources.has(pin) || this.sinks.has(pin) || this.both.has(pin);
  }

  private groupFor(pin: LogicPin): Set<LogicPin> {
    // A pin that only carries the line reads it like any other listener. What it puts on the line
    // is decided elsewhere — inside the subcomponent it is the outside of.
    if (pin.drives && !pin.passive) {
      return pin.listens ? this.both : this.sources;
    }

    return this.sinks;
  }

  /**
   * Makes this line and another one line, permanently.
   *
   * Used where two lines are the same line by construction — the two sides of a subcomponent's
   * pin — rather than because something was wired.
   */
  bond(other: Net) {
    if (other === this) {
      return;
    }

    this.bonded.add(other);
    other.bonded.add(this);
  }

  /** Takes the pin off whatever net it was on first, so a pin is never on two. */
  add(pin: LogicPin) {
    pin.net?.remove(pin);
    this.groupFor(pin).add(pin);
    pin.net = this;
  }

  /**
   * What the line settles to, weighing every driver on it.
   *
   * Per channel: whatever is driven strongly decides, and only where nothing is does a weak driver
   * get to. Drivers that disagree at the deciding strength give an unknown, and a channel nobody
   * drives floats.
   */
  resolve(): LogicState {
    const drivers = this.drivers;
    const [any] = this.members;
    const mask = any ? bitMask(any.width) : 0;

    if (drivers.length === 0) {
      return new LogicState({z: mask});
    }
    if (drivers.length === 1) {
      return drivers[0].driven;
    }

    let strongOne = 0, strongZero = 0, strongX = 0;
    let weakOne = 0, weakZero = 0, weakX = 0;

    for (const pin of drivers) {
      const {v, x, z, w} = pin.driven;
      const driving = ~z & mask;
      const strongly = driving & ~w;
      const weakly = driving & w;

      strongOne |= v & ~x & strongly;
      strongZero |= ~v & ~x & strongly;
      strongX |= x & strongly;
      weakOne |= v & ~x & weakly;
      weakZero |= ~v & ~x & weakly;
      weakX |= x & weakly;
    }

    const strongly = strongOne | strongZero | strongX;
    const weakly = weakOne | weakZero | weakX;
    const byWeak = weakly & ~strongly;
    const strongClash = (strongOne & strongZero) | strongX;
    const weakClash = (weakOne & weakZero) | weakX;

    const x = ((strongly & strongClash) | (byWeak & weakClash)) & mask;

    return new LogicState({
      v: ((strongOne & ~strongClash) | (weakOne & byWeak & ~weakClash)) & mask & ~x,
      x,
      z: mask & ~strongly & ~weakly,
      w: byWeak & ~x & mask,
    });
  }

  /**
   * Works out what the line is at and hands it to everything reading it.
   *
   * Drivers are told too, so a pin reports the line it is on rather than only what it put there.
   * `force` is for power-up, where listeners hold values from before the reset.
   */
  settle(force: boolean = false) {
    const value = this.resolve();

    for (const pin of this.drivers) {
      pin.state = value;
    }
    for (const pin of this.listeners) {
      if (force || pin.state.ne(value)) {
        pin.receive(value);
      }
    }
    const along = this.line;

    // TODO(dpasillas): Redrawing belongs on the rendering side, not in propagation. Until the two
    //   are separated, a wire has nothing else to tell it its colour changed while the simulation
    //   is stopped.
    for (const pin of along) {
      for (const connection of pin.connections.values()) {
        connection.update();
      }
    }
  }

  remove(pin: LogicPin) {
    this.sources.delete(pin);
    this.sinks.delete(pin);
    this.both.delete(pin);

    if (pin.net === this) {
      pin.net = undefined;
    }

    // Otherwise the board hands the name back out as a line with nobody on it.
    if (this.size === 0 && this.name) {
      pin.board?.nets.delete(this.name);
    }
  }
}

/**
 * Gives both ends of a new wire a line to be on, and returns the one the source drives.
 *
 * An unnamed line is only ever what its wires make: neither pin is moved onto the other's net, and
 * the wire is what joins them — see {@link Net.family}. So unwiring unjoins exactly what wiring
 * joined, and a pin rewired to a different driver stops being on the old driver's line rather than
 * being left there for it to go on driving. It is destructive the other way too: a pin moved off a
 * subcomponent's internal line would take the subcomponent apart.
 *
 * A *named* line is a thing in its own right, and wiring onto one joins it — being on a net and
 * answering to its name are the same statement, so a pin wired to `clk` is called `clk` and stays
 * called that once the wire is cut. Only a pin that is on no line at all can be taken this way; one
 * that already has a line keeps it, and the wire joins the two as ever.
 */
function driveOnto(source: LogicPin, sink: LogicPin): Net {
  const net = source.net ?? new Net();
  net.add(source);
  if (!sink.net) {
    (net.name ? net : new Net()).add(sink);
  }

  return net;
}

export {driveOnto, Net};
