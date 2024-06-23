const fs = require('node:fs');
const gulp = require('gulp');
const zip = require('gulp-zip');

gulp.task('zip', async () => {
	const manifest = JSON.parse(fs.readFileSync('src/manifest.json'));
	const zipFilename = `${manifest.name}-${manifest.version}-chrome-firefox.zip`;
	console.log(`dist/${zipFilename}`);
	return gulp.src('build/**/*').pipe(zip(zipFilename)).pipe(gulp.dest('dist'));
});
