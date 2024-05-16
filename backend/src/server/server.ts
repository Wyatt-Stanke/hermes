import { appRouter } from "./router";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { WebSocketServer } from "ws";
import cors from "cors";

// const server = createHTTPServer({
// 	router: appRouter,
// 	middleware: cors(),
// 	maxBodySize: 1024 * 1024 * 10,
// 	onError: (error) => {
// 		console.error(error);
// 	},
// });

export function runServer() {
	const wss = new WebSocketServer({
		port: 3000,
	});
	const handler = applyWSSHandler({ wss, router: appRouter });

	wss.on("connection", (ws) => {
		console.log(`+ Connection (${wss.clients.size})`);
		ws.once("close", () => {
			console.log(`- Connection (${wss.clients.size})`);
		});
	});
	console.log("✅ WebSocket Server listening on ws://localhost:3000");

	process.on("SIGTERM", () => {
		console.log("SIGTERM");
		handler.broadcastReconnectNotification();
		wss.close();
	});
}
