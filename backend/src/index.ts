const nanoseconds = () => {
	if (typeof Bun !== "undefined") {
		return Bun.nanoseconds();
	}
	return performance.now() * 1e6;
};

const startTime = nanoseconds();

// import { SDFFComponent } from "@/components/sdff/sdff";
import { AdderComponent } from "backend/src/components/add/add";
import v, { Vec3 } from "vec3";
import { Schematic } from "backend/src/schematic/schematic";
import { debug, error, fatal, info, warn } from "./logger";
import { Wire } from "./components/wire";
import { writeFile, unlink, readFile, exists } from "node:fs/promises";
import { SDFFComponent, SDFFSafeSchematic } from "./components/sdff/sdff";
import type { Cell, Port, YosysData } from "./types";
import { exec } from "node:child_process";
import {
	Generic2DComponent,
	Generic2DConnection,
	Generic2DCircut,
	Vec2,
	type Generic2DPort,
} from "./layout/generic";
import type { Component } from "./components/component";
import { ConstantComponent } from "./components/constant";
import { annealing2D } from "./layout/annealing2d";

// Schematics folder:
// /Users/wyattstanke/Library/Application Support/com.modrinth.theseus/profiles/Redstone Essentials/config/worldedit/schematics

// await WORLD.savingInterval;
// await SDFFSchematic.paste(WORLD, new Vec3(8, 8, 8));

const outFile =
	"/Users/wyattstanke/Library/Application Support/com.modrinth.theseus/profiles/Redstone Essentials/config/worldedit/schematics/out.schem";
const wire = [v(0, 0, 0), v(1, 0, 0)];
const schem = new Wire(wire).render();
const buffer = await schem.write();
// console.log(SDFFSchematic.blockIndex);
await writeFile(outFile, buffer);

for (const file of ["temp.json", "temp.png", "temp.dot"]) {
	if (await exists(file)) {
		await unlink(file);
	}
}

const binary = "./yosys/yosys";
const source = "./always.v";
const output = "temp.json";

async function runYosys(
	source: string,
	commands: string[],
	modules: string[] = [],
): Promise<YosysData> {
	const binary = "./yosys/yosys";
	const output = "temp.json";
	const command = `${binary} -o ${output} -p "${commands.join("; ")}" ${
		modules.length > 0 ? `-r ${modules.join(" ")} ` : ""
	}${source}`;
	debug(command);
	const process = exec(command);
	await new Promise((resolve) => process.on("exit", resolve));

	const data = (await JSON.parse(await readFile(output, "utf-8"))) as YosysData;

	// Process data
	for (const mod in data.modules) {
		const module = data.modules[mod];
		for (const cell in module.cells) {
			const c = module.cells[cell];
			for (const param in c.parameters) {
				// @ts-ignore
				const val = c.parameters[param];

				if (typeof val === "string" && val.match(/^[01]+$/)) {
					const num = Number.parseInt(val, 2);
					if (!Number.isSafeInteger(num)) {
						fatal(`Number ${num} is not safe`);
					}

					//@ts-ignore
					c.parameters[param] = num;
				}
			}
		}
	}

	return data;
}

// First pass (list mod names)
const result = await runYosys(source, ["proc"]);
const moduleNames = Object.keys(result.modules);

// Second pass (extract data)
// for (const mod of modules) {
const data = await runYosys(
	source,
	[
		"proc",
		"flatten",
		"wreduce",
		"opt",
		"fsm",
		"opt",
		"memory -nomap -nordff",
		"opt",
		"muxpack",
		"peepopt",
		"async2sync",
		"wreduce",
		"opt -mux_bool",
		"clean",
		// "autoname",
		"check",
		"show -colors 1 -format png -prefix temp",
	],
	moduleNames,
);
// }

class IOSignal {
	constructor(
		public name: string,
		public bits: number[],
		public direction: "input" | "output",
	) {}
}

class InternalSignal {
	constructor(
		public name: string,
		public bits: number[],
	) {}
}

const nets = [];

const modules = Object.values(data.modules);
const module = modules[0];

for (const [name, net] of Object.entries(module.netnames)) {
	if (module.ports[name]) {
		const port = module.ports[name];
		nets.push(new IOSignal(name, net.bits, port.direction));
	} else {
		nets.push(new InternalSignal(name, net.bits));
	}
}

// Generate Generic2DLayout
const components: Generic2DComponent[] = [];
const connections: Generic2DConnection[] = [];

for (const [name, cell] of Object.entries(module.cells)) {
	let comp: Component | null = null;
	let tagPorts: Record<string, string> | null = null;

	console.log(cell.parameters);

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
				S: "output-1",
			};
			break;
	}

	if (comp && tagPorts) {
		const schem = comp.render();
		const size2d = new Vec2(schem.size.x, schem.size.z);
		const ports: Map<string, Vec2> = new Map();

		for (const [port, tag] of Object.entries(tagPorts)) {
			const tagLocations = schem.findTag(tag);
			if (tagLocations.length === 0) {
				fatal(`Tag ${tag} not found in component`);
			}
			if (tagLocations.length > 1) {
				warn(`Tag ${tag} found multiple times in component`);
			}
			const tagLocation = tagLocations[0];

			ports.set(port, new Vec2(tagLocation.x, tagLocation.z));
		}

		const genericComp = new Generic2DComponent(name, size2d, ports);

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
				const constant = new Generic2DComponent(
					cellName,
					new Vec2(1, 1),
					new Map().set("output", new Vec2(0, 0)),
				);

				components.push(constant);

				connections.push(
					new Generic2DConnection(
						{ component: constant.uuid, port: "output" },
						{
							component: component.uuid,
							port: portName,
						},
					),
				);
			}
		}
	}
}

// Add connections
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
				const connection = Object.entries(cell.connections).find(([_, bits]) =>
					bits.includes(bit),
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
			let outputConnection: Generic2DPort | "output";
			if (isPort(output[1])) {
				outputConnection = "output";
			} else if (isCell(output[1])) {
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
				let inputConnection: Generic2DPort | "input";
				if (isPort(input[1])) {
					inputConnection = "input";
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

				connections.push(
					new Generic2DConnection(inputConnection, outputConnection),
				);
			}
		}
	}
}

const circut = new Generic2DCircut(components, connections);
const layout = annealing2D(circut);

const workspace = Schematic.empty;

debug(`Took ${(nanoseconds() - startTime) / 1e6} ms`);
