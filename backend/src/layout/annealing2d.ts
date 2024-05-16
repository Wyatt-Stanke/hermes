// Layout algorithm based on simulated annealing for 2D graphs

import { debug, error, fatal, info, warn } from "@/logger";
import {
	type Generic2DCircut,
	type Generic2DLayout,
	Vec2,
	type UUID,
	type Generic2DLayoutResult,
} from "./generic";

function boltzmann(energyDelta: number, temperature: number): boolean {
	return Math.random() < Math.exp(-energyDelta / temperature);
}

function deepCloneWithVec2<T>(obj: T): T {
	if (obj instanceof Vec2) {
		return new Vec2(obj.x, obj.y) as T;
	}
	if (Array.isArray(obj)) {
		return obj.map(deepCloneWithVec2) as T;
	}
	if (typeof obj === "object") {
		// biome-ignore lint/suspicious/noExplicitAny: any is needed here
		const newObj: any = {};
		for (const key in obj) {
			newObj[key] = deepCloneWithVec2(obj[key]);
		}
		return newObj;
	}
	return obj;
}

enum EnergyStage {
	Overlap = 1,
	WireLength = 2,
}

interface Energy {
	// Energy value (lower is better)
	number: number;
	// Energy stage (higher is better -- prefer higher stage)
	stage: EnergyStage;
}

function energyBetterThan(a: Energy, b: Energy): boolean {
	if (a.stage !== b.stage) {
		return a.stage > b.stage;
	}
	return a.number < b.number;
}

function energyDelta(a: Energy, b: Energy): number {
	if (a.stage !== b.stage) {
		// Big change -- return the difference in stages times a big number
		// TODO: more scientific way to calculate this
		return (a.stage - b.stage) * 10000;
	}
	return a.number - b.number;
}

function energyToString(energy: Energy): string {
	return `${energy.number} (${energy.stage})`;
}

// Function to minimize
function energy2D(layout: Generic2DLayout): {
	energy: Energy;
	isOverlap: boolean;
} {
	let energy = 0;
	let isOverlap = false;

	// Check for overlapping components
	const components = [...layout.components.components.entries()].map(
		([uuid, comp]) => {
			const pos = layout.positions[comp.uuid.uuid];
			if (!pos) {
				fatal("Component not found in layout - 1");
			}
			return [pos, comp.size];
		},
	);

	for (let i = 0; i < components.length; i++) {
		const [pos1, size1] = components[i];
		for (let j = i + 1; j < components.length; j++) {
			if (i === j) continue;
			const [pos2, size2] = components[j];
			if (
				pos1.x < pos2.x + size2.x &&
				pos1.x + size1.x > pos2.x &&
				pos1.y < pos2.y + size2.y &&
				pos1.y + size1.y > pos2.y
			) {
				isOverlap = true;
				// Add energy based on overlap
				const dx =
					Math.min(pos1.x + size1.x, pos2.x + size2.x) -
					Math.max(pos1.x, pos2.x);
				const dy =
					Math.min(pos1.y + size1.y, pos2.y + size2.y) -
					Math.max(pos1.y, pos2.y);
				energy += dx * dy;
			}
		}
	}

	// Don't optimize for wire length if there are overlaps because
	// it will just make the overlaps worse
	if (!isOverlap) {
		// For each connection, add energy based on wire length
		for (const conn of layout.components.connections) {
			const start = conn.start;
			const end = conn.end;

			let startPos: Vec2;
			let endPos: Vec2;

			const startComp =
				layout.components.components.find(
					(comp) => comp.uuid.uuid === start.component.uuid,
				) || fatal("Component not found in layout - 2");
			startPos =
				layout.positions[startComp.uuid.uuid] ||
				fatal("Component not found in layout - 3");
			startPos = startPos.add(startComp.ports[start.port] || new Vec2(0, 0));

			const endComp =
				layout.components.components.find(
					(comp) => comp.uuid.uuid === end.component.uuid,
				) || fatal("Component not found in layout - 4");
			endPos =
				layout.positions[endComp.uuid.uuid] ||
				fatal("Component not found in layout - 5");
			endPos = endPos.add(endComp.ports[end.port] || new Vec2(0, 0));

			const dx = startPos.x - endPos.x;
			const dy = startPos.y - endPos.y;
			energy += (dx * dx + dy * dy) ** 2;
		}
	}
	if (energy === 0) {
		error("Energy is 0");
		error("-- Debug info --");
		error(`Overlap: ${isOverlap}`);
		throw new Error("Energy is 0");
	}
	return {
		energy: {
			number: energy,
			// TODO: cleanup
			stage: isOverlap ? EnergyStage.Overlap : EnergyStage.WireLength,
		},
		isOverlap,
	};
}

