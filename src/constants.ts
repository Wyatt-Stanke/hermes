import getData from "minecraft-data";
import getRegistry from "prismarine-registry";
import getChunk, { type PCChunk } from "prismarine-chunk";
import getBlock from "prismarine-block";

export const VERSION = "1.20.4";

export const data = getData(VERSION);
export const Chunk = getChunk(VERSION) as typeof PCChunk;
export const Registry = getRegistry(VERSION);
export const Block = getBlock(Registry);
export type DataBlock = (typeof Registry.blocks)[number];
