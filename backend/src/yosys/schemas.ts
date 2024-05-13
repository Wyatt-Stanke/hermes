import { z } from "zod";

export const portSchema = z.object({
	direction: z.union([z.literal("input"), z.literal("output")]),
	bits: z.array(z.number()),
});

const connSchema = z.array(z.union([z.number(), z.string()]));

export const cellBaseSchema = z.object({
	hide_name: z.number(),
	type: z.string(),
	parameters: z.record(z.union([z.number(), z.string()])),
	attributes: z.object({
		src: z.string(),
		full_case: z.string().optional(),
	}),
	port_directions: z.record(z.union([z.literal("input"), z.literal("output")])),
	connections: z.record(connSchema),
});

export const unaryCellSchema = cellBaseSchema.extend({
	type: z.union([
		z.literal("$not"),
		z.literal("$pos"),
		z.literal("$neg"),
		z.literal("$reduce_and"),
		z.literal("$reduce_or"),
		z.literal("$reduce_xor"),
		z.literal("$reduce_xnor"),
		z.literal("$reduce_bool"),
		z.literal("$logic_not"),
	]),
	parameters: z.object({
		A_SIGNED: z.number(),
		A_WIDTH: z.number(),
		Y_WIDTH: z.number(),
	}),
	connections: z.object({
		A: connSchema,
		Y: z.array(z.number()),
	}),
});

export const binaryCellSchema = cellBaseSchema.extend({
	type: z.union([
		z.literal("$and"),
		z.literal("$or"),
		z.literal("$xor"),
		z.literal("$xnor"),
		z.literal("$shl"),
		z.literal("$shr"),
		z.literal("$sshl"),
		z.literal("$sshr"),
		z.literal("$logic_and"),
		z.literal("$logic_or"),
		z.literal("$eqx"),
		z.literal("$nex"),
		z.literal("$lt"),
		z.literal("$le"),
		z.literal("$eq"),
		z.literal("$ne"),
		z.literal("$ge"),
		z.literal("$gt"),
		z.literal("$add"),
		z.literal("$sub"),
		z.literal("$mul"),
		z.literal("$div"),
		z.literal("$mod"),
		z.literal("$pow"),
	]),
	parameters: z.object({
		A_SIGNED: z.number(),
		A_WIDTH: z.number(),
		B_SIGNED: z.number(),
		B_WIDTH: z.number(),
		Y_WIDTH: z.number(),
	}),
	port_directions: z.object({
		A: z.literal("input"),
		B: z.literal("input"),
		Y: z.literal("output"),
	}),
	connections: z.object({
		A: connSchema,
		B: connSchema,
		Y: z.array(z.number()),
	}),
});

export const muxSchema = cellBaseSchema.extend({
	type: z.literal("$mux"),
	parameters: z.object({
		WIDTH: z.number(),
	}),
	connections: z.object({
		A: connSchema,
		B: connSchema,
		S: connSchema,
		Y: z.array(z.number()),
	}),
});

export const pMuxSchema = cellBaseSchema.extend({
	type: z.literal("$pmux"),
	parameters: z.object({
		WIDTH: z.number(),
		S_WIDTH: z.number(),
	}),
	connections: z.object({
		A: connSchema,
		B: connSchema,
		S: connSchema,
		Y: z.array(z.number()),
	}),
});

export const srSchema = cellBaseSchema.extend({
	type: z.literal("$sr"),
	parameters: z.object({
		WIDTH: z.number(),
		SET_POLARITY: z.number(),
		CLR_POLARITY: z.number(),
	}),
	connections: z.object({
		SET: connSchema,
		CLR: connSchema,
		Q: z.array(z.number()),
	}),
});

export const dffSchema = cellBaseSchema.extend({
	type: z.literal("$dff"),
	parameters: z.object({
		WIDTH: z.number(),
		CLK_POLARITY: z.number(),
	}),
	connections: z.object({
		CLK: connSchema,
		D: connSchema,
		Q: z.array(z.number()),
	}),
});

export const aDffSchema = cellBaseSchema.extend({
	type: z.literal("$adff"),
	parameters: z.object({
		WIDTH: z.number(),
		CLK_POLARITY: z.number(),
		ARST_POLARITY: z.number(),
		ARST_VALUE: z.number(),
	}),
	connections: z.object({
		CLK: connSchema,
		D: connSchema,
		ARST: connSchema,
		Q: z.array(z.number()),
	}),
});

export const sDffSchema = cellBaseSchema.extend({
	type: z.literal("$sdff"),
	parameters: z.object({
		WIDTH: z.number(),
		CLK_POLARITY: z.number(),
		SRST_POLARITY: z.number(),
		SRST_VALUE: z.number(),
	}),
	connections: z.object({
		CLK: connSchema,
		D: connSchema,
		SRST: connSchema,
		Q: z.array(z.number()),
	}),
});

