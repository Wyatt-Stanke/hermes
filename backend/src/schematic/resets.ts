import { Block } from "@/constants";
import type { Schematic } from "./schematic";
import { debug, fatal, info, warn } from "@/logger";

export function applyResets(schem: Schematic) {
	const resets = [
		{ name: "redstone_wire", value: { power: 0 } },
		{ name: "redstone_torch", value: { lit: false } },
		{ name: "repeater", value: { powered: false } },
	];

	let resetCount = 0;

	for (const [pos, idx] of Object.entries(schem.blockIndex)) {
		const block = Block.fromStateId(idx, 0);
		const props = block.getProperties();

		for (const reset of resets) {
			if (block.name === reset.name) {
				Object.assign(props, reset.value);
			}
		}

		const newBlock = Block.fromProperties(
			block.type,
			props as { [key: string]: number | string },
			0,
		);

		if (!newBlock.stateId && newBlock.stateId !== 0)
			fatal(`Failed to create block from properties: ${JSON.stringify(props)}`);

		if (block.stateId !== newBlock.stateId) {
			resetCount++;

			schem.blockIndex[pos] = newBlock.stateId;
		}
	}

	if (resetCount > 0) {
		debug(`Applied ${resetCount} resets to schematic`);
	}

	return schem;
}
