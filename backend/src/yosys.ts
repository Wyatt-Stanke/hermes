import { debug, fatal } from "./logger";
import { exec } from "node:child_process";
import { readFile, writeFile, exists, unlink } from "node:fs/promises";
import type { YosysData } from "./yosys/types";

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

export async function compile(source: string): Promise<YosysData> {
	if (await exists("temp.v")) {
		await unlink("temp.v");
	}

	await writeFile("temp.v", source);

	// First pass (list mod names)
	const result = await runYosys("temp.v", ["proc"]);
	const moduleNames = Object.keys(result.modules);

	// Second pass (extract data)
	// for (const mod of modules) {
	const data = await runYosys(
		"temp.v",
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

	return data;
}
