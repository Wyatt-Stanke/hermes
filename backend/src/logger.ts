import * as c from "colorette";

export function debug(message: string) {
	console.log(c.bold(c.gray(" DEBUG ")) + message);
}

export function info(message: string) {
	console.log(c.bold(c.blueBright(" INFO ")) + message);
}

export function warn(message: string) {
	console.log(c.bold(c.yellow(" WARN ")) + message);
}

export function error(message: string) {
	console.log(c.bold(c.red(" ERROR ")) + message);
}

export function fatal(message: string): never {
	console.log(c.bold(c.red(" FATAL ✖ ")) + message);
	const error = new Error(message);
	Error.captureStackTrace(error, fatal); // Capture stack trace starting from the caller of `fatal`
	throw error;
}