export const dffsrSchema = cellBaseSchema.extend({
	type: z.literal("$dffsr"),
	parameters: z.object({
		WIDTH: z.number(),
		CLK_POLARITY: z.number(),
		SET_POLARITY: z.number(),
		CLR_POLARITY: z.number(),
	}),
	connections: z.object({
		CLK: connSchema,
		D: connSchema,
		SET: connSchema,
		CLR: connSchema,
		Q: z.array(z.number()),
	}),
});

export const dffeSchema = cellBaseSchema.extend({
	type: z.literal("$dffe"),
	parameters: z.object({
		WIDTH: z.number(),
		CLK_POLARITY: z.number(),
		EN_POLARITY: z.number(),
	}),
	connections: z.object({
		CLK: connSchema,
		D: connSchema,
		EN: connSchema,
		Q: z.array(z.number()),
	}),
});

export const aDffeSchema = cellBaseSchema.extend({
	type: z.literal("$adffe"),
	parameters: z.object({
		WIDTH: z.number(),
		CLK_POLARITY: z.number(),
		EN_POLARITY: z.number(),
		ARST_POLARITY: z.number(),
		ARST_VALUE: z.number(),
	}),
	connections: z.object({
		CLK: connSchema,
		D: connSchema,
		EN: connSchema,
		ARST: connSchema,
		Q: z.array(z.number()),
	}),
});

export const sDffeSchema = cellBaseSchema.extend({
	type: z.union([z.literal("$sdffe"), z.literal("$sdffce")]),
	parameters: z.object({
		WIDTH: z.number(),
		CLK_POLARITY: z.number(),
		EN_POLARITY: z.number(),
		SRST_POLARITY: z.number(),
		SRST_VALUE: z.number(),
	}),
	connections: z.object({
		CLK: connSchema,
		D: connSchema,
		EN: connSchema,
		SRST: connSchema,
		Q: z.array(z.number()),
	}),
});

export const dffsreSchema = cellBaseSchema.extend({
	type: z.literal("$dffsre"),
	parameters: z.object({
		WIDTH: z.number(),
		CLK_POLARITY: z.number(),
		EN_POLARITY: z.number(),
		SET_POLARITY: z.number(),
		CLR_POLARITY: z.number(),
	}),
	connections: z.object({
		CLK: connSchema,
		D: connSchema,
		EN: connSchema,
		SET: connSchema,
		CLR: connSchema,
		Q: z.array(z.number()),
	}),
});

export const memSchema = cellBaseSchema.extend({
	type: z.literal("$mem_v2"),
	parameters: z.object({
		MEMID: z.string(),
		SIZE: z.number(),
		ABITS: z.number(),
		WIDTH: z.number(),
		INIT: z.string(),
		OFFSET: z.number(),
		RD_PORTS: z.number(),
		RD_WIDE_CONTINUATION: z.number(),
		RD_CLK_ENABLE: z.number(),
		RD_CLK_POLARITY: z.number(),
		RD_TRANSPARENCY_MASK: z.number(),
		RD_COLLISION_X_MASK: z.number(),
		RD_CE_OVER_SRST: z.number(),
		RD_INIT_VALUE: z.string(),
		RD_ARST_VALUE: z.string(),
		RD_SRST_VALUE: z.string(),
		WR_PORTS: z.number(),
		WR_WIDE_CONTINUATION: z.number(),
		WR_CLK_ENABLE: z.number(),
		WR_CLK_POLARITY: z.number(),
		WR_PRIORITY_MASK: z.number(),
	}),
	connections: z.object({
		RD_CLK: connSchema,
		RD_EN: connSchema,
		RD_ADDR: connSchema,
		RD_DATA: z.array(z.number()),
		RD_ARST: connSchema,
		RD_SRST: connSchema,
		WR_CLK: connSchema,
		WR_EN: connSchema,
		WR_ADDR: connSchema,
		WR_DATA: connSchema,
	}),
});

export const printSchema = cellBaseSchema.extend({
	type: z.literal("$print"),
});

export const cellSchema = z.union([
	unaryCellSchema,
	binaryCellSchema,
	muxSchema,
	pMuxSchema,
	srSchema,
	dffSchema,
	aDffSchema,
	sDffSchema,
	dffsrSchema,
	dffeSchema,
	aDffeSchema,
	sDffeSchema,
	dffsreSchema,
	memSchema,
	printSchema,
]);

export const netSchema = z.object({
	hide_name: z.number(),
	attributes: z.record(z.string()),
	bits: z.array(z.number()),
});

export const moduleSchema = z.object({
	attributes: z.record(z.string()),
	parameter_default_values: z.record(z.string()).optional(),
	ports: z.record(portSchema),
	cells: z.record(cellSchema),
	netnames: z.record(netSchema),
});

export const yosysDataSchema = z.object({
	creator: z.string(),
	modules: z.record(moduleSchema),
});
