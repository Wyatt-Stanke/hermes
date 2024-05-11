// Layout algorithm based on simulated annealing for 2D graphs

import { debug, fatal, info } from "backend/src/logger";
import {
	Generic2DComponent,
	Generic2DConnection,
	Generic2DCircut,
	Generic2DLayout,
	Vec2,
	UUID,
} from "./generic";

function boltzmann(energyDelta: number, temperature: number): boolean {
	return Math.random() < Math.exp(-energyDelta / temperature);
}

// Function to minimize
function energy2D(layout: Generic2DLayout): number {
	let energy = 0;
	let isOverlap = false;

	// Check for overlapping components
	const components = [...layout.components.components.entries()].map(
		([uuid, comp]) => {
			const pos = layout.positions.get(comp.uuid);
			if (!pos) {
				fatal("Component not found in layout");
			}
			return [pos, comp.size];
		},
	);

	for (let i = 0; i < components.length; i++) {
		const [pos1, size1] = components[i];
		for (let j = i + 1; j < components.length; j++) {
			const [pos2, size2] = components[j];
			const dx = Math.abs(pos1.x - pos2.x);
			const dy = Math.abs(pos1.y - pos2.y);
			const sx = size1.x + size2.x;
			const sy = size1.y + size2.y;

			if (dx < sx && dy < sy) {
				// Overlapping, bad -- add energy
				const ox = sx - dx;
				const oy = sy - dy;
				energy += ox * ox + oy * oy;
				isOverlap = true;
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
						(comp) => comp.uuid === start.component,
					) || fatal("Component not found in layout");
				startPos =
					layout.positions.get(comp.uuid) ||
					fatal("Component not found in layout");
				startPos = startPos.add(comp.ports.get(start.port) || new Vec2(0, 0));
			}

			if (end === "output") {
				endPos = new Vec2(0, 0);
			} else {
				const comp =
					layout.components.components.find(
						(comp) => comp.uuid === end.component,
					) || fatal("Component not found in layout");
				endPos =
					layout.positions.get(comp.uuid) ||
					fatal("Component not found in layout");
				endPos = endPos.add(comp.ports.get(end.port) || new Vec2(0, 0));
			}

			const dx = startPos.x - endPos.x;
			const dy = startPos.y - endPos.y;
			energy += dx * dx + dy * dy;
		}
	}

	return energy;
}

export function annealing2D(circut: Generic2DCircut): Generic2DLayout {
	const iterations = 1000;
	const temperature = 1000;
	const cooling = 0.99;

	info(`Starting 2D annealing with ${iterations} iterations`);

	const components = Array.from(circut.components.values());

	// Initialize layout
	// Minimum side length
	const msl = Math.sqrt(
		components.reduce((acc, comp) => acc + comp.size.x * comp.size.y, 0),
	);

	debug(`Optimal XZ area: ${Math.round(msl ** 2)} blocks`);

	const layout = new Map<UUID, Vec2>();
	for (const comp of components) {
		layout.set(
			comp.uuid,
			new Vec2(
				Math.random() * (msl * 4) - msl * 2,
				Math.random() * (msl * 4) - msl * 2,
			),
		);
	}

	let bestLayout = new Map(layout);

	let bestEnergy = energy2D({
		components: circut.components,
		positions: bestLayout,
	});
}
