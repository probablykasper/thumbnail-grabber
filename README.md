<p align="center">
  <img src="https://raw.githubusercontent.com/probablykasper/thumbnail-grabber/master/src/icon128.png" width="64">
</p>
<h1 align="center">
  Thumbnail Grabber
</h1>
<p align="center">Chrome extension for grabbing thumbnails/covers from YouTube and SoundCloud.</p>
<br>

Easily download/copy/open thumbnails and covers from YouTube and SoundCloud.

You can click the extension icon, use keyboard shortcuts or right click the page or links. You can customize the keyboard shortcuts, what clicking the extension icon does, and what context menu items are visible.

# Dev Instructions

### Folder info
`/src`
`/src/modules`
Files that should not be compiled/copies should be in the `/src/modules` folder.

### Setup
1. Install [Node.js](https://nodejs.org/) (Version 12.11 or later recommended)
2. Run `npm install` to install dependencies

### Commands
Build `/src` into `/build` and watch for changes. You can then load the `/build` folder as an unpacked extension in your browser.
```
npm run start
```

Zip the extension into `/dist`, ready to be uploaded to the Chrome Web Store and such. You'll be prompted to type in the version number.
```
npm run zip
```
