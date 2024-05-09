import { Block } from "@/constants";
import { error, info, warn } from "@/logger";
import { Schematic } from "@/schematic/schematic";
import type { Vec3 } from "vec3";
import v from "vec3";

export class UntracedWire {
	constructor(
		public start: Vec3,
		public end: Vec3,
	) {}
}

export class Wire {
	constructor(
		public dusts: Vec3[],
		public start: Vec3 = dusts[0],
		public end: Vec3 = dusts[dusts.length - 1],
		public repeaters: { location: Vec3; direction: Vec3 }[] = [],
	) {
		for (const dust of this.dusts) {
			if (dust.x < 0 || dust.y < 0 || dust.z < 0) {
				warn(`Dust at ${dust} is out of bounds`);
			}
		}
	}

	generateRepeaters(startStrength = 15): { location: Vec3; direction: Vec3 }[] {
		const repeaters = [];
		let latestRepeater: number | undefined;
		let shouldAddRepeater = false;

		for (let i = 0; i < this.dusts.length - 1; i++) {
			// Distance from latest repeater to current dust
			const distance = i - (latestRepeater || 0);
			if (distance > 15) {
				shouldAddRepeater = true;
			}
			if (shouldAddRepeater) {
				// Check if the dust ahead and behind are in a straight line
				const ahead = this.dusts[i + 1];
				const behind = this.dusts[i - 1];
				const direction = ahead.minus(behind);
				if (direction.x === 0 || direction.z === 0) {
					latestRepeater = i;
					shouldAddRepeater = false;
					repeaters.push({
						location: this.dusts[i],
						direction: direction.normalize(),
					});
				} else {
					// Try again, one block behind
					warn(
						`Failed to place repeater at ${this.dusts[i]} (${
							i + 1
						}th dust) because the dusts are not in a straight line`,
					);

					i -= 2;
				}
			}
		}

		this.repeaters = repeaters;
		return repeaters;
	}

	supports(): Vec3[] {
		const supports = [];

		for (const dust of this.dusts) {
			supports.push(dust.offset(0, -1, 0));
		}

		return supports;
	}

	clearance(): Vec3[] {
		// If there is a dust A, and there is another dust that is 1 block higher or lower than
		// A one block away in any of the 4 cardinal directions,
		// then add a clearance block one block higher than A.
		const clearance = [];

		for (const dust of this.dusts) {
			const cardinals = [v(1, 0, 0), v(-1, 0, 0), v(0, 0, 1), v(0, 0, -1)];

			const neighbors = cardinals
				.map((cardinal) => dust.plus(cardinal))
				.map((neighbor) => neighbor.offset(0, 1, 0));

			for (const neighbor of neighbors) {
				if (this.dusts.some((dust) => dust.equals(neighbor))) {
					info(`Adding clearance block at ${dust}`);

					clearance.push(dust.offset(0, 1, 0));
					break;
				}
			}
		}

		return clearance;
	}

	check(): boolean {
		// Check that all dusts are connected
		const visited = new Set<string>();
		const queue = [this.dusts[0]];

		while (queue.length > 0) {
			const current = queue.shift() as Vec3;

			visited.add(current.toString());

			const cardinals = [
				v(1, 0, 0),
				v(-1, 0, 0),
				v(0, 0, 1),
				v(0, 0, -1),
			].flatMap((cardinal) => [
				cardinal,
				cardinal.offset(0, 1, 0),
				cardinal.offset(0, -1, 0),
			]);

			for (const cardinal of cardinals) {
				const neighbor = current.plus(cardinal);

				if (
					this.dusts.some((dust) => dust.equals(neighbor)) &&
					!visited.has(neighbor.toString())
				) {
					queue.push(neighbor);
				}
			}
		}

		return visited.size === this.dusts.length;
	}

	render(): Schematic {
		if (!this.check()) {
			error("Wire is not connected");
		}

		this.generateRepeaters();

		const schem = Schematic.empty;

		for (const dust of this.dusts) {
			schem.setBlock(dust, Block.fromString("redstone_wire", 0));
		}

		for (const support of this.supports()) {
			schem.setBlock(support, Block.fromString("stone", 0));
		}

		for (const clearance of this.clearance()) {
			schem.setBlock(
				clearance,
				Block.fromProperties(
					"smooth_stone_slab",
					{
						type: "top",
						// @ts-ignore // TODO: Fix this
						waterlogged: false,
					},
					0,
				),
			);
		}

		const directionMap: { [key: string]: string } = {
			"1,0,0": "west",
			"-1,0,0": "east",
			"0,0,1": "north",
			"0,0,-1": "south",
		};

		for (const repeater of this.repeaters) {
			const direction = repeater.direction;
			const location = repeater.location;

			schem.setBlock(
				location,
				Block.fromProperties(
					"repeater",
					{
						facing:
							directionMap[`${direction.x},${direction.y},${direction.z}`],
						delay: 1,
						// @ts-ignore // TODO: Fix this
						locked: false,
						// @ts-ignore // TODO: Fix this
						powered: false,
					},
					0,
				),
				// Block.fromString("repeater", 0),
			);
		}

		schem.resize();

		return schem;
	}
}
