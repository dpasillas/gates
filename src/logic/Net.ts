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

  get members(): LogicPin[] {
    return [...this.sources, ...this.sinks, ...this.both];
  }

  /** Everything putting a value on the line. */
  get drivers(): LogicPin[] {
    return [...this.sources, ...this.both];
  }

  /** Everything reading it. */
  get listeners(): LogicPin[] {
    return [...this.sinks, ...this.both];
  }

  get size(): number {
    return this.sources.size + this.sinks.size + this.both.size;
  }

  has(pin: LogicPin): boolean {
    return this.sources.has(pin) || this.sinks.has(pin) || this.both.has(pin);
  }

  private groupFor(pin: LogicPin): Set<LogicPin> {
    if (pin.drives) {
      return pin.listens ? this.both : this.sources;
    }

    return this.sinks;
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

    // TODO(dpasillas): Redrawing belongs on the rendering side, not in propagation. Until the two
    //   are separated, a wire has nothing else to tell it its colour changed while the simulation
    //   is stopped.
    for (const pin of this.members) {
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
 * Puts a sink on the line its source drives, making one if the source is on none.
 *
 * The source's net wins outright: wiring an unnamed output to an input that had been named while it
 * waited for a driver takes that name away.
 */
function driveOnto(source: LogicPin, sink: LogicPin): Net {
  const net = source.net ?? new Net();
  net.add(source);
  net.add(sink);

  return net;
}

export {driveOnto, Net};
