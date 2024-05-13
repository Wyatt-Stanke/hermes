// Layout algorithm based on simulated annealing for 2D graphs

import { debug, fatal, info } from "@/logger";
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

// Function to minimize
function energy2D(layout: Generic2DLayout): number {
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
		for (let j = 0; j < components.length; j++) {
			if (i === j) {
				continue;
			}
			const [pos2, size2] = components[j];

			// Check for overlap
			if (
				pos1.x < pos2.x + size2.x &&
				pos1.x + size1.x > pos2.x &&
				pos1.y < pos2.y + size2.y &&
				pos1.y + size1.y > pos2.y
			) {
				isOverlap = true;
				// add energy based amount of overlap
				energy += Math.abs(pos1.x + size1.x / 2 - (pos2.x + size2.x / 2));
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

			if (start === "input") {
				startPos = new Vec2(0, 0);
			} else {
				const comp =
					layout.components.components.find(
						(comp) => comp.uuid.uuid === start.component.uuid,
					) || fatal("Component not found in layout - 2");
				startPos =
					layout.positions[comp.uuid.uuid] ||
					fatal("Component not found in layout - 3");
				startPos = startPos.add(comp.ports[start.port] || new Vec2(0, 0));
			}

			if (end === "output") {
				// TODO: better position for output
				endPos = new Vec2(15, 0);
			} else {
				const comp =
					layout.components.components.find(
						(comp) => comp.uuid.uuid === end.component.uuid,
					) || fatal("Component not found in layout - 4");
				endPos =
					layout.positions[comp.uuid.uuid] ||
					fatal("Component not found in layout - 5");
				endPos = endPos.add(comp.ports[end.port] || new Vec2(0, 0));
			}

			const dx = startPos.x - endPos.x;
			const dy = startPos.y - endPos.y;
			energy += dx * dx + dy * dy;
		}
		return energy;
	}
	// Make sure energy is greater than 100
	// while (energy < 100) {
	// 	energy *= 10;
	// }
	energy *= 1e6;
	return energy;
}

export function annealing2D(
	circut: Generic2DCircut,
	iterations: number,
	temperature: number,
	cooling: number,
): Generic2DLayoutResult {
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
			Math.random() * (msl * 4) - msl * 2,
			Math.random() * (msl * 4) - msl * 2,
		);
	}

	let bestLayout = deepCloneWithVec2(layout);
	let bestEnergy = energy2D({
		components: circut,
		positions: bestLayout,
	});

	let currentLayout = deepCloneWithVec2(layout);
	let currentEnergy = bestEnergy;

	for (let i = 0; i < iterations; i++) {
		const newLayout = deepCloneWithVec2(currentLayout);
		const comp = components[Math.floor(Math.random() * components.length)];
		const pos =
			newLayout[comp.uuid.uuid] || fatal("Component not found in layout - 6");

		newLayout[comp.uuid.uuid] = pos.add(
			new Vec2(Math.random() * 2 - 1, Math.random() * 2 - 1),
		);

		const newEnergy = energy2D({
			components: circut,
			positions: newLayout,
		});

		if (
			newEnergy < currentEnergy ||
			boltzmann(newEnergy - currentEnergy, temperature)
		) {
			currentLayout = deepCloneWithVec2(newLayout);
			currentEnergy = newEnergy;
		}

		if (newEnergy < bestEnergy) {
			bestLayout = deepCloneWithVec2(newLayout);
			bestEnergy = newEnergy;
		}

		temperature *= cooling;
		if (i % 100 === 0) {
			info(`Iteration ${i}: ${bestEnergy}`);
			result.overtime[i] = {
				components: circut,
				positions: bestLayout,
			};
		}
	}

	info(`Best energy: ${bestEnergy}`);

	result.best = {
		components: circut,
		positions: bestLayout,
	};
	result.energy = bestEnergy;

	return result;
}
