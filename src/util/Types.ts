import LogicComponent from "../logic/LogicComponent";
import React from "react";
import LogicPin from "../logic/LogicPin";

export type ViewBox = {
  left: number,
  top: number,
  width: number,
  height: number,
};

export type ComponentMouseEventHandler = (component: LogicComponent, e: React.MouseEvent<SVGElement> | MouseEvent) => void;
export type PinMouseEventHandler = (pin: LogicPin, e: React.MouseEvent<SVGElement> | MouseEvent) => void;
export type MouseEventName = "mousedown" | "mouseup" | "mousemove";
export type MouseEventHandler = (e: React.MouseEvent<SVGElement> | MouseEvent) => void;
