import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function walk(dir) {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory() && !entry.name.startsWith(".")) {
			return walk(fullPath);
		}
		return fullPath;
	});
}

const files = walk(ROOT).filter((f) => f.endsWith(".env.example"));

files.forEach((examplePath) => {
	const envPath = examplePath.replace(".env.example", ".env");

	if (fs.existsSync(envPath)) {
		console.log(`⏭  ${envPath} existe déjà`);
		return;
	}

	fs.copyFileSync(examplePath, envPath);
	console.log(`✅ Créé ${envPath}`);
});

console.log("Setup des .env terminé");
