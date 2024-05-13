const nanoseconds = () => {
	if (typeof Bun !== "undefined") {
		return Bun.nanoseconds();
	}
	return performance.now() * 1e6;
};

const startTime = nanoseconds();

// import { SDFFComponent } from "@/components/sdff/sdff";
import { AdderComponent } from "@/components/add/add";
import v, { Vec3 } from "vec3";
import { Schematic } from "@/schematic/schematic";
import { debug, error, fatal, info, warn } from "./logger";
import { Wire } from "./components/wire";
import { writeFile, unlink, readFile, exists } from "node:fs/promises";
import { SDFFComponent, SDFFSafeSchematic } from "./components/sdff/sdff";
import type { Cell, Port, YosysData } from "@/yosys/types";
import type {
	Generic2DComponent,
	Generic2DConnection,
	Generic2DCircut,
	Vec2,
	Generic2DPort,
} from "./layout/generic";
import type { Component } from "./components/component";
import { ConstantComponent } from "./components/constant";
import { annealing2D } from "./layout/annealing2d";
import { runServer } from "./server/server";
import { compile } from "./yosys";
import { generateComponentsAndConnections } from "./components";

if (process.argv[2] === "server") {
	runServer();
	await new Promise(() => {});
}

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

const data = await compile(await readFile(source).then((b) => b.toString()));
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

const { components, connections } = generateComponentsAndConnections(module);
const circut: Generic2DCircut = { components, connections };
const layout = annealing2D(circut);

const workspace = Schematic.empty;

debug(`Took ${(nanoseconds() - startTime) / 1e6} ms`);
