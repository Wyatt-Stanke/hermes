import { applyResets } from "@/schematic/resets";
import { Schematic } from "@/schematic/schematic";
import { Block } from "@/constants";
import fs from "node:fs/promises";

export const readSchematic = async (path: string) => {
	const buffer = await fs.readFile(path);
	const schem = await Schematic.read(Buffer.from(buffer));
	return addGizmo(applyResets(schem));
};

export const addGizmo = (schem: Schematic): Schematic => {
	schem.blockIndex["(0, 0, 0)"] = Block.fromString("gray_concrete", 0)
		.stateId as number;
	schem.blockIndex["(1, 0, 0)"] = Block.fromString("red_concrete", 0)
		.stateId as number;
	schem.blockIndex["(0, 1, 0)"] = Block.fromString("blue_concrete", 0)
		.stateId as number;
	schem.blockIndex["(0, 0, 1)"] = Block.fromString("green_concrete", 0)
		.stateId as number;

	return schem;
};
