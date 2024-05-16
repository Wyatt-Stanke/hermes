import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wsLink, createWSClient } from "@trpc/client";
import React, { useState } from "react";
import { trpc } from "./utils/trpc";
import { Index } from "./Index";
// import SuperJSON from "superjson";

function App() {
	const [queryClient] = useState(() => new QueryClient());
	const [trpcClient] = useState(() =>
		trpc.createClient({
			links: [
				wsLink({
					client: createWSClient({
						url: "ws://localhost:3000",
					}),
				}),
			],
		}),
	);

	return (
		<trpc.Provider client={trpcClient} queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>
				<Index />
			</QueryClientProvider>
		</trpc.Provider>
	);
}

export default App;
