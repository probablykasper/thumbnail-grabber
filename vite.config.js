import { defineConfig } from 'vite';
import web_extension, { readJsonFile } from 'vite-plugin-web-extension';

const browser = process.env.TARGET || 'chrome';

export default defineConfig({
	plugins: [
		web_extension({
			manifest() {
				const manifest = readJsonFile('src/manifest.json');
				const pkg = readJsonFile('package.json');
				return {
					name: pkg.name,
					description: pkg.description,
					version: pkg.version,
					...manifest,
				};
			},
			watchFilePaths: ['package.json', 'src/manifest.json'],
			disableAutoLaunch: true,
			browser,
			additionalInputs: ['src/content-script.ts', 'src/content-script.css'],
		}),
	],
	build: {
		outDir: `build/${browser}`,
		emptyOutDir: true,
		minify: false,
	},
});
