import LogicComponent from "../logic/LogicComponent";
import React from "react";
import LogicPin from "../logic/LogicPin";

export type ComponentMouseEventHandler = (component: LogicComponent, e: React.MouseEvent<SVGElement>) => void;
export type PinMouseEventHandler = (pin: LogicPin, e: React.MouseEvent<SVGElement>) => void;
export type MouseEventHandler = (e: React.MouseEvent<SVGElement>) => void;
