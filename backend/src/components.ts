import { AdderComponent } from "@/components/add/add";
import { error, fatal, info, warn } from "./logger";
import { SDFFComponent } from "./components/sdff/sdff";
import type { Cell, Module, Port } from "@/yosys/types";
import {
	type Generic2DComponent,
	type Generic2DConnection,
	Vec2,
	type Generic2DPort,
	UUID,
} from "./layout/generic";
import type { Component } from "./components/component";

// Generate Generic2DLayout
export function generateComponentsAndConnections(module: Module): {
	components: Generic2DComponent[];
	connections: Generic2DConnection[];
} {
	const components: Generic2DComponent[] = [];
	const connections: Generic2DConnection[] = [];

	// Create an global input/output component
	const inputComponent: Generic2DComponent = {
		name: "input",
		size: new Vec2(1, 1),
		ports: { IO: new Vec2(0, 0) },
		uuid: new UUID(),
	};

	const outputComponent: Generic2DComponent = {
		name: "output",
		size: new Vec2(1, 1),
		ports: { IO: new Vec2(0, 0) },
		uuid: new UUID(),
	};

	components.push(inputComponent, outputComponent);

	for (const [name, cell] of Object.entries(module.cells)) {
		let comp: Component | null = null;
		let tagPorts: Record<string, string> | null = null;

		switch (cell.type) {
			case "$sdff":
				comp = new SDFFComponent(cell.parameters.WIDTH);
				tagPorts = {
					CLK: "clock",
					D: "input",
					Q: "output",
					SRST: "reset",
				};
				break;
			case "$add":
				comp = new AdderComponent(
					Math.max(cell.parameters.A_WIDTH, cell.parameters.B_WIDTH),
				);
				tagPorts = {
					A: "input-1-1",
					B: "input-2-1",
					Y: "output-1",
				};
				break;
		}

		if (comp && tagPorts) {
			const schem = comp.render();
			const size2d = new Vec2(schem.size.x, schem.size.z);
			const ports: { [key: string]: Vec2 } = {};

			for (const [port, tag] of Object.entries(tagPorts)) {
				const tagLocations = schem.findTag(tag);
				if (tagLocations.length === 0) {
					fatal(`Tag ${tag} not found in component`);
				}
				if (tagLocations.length > 1) {
					warn(`Tag ${tag} found multiple times in component`);
				}
				const tagLocation = tagLocations[0];

				ports[port] = new Vec2(tagLocation.x, tagLocation.z);
			}

			if (Object.keys(ports).length === 0) {
				error(`No ports found for component ${name}`);
			}

			const genericComp = {
				name,
				size: size2d,
				ports,
				uuid: new UUID(),
			};

			components.push(genericComp);
		} else {
			fatal(`Unknown cell type ${cell.type}`);
		}
	}
	// Add constants
	for (const [cellName, cell] of Object.entries(module.cells)) {
		const component =
			components.find((c) => c.name === cellName) ||
			fatal(`Component ${cellName} not found`);
		for (const [portName, port] of Object.entries(cell.connections)) {
			for (const [index, bit] of Object.values(port).entries()) {
				if (typeof bit === "string") {
					// Constant value -- either "0" or "1"
					const constant: Generic2DComponent = {
						name: `constant-${index}-${cellName}`,
						size: new Vec2(1, 1),
						ports: { output: new Vec2(0, 0) },
						uuid: new UUID(),
					};

					components.push(constant);

					connections.push({
						start: { component: constant.uuid, port: "output" },
						end: {
							component: component.uuid,
							port: portName,
						},
					});
				}
			}
		}
	}

	const getUuidFromName = (name: string) => {
		const component =
			components.find((c) => c.name === name) ||
			fatal(`Component ${name} not found`);
		return component.uuid;
	};
	for (const [netName, net] of Object.entries(module.netnames)) {
		for (const bit of net.bits) {
			const findCells = (direction: "input" | "output") => {
				return Object.entries(module.cells).filter(([_, cell]) => {
					const connection = Object.entries(cell.connections).find(
						([_, bits]) => bits.includes(bit),
					);
					return (
						(connection ? cell.port_directions[connection[0] as "A"] : null) ===
						direction
					);
				});
			};

			const outputs = [
				...findCells("input"),
				...Object.entries(module.ports).filter(
					([_, port]) => port.bits.includes(bit) && port.direction === "output",
				),
			];

			if (outputs.length === 0) {
				fatal(`No outputs for bit ${bit}`);
			}

			const inputs = [
				...findCells("output"),
				...Object.entries(module.ports).filter(
					([_, port]) => port.bits.includes(bit) && port.direction === "input",
				),
			];

			if (inputs.length === 0) {
				fatal(`No inputs for bit ${bit}`);
			}

			info(
				`Bit ${bit} has ${inputs.length} inputs and ${outputs.length} outputs`,
			);

			const isPort = (port: unknown): port is Port =>
				port !== null && typeof port === "object" && "direction" in port;
			const isCell = (cell: unknown): cell is Cell =>
				cell !== null && typeof cell === "object" && "type" in cell;

			for (const output of outputs) {
				let outputConnection: Generic2DPort;
				if (isPort(output[1])) {
					// console.log("port", output);
					// Connect to the global output component
					outputConnection = {
						component: outputComponent.uuid,
						port: "IO",
					};
				} else if (isCell(output[1])) {
					// console.log("cell", output);
					const [outputName, outputCell] = output;
					const portName = Object.entries(outputCell.connections).find(
						([_, bits]) => bits.includes(bit),
					)?.[0];

					if (!portName) {
						fatal(`No port found for bit ${bit}`);
					}

					outputConnection = {
						component: getUuidFromName(outputName),
						port: portName,
					};
				} else {
					fatal("No output found");
				}

				for (const input of inputs) {
					let inputConnection: Generic2DPort;
					if (isPort(input[1])) {
						// Connect to the global input component
						inputConnection = {
							component: inputComponent.uuid,
							port: "IO",
						};
					} else {
						const [inputName, inputCell] = input;
						const portName = Object.entries(inputCell.connections).find(
							([_, bits]) => bits.includes(bit),
						)?.[0];

						if (!portName) {
							fatal(`No port found for bit ${bit}`);
						}

						inputConnection = {
							component: getUuidFromName(inputName),
							port: portName,
						};
					}

					connections.push({
						start: inputConnection,
						end: outputConnection,
					});
				}
			}
		}
	}

	return { components, connections };
}
