import type { Schematic } from "backend/src/schematic/schematic";

export abstract class Component {
	abstract render(): Schematic;
}
