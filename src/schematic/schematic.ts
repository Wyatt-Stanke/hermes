import zlib from "node:zlib";
import * as sponge from "@/schematic/sponge";
import mcData, { type IndexedData } from "minecraft-data";
import type { Block } from "prismarine-block";
import getBlock from "prismarine-block";
import nbt, { type NBT } from "prismarine-nbt";
import registry from "prismarine-registry";
import v, { Vec3 } from "vec3";
import { debug, error, info, warn } from "@/logger";
import { VERSION } from "@/constants";

interface PCRegistry extends IndexedData {
	loadDimensionCodec(codec: NBT): void;
	writeDimensionCodec(): NBT;
}

interface BedrockRegistry extends IndexedData {}
type Registry = PCRegistry & BedrockRegistry;

const formatVec3 = (vec: Vec3) => `(${vec.x}, ${vec.y}, ${vec.z})`;
const parseVec3 = (str: string): Vec3 => {
	const [x, y, z] = str.slice(1, -1).split(", ").map(Number);
	return new Vec3(x, y, z);
};

export class Schematic {
	version: string;
	size: Vec3;
	// offset: Vec3;
	palette: number[];

	blockIndex: Record<string, number>;

	blockTags: [Vec3, string][];
	data: mcData.IndexedData;
	registry: Registry;
	Block: typeof Block;

	constructor(
		version: string,
		size: Vec3,
		offset: Vec3,
		palette: number[],
		blocks: number[],
	) {
		this.version = version;
		this.size = size;
		this.palette = palette;
		this.data = mcData(version);
		this.registry = registry(version);
		this.Block = getBlock(this.registry);

		this.blockIndex = {};

		for (const [index, block] of blocks.entries()) {
			const pos = this.idxToPos(index, offset).minus(offset);
			const paletteIndex = palette[block];
			this.blockIndex[formatVec3(pos)] = paletteIndex;
		}

		this.blockTags = [];
	}

	static get empty() {
		return new Schematic(VERSION, v(0, 0, 0), v(0, 0, 0), [], []);
	}

	posToIdx(pos: Vec3, offset?: Vec3) {
		const x = pos.x - (offset?.x || 0);
		const z = pos.z - (offset?.z || 0);
		const y = pos.y - (offset?.y || 0);
		return x + z * this.size.x + y * this.size.x * this.size.z;
	}

	idxToPos(idx: number, offset?: Vec3) {
		const x = (idx % this.size.x) + (offset?.x || 0);
		const z = (Math.floor(idx / this.size.x) % this.size.z) + (offset?.z || 0);
		const y = Math.floor(idx / (this.size.x * this.size.z)) + (offset?.y || 0);
		return new Vec3(x, y, z);
	}

	start() {
		return v(0, 0, 0);
	}

	end() {
		return this.start().plus(this.size).offset(-1, -1, -1);
	}

	getBlockStateId(pos: Vec3) {
		const p = pos.floor();
		if (
			p.x < 0 ||
			p.y < 0 ||
			p.z < 0 ||
			p.x >= this.size.x ||
			p.y >= this.size.y ||
			p.z >= this.size.z
		) {
			throw new Error("Position out of bounds");
		}
		return this.blockIndex[formatVec3(p)] ?? 0;
	}

	getBlock(pos: Vec3) {
		return this.Block.fromStateId(this.getBlockStateId(pos), 0);
	}

	setBlock(pos: Vec3, block: Block | null) {
		this.blockIndex[`(${pos.x}, ${pos.y}, ${pos.z})`] = block?.stateId ?? 0;
	}

	static async read(buffer: Buffer, version?: string) {
		info("Reading schematic");
		const data = await nbt.parse(buffer);
		const schem = nbt.simplify(data.parsed);
		return sponge.read(schem, version);
	}

	resize() {
		const max = [0, 0, 0];
		const min: [number, number, number] = [0, 0, 0];

		for (const [index, block] of Object.entries(this.blockIndex)) {
			const pos = parseVec3(index);
			max[0] = Math.max(max[0], pos.x);
			max[1] = Math.max(max[1], pos.y);
			max[2] = Math.max(max[2], pos.z);

			if (pos.x < 0 || pos.y < 0 || pos.z < 0) {
				warn(`Block at ${pos} is out of bounds`);
				// Offset all blocks by the smallest value
				min[0] = Math.min(min[0], pos.x);
				min[1] = Math.min(min[1], pos.y);
				min[2] = Math.min(min[2], pos.z);
			}
		}

		if (min[0] !== 0 || min[1] !== 0 || min[2] !== 0) {
			const offset = v(min).scale(-1);
			warn(`Shifting schematic by ${offset}`);
			const oldIndex = { ...this.blockIndex };
			this.blockIndex = {};
			for (const [index, block] of Object.entries(oldIndex)) {
				const pos = parseVec3(index).plus(offset);
				this.blockIndex[formatVec3(pos)] = block;
			}
		}

		max[0]++;
		max[1]++;
		max[2]++;

		if (
			max[0] !== this.size.x ||
			max[1] !== this.size.y ||
			max[2] !== this.size.z
		) {
			info(`Resizing schematic to ${max[0]}x${max[1]}x${max[2]}`);
			this.size = new Vec3(max[0] + 1, max[1] + 1, max[2] + 1);
		}
	}

