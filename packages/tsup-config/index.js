const { defineConfig } = require("tsup");

module.exports = defineConfig((options) => ({
	format: ["cjs", "esm"],
	dts: true,
	outDir: "dist",
	entryPoints: ["src/index.ts"],
	...options,
}));
