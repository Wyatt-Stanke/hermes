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

export interface Generic2DComponent {
	name: string;
	size: Vec2;
	ports: { [key: string]: Vec2 };
	uuid: UUID;
}

export type Generic2DPort = {
	component: UUID;
	port: string;
};

export interface Generic2DConnection {
	start: Generic2DPort;
	end: Generic2DPort;
}

export interface Generic2DCircut {
	components: Generic2DComponent[];
	connections: Generic2DConnection[];
}

export interface Generic2DLayout {
	components: Generic2DCircut;
	positions: { [key: string]: Vec2 };
}

export interface Generic2DLayoutResult {
	best: Generic2DLayout;
	overtime: {
		[key: number]: Generic2DLayout;
	};
	energy: number;
}