	paste(schem: Schematic, pos: Vec3, tagPrefix = "") {
		let blocks = 0;
		const offset = pos.minus(schem.start());
		for (const [index, block] of Object.entries(schem.blockIndex)) {
			const p = parseVec3(index).plus(offset);
			this.blockIndex[formatVec3(p)] = block;
			blocks++;
		}

		// Add tags
		for (const [p, tag] of schem.blockTags) {
			const newTag = tagPrefix + tag;
			if (this.blockTags.some(([, t]) => t === newTag)) {
				warn(`Tag "${newTag}" already exists on schematic ${formatVec3(p)}`);
			}
			this.blockTags.push([p.plus(offset), newTag]);
		}

		info(`Pasted schematic at ${pos} (${blocks} blocks)`);
	}

	exportBlockIndex(): {
		palette: number[];
		blocks: number[];
	} {
		debug(
			`Exporting block index with ${
				Object.keys(this.blockIndex).length
			} blocks`,
		);

		const palette = [...new Set([0, ...Object.values(this.blockIndex)])];
		// // Move air to the front
		// const airIndex = palette.indexOf(0);
		// if (airIndex !== -1) {
		// 	palette.splice(airIndex, 1);
		// 	palette = [0, ...palette];
		// }

		const blocks = [];

		// for (const [index, block] of this.blocks.entries()) {
		// 	// Convert to XYZ
		// 	const pos = this.idxToPos(index);
		// 	const idx = formatVec3(pos);
		// 	const f = this.blockIndex[idx];

		// 	console.log(idx, this.blockIndex[idx], this.palette[block]);
		// }

		for (const [index, block] of Object.entries(this.blockIndex)) {
			const idx = this.posToIdx(parseVec3(index));
			const paletteIndex = palette.indexOf(block);
			if (paletteIndex === -1) {
				warn(`Block ${block} not found in palette`);
			}
			blocks[idx] = paletteIndex;
		}

		for (let i = 0; i < this.size.x * this.size.y * this.size.z; i++) {
			if (blocks[i] === undefined) {
				blocks[i] = 0;
			}
		}

		return {
			palette,
			blocks,
		};
	}

	async write() {
		const { palette, blocks } = this.exportBlockIndex();

		const schem = sponge.write({
			version: this.version,
			size: this.size,
			offset: v(0, 0, 0),
			palette,
			blocks,
			Block: this.Block,
		});

		info(
			`Writing schematic (${palette.length} blocks, ${this.size.x}x${this.size.y}x${this.size.z})`,
		);

		return zlib.gzipSync(nbt.writeUncompressed(schem));
	}

	async forEach(
		cb: (block: Block, pos: Vec3) => unknown | Promise<unknown>,
	): Promise<void> {
		// TODO: Account for empty blocks
		for (const [index, block] of Object.entries(this.blockIndex)) {
			const pos = parseVec3(index);
			await cb(this.Block.fromStateId(block, 0), pos);
		}
	}

	async map<T>(cb: (block: Block, pos: Vec3) => T | Promise<T>): Promise<T[]> {
		const outData: T[] = [];
		await this.forEach(async (block, pos) => {
			outData.push(await cb(block, pos));
		});
		return outData;
	}

	async makeWithCommands(offset: Vec3, platform = "pc"): Promise<string[]> {
		const cmds: string[] | PromiseLike<string[]> = [];
		await this.forEach(async (block, pos) => {
			const { x, y, z } = pos.offset(offset.x, offset.y, offset.z);
			const versionedMcData = mcData(this.version);
			let state: string;
			if (versionedMcData.isNewerOrEqualTo("1.13")) {
				state = Object.entries(block.getProperties())
					.map(([key, value]) => `${key}="${value}"`)
					.join(",");
				if (platform === "pc") {
					state = state ? `[${state}]` : "";
				} else if (platform === "pe") {
					state = state ? ` [${state}]` : "";
				} else {
					throw Error(`Invalid platform ${platform}`);
				}
			} else if (versionedMcData.isNewerOrEqualTo("1.11")) {
				state = ` ${block.metadata}`;
			} else {
				// <1.111
				state = "";
			}
			cmds.push(`/setblock ${x} ${y} ${z} ${block.name}${state}`);
		});
		return cmds;
	}

