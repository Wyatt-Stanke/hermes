import { v4 } from "uuid";

export class Vec2 {
	x = 0;
	y = 0;

	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}

	add(v: Vec2) {
		return new Vec2(this.x + v.x, this.y + v.y);
	}

	sub(v: Vec2) {
		return new Vec2(this.x - v.x, this.y - v.y);
	}

	mul(s: number) {
		return new Vec2(this.x * s, this.y * s);
	}

	div(s: number) {
		return new Vec2(this.x / s, this.y / s);
	}

	len() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}
}

export class UUID {
	constructor(public uuid: string = v4()) {}
}

export class Generic2DComponent {
	constructor(
		public name: string,
		public size: Vec2,
		public ports: Map<string, Vec2>,
		public uuid: UUID = new UUID(),
	) {}
}

export type Generic2DPort = {
	component: UUID;
	port: string;
};

export class Generic2DConnection {
	constructor(
		public start: Generic2DPort | "input",
		public end: Generic2DPort | "output",
	) {}
}

export class Generic2DCircut {
	constructor(
		public components: Generic2DComponent[],
		public connections: Generic2DConnection[],
	) {}
}

export class Generic2DLayout {
	constructor(
		public components: Generic2DCircut,
		public positions: Map<UUID, Vec2>,
	) {}
}
