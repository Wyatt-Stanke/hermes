import { fatal } from "@/logger";
import { Schematic } from "@/schematic/schematic";
import { getStateId, parseBlockName } from "@/schematic/states";
import mcData from "minecraft-data";
import type { Block as DataBlock, IndexedData } from "minecraft-data";
import type { Block } from "prismarine-block";
import { type NBT, TagType } from "prismarine-nbt";
import { Vec3 } from "vec3";

const versions = mcData.versions.pc;

function findVersion(dataVersion: number) {
	for (const v of versions) {
		if (v.dataVersion === dataVersion) {
			return v.minecraftVersion;
		}
	}
	return versions[0].minecraftVersion; // default to latest
}

function getDataVersion(mcVersion: string) {
	for (const v of versions) {
		if (v.minecraftVersion === mcVersion) {
			return v.dataVersion;
		}
	}
	return versions[0].dataVersion;
}

function parsePalette(mcData: IndexedData, palette: number[]) {
	const out = [];
	for (const [str, id] of Object.entries(palette)) {
		out[id] = getStateId(mcData, parseBlockName(str));
	}
	return out;
}

function writeBlockName(block: Block) {
	const prop = [];
	for (const [key, value] of Object.entries(block.getProperties())) {
		prop.push(`${key}=${value}`);
	}
	return `minecraft:${block.name}${
		prop.length > 0 ? `[${prop.join(",")}]` : ""
	}`;
}

function writePalette(block: typeof Block, palette: number[]) {
	const out: Record<string, { type: TagType.Int; value: number }> = {};
	for (let id = 0; id < palette.length; id++) {
		// TODO: fix no biome
		const name = writeBlockName(block.fromStateId(palette[id], 0));
		out[name] = { type: TagType.Int, value: id };
	}
	return out;
}

function byteArrayToVarintArray(byteArray: number[]) {
	const varintArray = [];
	let i = 0;
	while (i < byteArray.length) {
		let value = 0;
		let varintLength = 0;
		while (true) {
			value |= (byteArray[i] & 127) << (varintLength++ * 7);
			if (varintLength > 5) fatal("VarInt too big (probably corrupted data)");
			if ((byteArray[i++] & 128) !== 128) break;
		}
		varintArray.push(value);
	}
	return varintArray;
}

function varintArrayToByteArray(varintArray: number[]) {
	const byteArray = [];
	for (let id of varintArray) {
		while ((id & -128) !== 0) {
			byteArray.push(((id | 128) << 24) >> 24);
			id >>>= 7;
		}
		byteArray.push((id << 24) >> 24);
	}
	return byteArray;
}

export function read(
	nbt: {
		Schematic: {
			Version: 3;
			DataVersion: number;
			Width: number;
			Height: number;
			Length: number;
			Offset: [number, number, number];
			Blocks: {
				Palette: number[];
				Data: number[];
			};
		};
	},
	inputVersion?: string,
) {
	const schem = nbt.Schematic;
	const version = inputVersion || findVersion(schem.DataVersion);

	const data = mcData(version);
	const palette = parsePalette(data, schem.Blocks.Palette);
	const size = new Vec3(schem.Width, schem.Height, schem.Length);
	const offset =
		nbt.Schematic.Offset.length > 0
			? new Vec3(
					nbt.Schematic.Offset[0],
					nbt.Schematic.Offset[1],
					nbt.Schematic.Offset[2],
				)
			: new Vec3(0, 0, 0);
	const blocks = byteArrayToVarintArray(schem.Blocks.Data);
	return new Schematic(version, size, offset, palette, blocks);
}

export function write(schematic: {
	version: string;
	palette: number[];
	Block: typeof Block;
	size: Vec3;
	offset: Vec3;
	blocks: number[];
}): NBT {
	const dataVersion = getDataVersion(schematic.version);
	if (!dataVersion) {
		fatal(`Unsupported version ${schematic.version}`);
	}

	return {
		type: TagType.Compound,
		name: "Schematic",
		value: {
			PaletteMax: { type: TagType.Int, value: schematic.palette.length },
			Palette: {
				type: TagType.Compound,
				value: writePalette(schematic.Block, schematic.palette),
			},
			Version: { type: TagType.Int, value: 2 },
			Length: { type: TagType.Short, value: schematic.size.z },
			Metadata: {
				type: TagType.Compound,
				value: {
					WEOffsetX: { type: TagType.Int, value: schematic.offset.x },
					WEOffsetY: { type: TagType.Int, value: schematic.offset.y },
					WEOffsetZ: { type: TagType.Int, value: schematic.offset.z },
				},
			},
			Height: { type: TagType.Short, value: schematic.size.y },
			DataVersion: {
				type: TagType.Int,
				value: dataVersion,
			},
			BlockData: {
				type: TagType.ByteArray,
				value: varintArrayToByteArray(schematic.blocks),
			},
			Width: { type: TagType.Short, value: schematic.size.x },
		},
	};
}