export function annealing2D(
	circut: Generic2DCircut,
	iterations: number,
	initialTemperature: number,
	cooling: number,
): Generic2DLayoutResult {
	let temperature = initialTemperature;
	const result: Generic2DLayoutResult = {
		overtime: {},
		best: {
			components: circut,
			positions: {},
		},
		energy: 0,
	};

	info(`Starting 2D annealing with ${iterations} iterations`);

	const components = Array.from(circut.components.values());

	// Initialize layout
	// Minimum side length
	const msl = Math.sqrt(
		components.reduce((acc, comp) => acc + comp.size.x * comp.size.y, 0),
	);

	debug(`Optimal XZ area: ${Math.round(msl ** 2)} blocks`);

	const layout: { [key: string]: Vec2 } = {};
	for (const comp of components) {
		layout[comp.uuid.uuid] = new Vec2(
			Math.round(Math.random() * (msl * 4) - msl * 2),
			Math.round(Math.random() * (msl * 4) - msl * 2),
		);
	}

	let bestLayout = deepCloneWithVec2(layout);
	let { energy: bestEnergy } = energy2D({
		components: circut,
		positions: bestLayout,
	});

	let currentLayout = deepCloneWithVec2(layout);
	let currentEnergy = bestEnergy;

	for (let i = 0; i < iterations; i++) {
		for (let c = 0; c < components.length; c++) {
			const newLayout = deepCloneWithVec2(currentLayout);

			const comp = components[c];
			const pos =
				newLayout[comp.uuid.uuid] || fatal("Component not found in layout - 6");

			const newX = Math.round(pos.x + (Math.random() * 2 - 1));
			const newY = Math.round(pos.y + (Math.random() * 2 - 1));

			newLayout[comp.uuid.uuid] = new Vec2(newX, newY);

			const { energy: newEnergy, isOverlap } = energy2D({
				components: circut,
				positions: newLayout,
			});

			if (
				energyBetterThan(newEnergy, currentEnergy) ||
				boltzmann(energyDelta(newEnergy, currentEnergy), temperature)
			) {
				currentLayout = deepCloneWithVec2(newLayout);
				currentEnergy = newEnergy;
			}

			if (energyBetterThan(newEnergy, bestEnergy)) {
				bestLayout = deepCloneWithVec2(newLayout);
				bestEnergy = newEnergy;
			}
		}

		temperature *= cooling;
		if (i % 100 === 0) {
			info(`Iteration ${i}: ${energyToString(bestEnergy)} (t=${temperature})`);
			result.overtime[i] = {
				components: circut,
				positions: bestLayout,
			};
		}

		// // Get the constant component
		// console.log(
		// 	bestLayout[
		// 		components.find((comp) => comp.name.startsWith("constant"))!.uuid.uuid
		// 	],
		// );
	}

	info(`Best energy: ${energyToString(bestEnergy)}`);
	info(
		`Overlap: ${
			energy2D({ components: circut, positions: bestLayout }).isOverlap
		}`,
	);

	result.best = {
		components: circut,
		positions: bestLayout,
	};
	// TODO: send energy stage
	result.energy = bestEnergy.number;

	return result;
}
