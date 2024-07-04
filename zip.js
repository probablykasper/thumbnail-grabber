import fs from 'node:fs';
import path from 'node:path';
import zipper from 'zip-local';

async function zip(dir, zip_filename) {
	console.log(path.join('dist', dir));
	zipper.sync.zip(dir).compress().save(`dist/${zip_filename}`);
}

const manifest = JSON.parse(fs.readFileSync('package.json'));
if (!fs.existsSync('dist')) {
	fs.mkdirSync('dist');
}
zip('./build/chrome', `${manifest.name}-${manifest.version}-chrome.zip`);
zip('./build/firefox', `${manifest.name}-${manifest.version}-firefox.zip`);
