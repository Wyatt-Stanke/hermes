import type { Schematic } from "@/schematic/schematic";
import { Block } from "@/constants";
import { readSchematic } from "@/components/utils";

export async function postProcessSchematic(
	schem: Schematic,
): Promise<Schematic> {
	schem.tagBlock("light_blue_wool", "input-1", {
		allowMultiple: true,
		suffix: (i) => `-${2 ** i}`,
	});
	schem.tagBlock("blue_wool", "input-2", {
		allowMultiple: true,
		suffix: (i) => `-${2 ** i}`,
	});
	schem.tagBlock("red_wool", "output", {
		allowMultiple: true,
		suffix: (i) => `-${2 ** i}`,
	});
	schem.tagBlock("orange_wool", "output-carry");

	return schem;
}

export const Add8BitCCASchematic = await readSchematic(
	"./src/components/add/add_8bit_cca.schem",
).then(postProcessSchematic);

const adders = [{ ticks: 3, bits: 8, schematic: Add8BitCCASchematic }];

const selectAdder = (bits: number): Schematic => {
	const selectedAdder = adders
		// Get all adders that can handle the number of bits
		.filter((adder) => adder.bits >= bits)
		// Sort by the speed of the adder
		.sort((a, b) => a.ticks - b.ticks)[0];

	if (!selectedAdder) {
		throw new Error(`No adder found for ${bits} bits`);
	}

	return selectedAdder.schematic;
};

export class AdderComponent {
	constructor(public bits: number) {}

	render(): Schematic {
		return selectAdder(this.bits);
	}
}
