import { createHTTPServer } from "@trpc/server/adapters/standalone";
import { appRouter } from "./router";
import cors from "cors";

const server = createHTTPServer({
	router: appRouter,
	middleware: cors(),
});

export function runServer() {
	server.listen(3000, () => {
		console.log("Server listening on port 3000");
	});
}
