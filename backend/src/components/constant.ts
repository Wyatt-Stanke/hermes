import { Schematic, formatVec3 } from "@/schematic/schematic";
import { Component } from "./component";
import { Block } from "@/constants";
import v from "vec3";
import { fatal } from "@/logger";

export class ConstantComponent extends Component {
	constructor(public values: boolean[]) {
		super();
	}

	render(): Schematic {
		const schem = Schematic.empty;

		for (const [index, value] of this.values.entries()) {
			const id = value
				? Block.fromString("redstone_block", 0).stateId
				: Block.fromString("air", 0).stateId;

			if (!id) {
				fatal(`Invalid block for constant: ${value}`);
			}

			schem.blockIndex[formatVec3(v(0, -2 * index, 0))] = id;
			schem.tagBlock(
				v(0, -2 * index, 0),
				`output-${2 ** (this.values.length - index - 1)}`,
			);
		}

		schem.resize();

		return schem;
	}
}
