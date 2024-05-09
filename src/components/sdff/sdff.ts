import v from "vec3";
import { readSchematic } from "../utils";
import { Block, data, Registry, type DataBlock } from "@/constants";
import { Schematic } from "@/schematic/schematic";
import { comp } from "prismarine-nbt";

export async function postProcessSchematic(
	schem: Schematic,
): Promise<Schematic> {
	schem.tagBlock("light_blue_wool", "input");
	schem.tagBlock("blue_wool", "reset");
	schem.tagBlock("purple_wool", "clock");
	schem.tagBlock("red_wool", "output");

	return schem;
}

export const SDFFSafeSchematic = await readSchematic(
	"./src/components/sdff/sdff_safe.schem",
).then(postProcessSchematic);

// export const SDFFFastSchematic = await readSchematic(
// 	"./src/components/sdff/sdff_fast.schem",
// ).then(postProcessSchematic);

export class SDFFComponent {
	constructor(
		public stackHeight: number,
		public mode: "safe" | "fast" = "safe",
	) {}

	render(): Schematic {
		const schem = Schematic.empty;

		let component: Schematic;

		switch (this.mode) {
			case "safe":
				component = SDFFSafeSchematic;
				break;
			case "fast":
				throw new Error("Fast mode not implemented");
			// component = SDFFFastSchematic;
		}

		for (let i = 0; i < this.stackHeight; i++) {
			schem.paste(component, v(0, i * component.size.y, 0));
		}

		schem.resize();

		return schem;
	}
}
