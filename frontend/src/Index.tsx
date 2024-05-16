import { useEffect, useRef, useState } from "react";
import { trpc } from "./utils/trpc";
import type { Module, YosysData } from "@hermes/backend/src/yosys/types";

export function Index() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	// Modules and selected module
	const [modules, setModules] = useState<Module[]>([]);
	const [selectedModule, setSelectedModule] = useState<number | null>(null);
	const [iteration, setIteration] = useState<number | null>(null);
	const [iterations, setIterations] = useState(1000);
	const [temperature, setTemperature] = useState(1000);
	const [cooling, setCooling] = useState(0.999);
	const compiled = trpc.compile.useQuery({
		source: `
module uut_always01(clock, reset, count);

input clock, reset;
output [7:0] count;
reg [7:0] count;

always @(posedge clock)
	count <= reset ? 0 : count + 1;

endmodule`,
	});
	// Set modules based on compiled data
	useEffect(() => {
		if (compiled.data) {
			setModules(Object.values((compiled.data as YosysData).modules));
		}
	}, [compiled.data]);

	const circut = trpc.generateGeneric2dLayout.useQuery(
		{
			module: modules[selectedModule ?? -1],
		},
		{
			enabled: selectedModule !== null,
		},
	);
	const layout = trpc.anneal2d.useQuery(
		{
			components: circut.data?.components as any[],
			connections: circut.data?.connections as any[],
			iterations,
			temperature,
			cooling,
		},
		{
			enabled: circut.data !== null && circut.data?.components.length > 0,
		},
	);
	useEffect(() => {
		if (canvasRef.current && layout.data) {
			const ctx = canvasRef.current.getContext("2d");
			if (ctx) {
				ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

				// Figure out the size of the layout
				let minX = 0;
				let minY = 0;
				let maxX = 0;
				let maxY = 0;

				const best =
					iteration !== null
						? layout.data.overtime[iteration]
						: layout.data.best;

				for (const component of best.components.components) {
					const position = best.positions[component.uuid.uuid];
					minX = Math.min(minX, position.x);
					minY = Math.min(minY, position.y);
					maxX = Math.max(maxX, position.x + component.size.x);
					maxY = Math.max(maxY, position.y + component.size.y);
				}

				// Shift it down a bit so we can see the top left corner
				minX -= 3;
				minY -= 3;

				const scalingFactor = Math.min(
					(canvasRef.current.width - 20) / (maxX - minX),
					(canvasRef.current.height - 20) / (maxY - minY),
				);

				const transformXY = (x: number, y: number) => ({
					x: (x - minX) * scalingFactor,
					y: (y - minY) * scalingFactor,
				});

				const portPositions: Record<string, { x: number; y: number }> = {};

				for (const component of best.components.components) {
					const position = best.positions[component.uuid.uuid];
					const canvasPosition = {
						x: (position.x - minX) * scalingFactor,
						y: (position.y - minY) * scalingFactor,
						height: component.size.y * scalingFactor,
						width: component.size.x * scalingFactor,
					};

					ctx.strokeStyle = "red";
					ctx.strokeRect(
						canvasPosition.x,
						canvasPosition.y,
						canvasPosition.width,
						canvasPosition.height,
					);

					// Draw a grid of squares based on the size of the component
					ctx.strokeStyle = "lightgray";
					for (let x = 0; x < component.size.x; x++) {
						for (let y = 0; y < component.size.y; y++) {
							ctx.strokeRect(
								canvasPosition.x + x * scalingFactor,
								canvasPosition.y + y * scalingFactor,
								scalingFactor,
								scalingFactor,
							);
						}
					}

					// write the name of the component
					ctx.fillStyle = "black";
					ctx.font = "12px sans-serif";
					ctx.fillText(component.name, canvasPosition.x, canvasPosition.y - 3);

					// draw the ports
					for (const [portName, portPosition] of Object.entries(
						component.ports,
					)) {
						const portCanvasPosition = {
							x: (position.x + portPosition.x - minX + 0.5) * scalingFactor,
							y: (position.y + portPosition.y - minY + 0.5) * scalingFactor,
						};

						ctx.fillStyle = "blue";
						ctx.fillRect(portCanvasPosition.x, portCanvasPosition.y, 3, 3);
						ctx.fillText(
							portName,
							portCanvasPosition.x + 5,
							portCanvasPosition.y + 5,
						);

						portPositions[component.uuid.uuid + portName] = portCanvasPosition;
					}
				}

				// Draw the connections
				for (const connection of best.components.connections) {
					const start = connection.start;
					const end = connection.end;

					const startPortPosition: { x: number; y: number } =
						portPositions[start.component.uuid + start.port];

					if (!startPortPosition) {
						console.error(
							"Could not find position for port",
							start.component.uuid,
							start.port,
						);
						continue;
					}

					const endPortPosition: { x: number; y: number } =
						portPositions[end.component.uuid + end.port];

					ctx.strokeStyle = "black";
					ctx.beginPath();
					ctx.moveTo(startPortPosition.x, startPortPosition.y);
					ctx.lineTo(endPortPosition.x, endPortPosition.y);
					ctx.stroke();
				}
			}
		}
	}, [layout.data, iteration]);

	return (
		<div>
			<h2>Modules</h2>
			<ul>
				{compiled.data &&
					Object.entries((compiled.data as YosysData).modules).map(
						([name], i) => (
							<li key={name}>
								<button type="button" onClick={() => setSelectedModule(i)}>
									{name}
								</button>
							</li>
						),
					)}
			</ul>
			<p>Selected: {selectedModule}</p>
			<h2>Layout</h2>
			<h3>Components</h3>
			{circut.data?.components.map((component) => (
				<div key={component.uuid.uuid}>
					<span>{component.name} | </span>
					<span>
						{component.size.x} x {component.size.y}
					</span>
					<span> | {Object.keys(component.ports).length} ports</span>
				</div>
			))}
			{/* {JSON.stringify(circut.data, null, 2)} */}
			<canvas ref={canvasRef} width={800} height={600} />
			<br />
			{layout.data?.energy}
			<br />
			{/* Input amount of iterations, temperature, and cooling */}
			<label htmlFor="iterations">Iterations</label>
			<input
				type="number"
				id="iterations"
				value={iterations}
				onChange={(e) => setIterations(Number(e.target.value))}
			/>
			<label htmlFor="temperature">Temperature</label>
			<input
				type="number"
				id="temperature"
				value={temperature}
				onChange={(e) => setTemperature(Number(e.target.value))}
			/>
			<label htmlFor="cooling">Cooling</label>
			<input
				type="number"
				id="cooling"
				value={cooling}
				onChange={(e) => setCooling(Number(e.target.value))}
			/>
			{/* Iteration selector -- allows you to slide through all of the numbers from Object.keys(layout.overtime) */}
			<input
				type="range"
				id="iteration"
				min={0}
				max={layout.data ? Object.keys(layout.data.overtime).length - 1 : 0}
				step={1}
				onChange={(e) =>
					setIteration(
						Number.parseInt(
							Object.keys(layout.data.overtime)[e.target.valueAsNumber],
						),
					)
				}
			/>
			<label htmlFor="iteration">Iteration: {iteration}</label>

			<pre>{JSON.stringify(compiled.data, null, 2)}</pre>
		</div>
	);
}
