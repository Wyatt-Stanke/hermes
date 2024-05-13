import type { z } from "zod";

import type * as generated from "./schemas";

export type Port = z.infer<typeof generated.portSchema>;
export type CellBase = z.infer<typeof generated.cellBaseSchema>;
export type UnaryCell = z.infer<typeof generated.unaryCellSchema>;
export type BinaryCell = z.infer<typeof generated.binaryCellSchema>;
export type Mux = z.infer<typeof generated.muxSchema>;
export type PMux = z.infer<typeof generated.pMuxSchema>;
export type SR = z.infer<typeof generated.srSchema>;
export type Dff = z.infer<typeof generated.dffSchema>;
export type ADff = z.infer<typeof generated.aDffSchema>;
export type SDff = z.infer<typeof generated.sDffSchema>;
export type Dffsr = z.infer<typeof generated.dffsrSchema>;
export type Dffe = z.infer<typeof generated.dffeSchema>;
export type ADffe = z.infer<typeof generated.aDffeSchema>;
export type SDffe = z.infer<typeof generated.sDffeSchema>;
export type Dffsre = z.infer<typeof generated.dffsreSchema>;
export type Mem = z.infer<typeof generated.memSchema>;
export type Print = z.infer<typeof generated.printSchema>;
export type Cell = z.infer<typeof generated.cellSchema>;
export type Net = z.infer<typeof generated.netSchema>;
export type Module = z.infer<typeof generated.moduleSchema>;
export type YosysData = z.infer<typeof generated.yosysDataSchema>;
