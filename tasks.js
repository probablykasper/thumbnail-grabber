const src = 'src/**/*';
const modules = 'src/modules/**/*'; // these won't be compiled

const buildDest = 'build';
const tempBuildDest = 'temp-build';

const extensionZipSrc = 'temp-build/**/*';
const extensionZipDest = 'dist';
const extensionManifest = 'src/manifest.json';
const extensionZipName = (manifest) => `${manifest.name}-${manifest.version}-chrome.zip`;

require('clarify'); // hides nodecore from stack trace
const del = require('del');
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const inquirer = require('inquirer');
const Bundler = require('parcel-bundler');
const { performance } = require('perf_hooks');
require('colorboy')
  .addColor('green', { color: '#00FE7C', style: ['bold'] })
  .addColor('red', { color: '#FF0066' })
  .addColor('cyan', { color: 'cyan', style: ['bold'] });
const tasks = {};

async function bundle(options) {
  del.sync(options.dest);
  const srcFiles = await new Promise((resolve, reject) => {
    glob(src, { nodir: true, ignore: modules }, (err, files) => {
      if (err) reject(err);
      resolve(files);
    });
  });
  const bundler = new Bundler(srcFiles, {
    outDir: options.dest,
    target: 'browser',
    // pug.config.js gets cached, so turn caching off if it exists
    cache: !fs.existsSync('pug.config.js'),
    logLevel: 3, // 3 = everything, 2 = warnings & errors, 1 = errors
    hmr: false,
    sourceMaps: true,
    // minify: false, // needs to be false for sourcemaps to work
    watch: options.watch,
  });
  bundler.addAssetType('.json', require.resolve('./JSONAsset.js'));
  await bundler.bundle();
  return bundler;
}

tasks['extension:watch'] = async(done, cancel) => {
  return new Promise(() => {
    bundle({ watch: true, dest: buildDest });
    process.on('SIGINT', () => {
      cancel();
    });
  });
};

tasks['extension:zip'] = async(done, cancel) => {
  process.env.NODE_ENV = 'production';
  const manifest = JSON.parse(fs.readFileSync(extensionManifest));
  const answers = await inquirer.prompt({
    type: 'input',
    name: 'version',
    default: manifest.version,
    message: 'version:',
  });
  manifest.version = answers.version;

  const zipFilename = extensionZipName(manifest);

  if (fs.existsSync(path.join(extensionZipDest, zipFilename))) {
    const answers = await inquirer.prompt({
      type: 'confirm',
      name: 'replace',
      default: false,
      message: 'That version already exists. Replace?',
    });
    if (answers.replace == false) {
      del.sync(tempBuildDest);
      cancel();
      return;
    }
  }

  fs.writeFileSync(extensionManifest, JSON.stringify(manifest, null, 2)+'\n');
  await bundle({ watch: false, dest: tempBuildDest });

  const files = await new Promise((resolve, reject) => {
    glob(extensionZipSrc, { nodir: true, ignore: modules }, (err, files) => {
      if (err) reject(err);
      resolve(files);
    });
  });
  
  const yazl = require('yazl');
  const zipfile = new yazl.ZipFile();
  files.forEach((file) => {
    zipfile.addFile(file, path.relative(tempBuildDest, file));
  });
  
  zipfile.end();
  const zipPath = path.join(extensionZipDest, zipFilename);
  await new Promise((resolve) => {
    if (!fs.existsSync(extensionZipDest)) fs.mkdirSync(extensionZipDest);
    zipfile.outputStream.pipe(fs.createWriteStream(zipPath)).on('close', () => {
      del.sync(tempBuildDest);
      resolve();
    });
  });
  done();
};

async function runTask(taskName, ...args) {
  const task = tasks[taskName];
  const loggingTaskName = `'${taskName}'`.cyan;
  if (task) {
    console.log(`Running task ${loggingTaskName}`);
    try {
      const startTime = performance.now();
      task(
        () => {
          const endTime = performance.now();
          const timeTaken = ((endTime - startTime)/1000).toFixed(1)+'s';
          console.log(`Finished task ${loggingTaskName} after ${timeTaken.green}`);
          process.exit(0);
        },
        () => {
          process.stdout.clearLine();
          process.stdout.cursorTo(0);
          process.exit(0);
        },
        ...args,
      );
    } catch(error) {
      console.error('Error running task '.red, loggingTaskName+':'.red);
      console.error(error);
      process.exit();
    }
  } else if (taskName) {
    console.log(`Invalid task ${taskName}`.red);
  }
  else console.log('No task specified'.red);
}

let taskName;
for (let i = 0; i < process.argv.length; i++) {
  if (process.argv[i] == '--task') taskName = process.argv[i+1];
}
runTask(taskName);
