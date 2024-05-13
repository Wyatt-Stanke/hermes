import type { Schematic } from "@/schematic/schematic";

export abstract class Component {
	abstract render(): Schematic;
}
