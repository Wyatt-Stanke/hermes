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
import { debug } from "./logger";
import { Wire } from "./components/wire";
import { writeFile } from "node:fs/promises";
import { SDFFSafeSchematic } from "./components/sdff/sdff";

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

// const names = await SDFFSchematic.map((block) => {
// 	return block.name;
// });

// const counts = names.reduce(
// 	(acc, name) => {
// 		acc[name] = (acc[name] || 0) + 1;
// 		return acc;
// 	},
// 	{} as Record<string, number>,
// );

// console.log(counts);
// console.log(SDFFSchematic.blockTags.map((x) => `${x[0]}: ${x[1]}`).join("\n"));

// import { $, file } from "bun";
// import type { YosysData } from "./types";
// import { unlink } from "node:fs/promises";

// await unlink("temp.json");
// await unlink("temp.png");
// await unlink("temp.dot");

// const binary = "./yosys/yosys";
// const source = "./yosys/tests/simple/always01.v";
// const output = "temp.json";

// async function runYosys(
// 	source: string,
// 	commands: string[],
// 	modules: string[] = [],
// ): Promise<YosysData> {
// 	const binary = "./yosys/yosys";
// 	const output = "temp.json";
// 	await $`${binary} -o ${output} -p "${commands.join("; ")}" ${
// 		modules.length > 0 ? `-r ${modules.join(" ")}` : ""
// 	} ${source}`.quiet();
// 	return await file(output).json();
// }

// // First pass (list mod names)
// const result = await runYosys(source, ["proc"]);
// const modules = Object.keys(result.modules);

// // Second pass (extract data)
// for (const mod of modules) {
// 	const data = await runYosys(
// 		source,
// 		[
// 			"proc",
// 			"flatten",
// 			"wreduce",
// 			"opt",
// 			"fsm",
// 			"opt",
// 			"memory -nomap -nordff",
// 			"opt",
// 			"muxpack",
// 			"peepopt",
// 			"async2sync",
// 			"wreduce",
// 			"opt -mux_bool",
// 			"clean",
// 			// "autoname",
// 			"check",
// 			"show -colors 1 -format png -prefix temp",
// 		],
// 		[mod],
// 	);
// }

debug(`Took ${(nanoseconds() - startTime) / 1e6} ms`);
