import type { Block, IndexedData } from "minecraft-data";

type BlockProperties = {
	name: string;
	properties: string[][];
};

export function parseBlockName(str: string): BlockProperties {
	if (str.includes("[")) {
		let [name, prop] = str.split("[");
		prop = prop.substring(0, prop.length - 1);
		return {
			name: name.split(":")[1],
			properties: prop.split(",").map((x) => x.split("=")),
		};
	}
	return { name: str.split(":")[1], properties: [] };
}

export function getStateId(
	mcData: IndexedData,
	blockProperties: BlockProperties,
) {
	const { name, properties } = blockProperties;
	const block = mcData.blocksByName[name];
	if (!block) {
		console.log(`Unknown block ${name} - replacing with air`);
		return 0;
	}
	let data = 0;
	for (const [key, value] of properties) {
		if (!block.states) {
			throw new Error(`Block ${name} has no states`);
		}
		data += getStateValue(block.states, key, value);
	}
	if (block.minStateId === undefined) return (block.id << 4) + data;
	return block.minStateId + data;
}

export function getStateValue(
	states: NonNullable<Block["states"]>,
	name: string,
	value: string,
) {
	let offset = 1;
	for (let i = states.length - 1; i >= 0; i--) {
		const state = states[i];
		if (state.name === name) {
			return offset * parseValue(value, state);
		}
		offset *= state.num_values;
	}
	return 0;
}

export function parseValue(
	value: string,
	state: NonNullable<Block["states"]>[number],
) {
	if (state.type === "enum") {
		if (!state.values) throw new Error("Enum state has no values");
		return state.values.indexOf(value);
	}
	if (value === "true") return 0;
	if (value === "false") return 1;
	return Number.parseInt(value, 10);
}

// function parseValue(
// 	value: boolean,
// 	state: NonNullable<DataBlock["states"]>[number],
// ): number | boolean {
// 	if (!state) throw new Error("No state");

// 	if (state.type === "enum") {
// 		if (!state.values) throw new Error("No values");
// 		return state.values.indexOf(value);
// 	}
// 	if (state.type === "bool") {
// 		if (value === true) return 0;
// 		if (value === false) return 1;
// 	}
// 	if (state.type === "int") {
// 		return value;
// 	}
// 	// Assume by-name mapping for unknown properties
// 	return state.values?.indexOf(value.toString()) ?? 0;
// }