	getTags(pos: Vec3) {
		return this.blockTags.filter(([p]) => p.equals(pos)).map(([, tag]) => tag);
	}

	findTag(tag: string) {
		return this.blockTags.filter(([, t]) => t === tag).map(([pos]) => pos);
	}

	async tagBlock(
		pos: Vec3,
		tag: string,
		options?: {
			allowMultiple?: boolean;
			suffix?: (index: number) => string;
		},
	): Promise<void>;
	async tagBlock(
		block: string,
		tag: string,
		options?: {
			allowMultiple?: boolean;
			suffix?: (index: number) => string;
		},
	): Promise<void>;
	async tagBlock(
		posOrBlock: Vec3 | string,
		tag: string,
		options?: {
			allowMultiple?: boolean;
			suffix?: (index: number) => string;
		},
	): Promise<void> {
		let blockPos: Vec3[];
		const isPos = posOrBlock instanceof Vec3;
		if (!isPos) {
			// Find the first block with the name
			const blockName = posOrBlock;
			// TODO: some blocks not here
			// const block = this.data.blocksByName[blockName];
			// if (!block) throw new Error(`Block ${blockName} not found`);
			// Find the first block with the name
			const pos = await this.map((b, p) =>
				b.name === blockName ? p : null,
			).then((pos) => {
				const p = pos.filter((p): p is Vec3 => p !== null);
				if (p.length === 0) {
					error(`Block ${blockName} not found`);
					throw new Error(`Block ${blockName} not found`);
				}
				if (p.length > 1 && !options?.allowMultiple) {
					error(`Multiple blocks ${blockName} found at ${p}`);
					throw new Error(`Multiple blocks ${blockName} found at ${p}`);
				}
				if (p.length > 1 && options?.allowMultiple) {
					// Sort by y, then x, then z
					p.sort((a, b) => {
						if (a.y !== b.y) return a.y - b.y;
						if (a.x !== b.x) return a.x - b.x;
						if (a.z !== b.z) return a.z - b.z;
						return 0;
					});
					return p;
				}
				return [p[0]];
			});
			blockPos = pos;
		} else {
			blockPos = [posOrBlock];
		}

		for (const [index, pos] of blockPos.entries()) {
			const outTag = tag + (options?.suffix ? options.suffix(index) : "");
			this.blockTags.push([pos, outTag]);
			debug(`Tagged block at ${pos} with tag "${outTag}"`);
		}
	}

	toJSON(space: string | number | undefined) {
		const { palette, blocks } = this.exportBlockIndex();

		return JSON.stringify(
			{
				version: this.version,
				size: {
					x: this.size.x,
					y: this.size.y,
					z: this.size.z,
				},
				offset: {
					x: 0,
					y: 0,
					z: 0,
				},
				palette,
				blocks,
			},
			null,
			space,
		);
	}

	static fromJSON(string: string) {
		let obj: {
			version: string;
			size: { x: number; y: number; z: number };
			offset: { x: number; y: number; z: number };
			palette: number[];
			blocks: number[];
		};
		try {
			obj = JSON.parse(string);
		} catch (e) {
			console.error(e);
			return null;
		}
		const { version, size, offset, palette, blocks } = obj;
		const sizeX = Number(size?.x);
		const sizeY = Number(size?.y);
		const sizeZ = Number(size?.z);
		const offsetX = Number(offset?.x);
		const offsetY = Number(offset?.y);
		const offsetZ = Number(offset?.z);
		if (
			!version ||
			Number.isNaN(sizeX) ||
			Number.isNaN(sizeY) ||
			Number.isNaN(sizeZ) ||
			Number.isNaN(offsetX) ||
			Number.isNaN(offsetY) ||
			Number.isNaN(offsetZ) ||
			!palette ||
			!blocks
		) {
			throw new Error(
				`Parsing failed missing attribute ${!version ? "version " : ""}${
					Number.isNaN(sizeX) ? "size: x " : ""
				}${Number.isNaN(sizeY) ? "size: y " : ""}${
					Number.isNaN(sizeZ) ? "size: z " : ""
				}${Number.isNaN(offsetX) ? "offset: x " : ""}${
					Number.isNaN(offsetY) ? "offset: y " : ""
				}${Number.isNaN(offsetZ) ? "offset: z " : ""}${
					!palette ? "palette " : ""
				}${!blocks ? "blocks " : ""}`,
			);
		}
		return new Schematic(
			version,
			new Vec3(sizeX, sizeY, sizeZ),
			new Vec3(offsetX, offsetY, offsetZ),
			palette,
			blocks,
		);
	}
}
