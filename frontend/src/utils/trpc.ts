import { createTRPCReact } from "@trpc/react-query";
// TODO: direct import since importing from index.ts doesn't work
import type { AppRouter } from "@hermes/backend/src/server/router";

export const trpc = createTRPCReact<AppRouter>();
