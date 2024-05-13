import { compile } from "@/yosys";
import { publicProcedure, router } from "./trpc";
import { z } from "zod";
import { moduleSchema } from "@/yosys/schemas";
import type { YosysData } from "@/yosys/types";
import { generateComponentsAndConnections } from "@/components";
import type {
	Generic2DCircut,
	Generic2DComponent,
	Generic2DConnection,
} from "@/layout/generic";
import { annealing2D } from "@/layout/annealing2d";

export const appRouter = router({
	compile: publicProcedure
		.input(z.object({ source: z.string() }))
		.query(async ({ input }): Promise<YosysData> => {
			return await compile(input.source);
		}),
	generateGeneric2dLayout: publicProcedure
		.input(z.object({ module: moduleSchema }))
		.query(async ({ input }) => {
			return generateComponentsAndConnections(input.module);
		}),
	anneal2d: publicProcedure
		.input(
			z.object({
				// TOOD: add schema
				components: z.array(z.any()),
				connections: z.array(z.any()),
				iterations: z.number(),
				temperature: z.number(),
				cooling: z.number(),
			}),
		)
		.query(async ({ input }) => {
			return annealing2D(
				{
					components: input.components as Generic2DComponent[],
					connections: input.connections as Generic2DConnection[],
				},
				input.iterations,
				input.temperature,
				input.cooling,
			);
		}),
});

export type AppRouter = typeof appRouter;
