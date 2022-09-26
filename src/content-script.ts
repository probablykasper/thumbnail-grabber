var thumbnailGrabber = document.createElement('div');
thumbnailGrabber.id = 'thumbnail-grabber';

thumbnailGrabber.innerHTML = `
<div id="thumbnail-grabber-card">
  <img>
  <div id="thumbnail-grabber-buttons">
    <div><p>DOWNLOAD</p></div>
    <div><p>COPY</p></div>
    <div><p>OPTIONS</p></div>
  </div>
</div>
`;
var notificationInnerHTML = `
<p>x</p>
<img></img>
<p></p>
`;

function notify(msg) {
	var notificationElement = document.createElement('div');
	notificationElement.innerHTML = notificationInnerHTML;
	notificationElement.classList.add('thumbnail-grabber-notification');
	const lastChild = notificationElement.querySelector('p:last-child')
	if (!(lastChild instanceof HTMLElement)) {
		throw alert('No p:last-child');
	}
	lastChild.textContent = msg;

	const firstChild = notificationElement.querySelector('p:first-child')
	if (!(firstChild instanceof HTMLElement)) {
		throw alert('No p:first-child');
	}
	firstChild.addEventListener(
		'click',
		function () {
			notificationElement.style.animation = 'none';
			requestAnimationFrame(function () {
				notificationElement.classList.add(
					'thumbnail-grabber-notification-removing',
				);
				setTimeout(function () {
					if (notificationElement.parentElement) {
						notificationElement.parentElement.removeChild(notificationElement);
					}
				}, 500);
			});
		},
	);

	var icon = chrome.runtime.getURL('icon48.png');
	const iconImgElement = notificationElement.querySelector('img')
	if (!(iconImgElement instanceof HTMLElement)) {
		throw alert('No iconImgElement');
	}
	iconImgElement.src = icon;

	document.body.appendChild(notificationElement);
	setTimeout(function () {
		if (notificationElement.parentElement) {
			notificationElement.parentElement.removeChild(notificationElement);
		}
	}, 5000);
}

async function getYouTubeThumbnail(id) {
	const urls = [
		`https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
		`https://img.youtube.com/vi/${id}/hqdefault.jpg`,
		`https://img.youtube.com/vi/${id}/sddefault.jpg`,
	];
	for (const url of urls) {
		const response = await fetch(url);
		if (response.ok) {
			console.log('YT thumbnail URL', url);
			return url;
		} else if (response.status !== 404) {
			throw new Error(`Error getting thumbnail: ${response.status}`);
		}
	}
	throw 'No thumbnail found';
}

function googleUserContentUrl(urlObj) {
	// This is a `googleusercontent.com` url, which ends in something
	// like `=w60-h60-l90-rj`. Not sure what `l90` or `rj` mean, but it seems
	// to be the same without them. We replace all of this with `=s0` to get
	// the original size of the image.
	// Info about `googleusercontent.com` urls:
	// https://sites.google.com/site/picasaresources/Home/Picasa-FAQ/google-photos-1/how-to/how-to-get-a-direct-link-to-an-image
	var imgPathname = `${urlObj.pathname.split('=')[0]}=s0`;
	return urlObj.origin + imgPathname + urlObj.search + urlObj.hash;
}

var img = thumbnailGrabber.querySelector('img');

function getSite(newUrl) {
	const url = new URL(newUrl);
	return {
		soundcloud: url.hostname.endsWith('soundcloud.com'),
		youtubeMusic:
			url.hostname === 'music.youtube.com' &&
			url.pathname === '/watch' &&
			url.searchParams.has('v'),
		youtubeMusicPlaylist:
			url.hostname === 'music.youtube.com' &&
			url.pathname === '/playlist' &&
			url.searchParams.has('list'),
		youtube:
			url.hostname.endsWith('youtube.com') &&
			!url.hostname.includes('music') &&
			url.pathname === '/watch' &&
			url.searchParams.has('v'),
		spotify: url.hostname === 'open.spotify.com',
	};
}

async function getImageUrlCustom(newUrl) {
	const site = getSite(newUrl);
	if (site.soundcloud && newUrl === location.href) {
		// would be easier to grab the <meta og:image> element, but that does
		// not update when we navigate to new pages
		var coverEl = document.querySelector('.interactive.sc-artwork > span');
		if (!(coverEl instanceof HTMLElement)) {
			throw alert('Artwork element not found');
		}
		var bgImg = window.getComputedStyle(coverEl).backgroundImage;
		var bgImgUrl = bgImg.slice(4, -1);
		if (bgImgUrl.endsWith('"') && bgImgUrl.endsWith('"')) {
			bgImgUrl = bgImgUrl.slice(1, -1);
		}
		return bgImgUrl;
	} else if (site.youtubeMusic) {
		if (newUrl !== location.href) {
			throw 'For YouTube Music, you need to be at the URL';
		}
		const coverImg = document.querySelector('.ytmusic-player-bar.image');
		if (!(coverImg instanceof HTMLImageElement)) {
			throw alert('Player bar image not found');
		}
		const iurl = new URL(coverImg.src);
		if (iurl.hostname === 'i.ytimg.com') {
			if (!iurl.pathname.startsWith('/vi/')) {
				throw "i.ytimg.com url doesn't start with /vi/";
			}
			const id = iurl.pathname.substr(4, 11);
			return await getYouTubeThumbnail(id);
		} else {
			return googleUserContentUrl(iurl);
		}
	} else if (site.youtubeMusicPlaylist) {
		if (newUrl !== location.href) {
			throw 'For YouTube Music, you need to be at the URL';
		}
		const coverImg = document.querySelector('#img');
		if (!(coverImg instanceof HTMLImageElement)) {
			throw alert('Image element not found');
		}
		const iurl = new URL(coverImg.src);
		if (iurl.hostname === 'i.ytimg.com') {
			if (iurl.pathname.startsWith('/vi/')) {
				const id = iurl.pathname.substr(4, 11);
				return await getYouTubeThumbnail(id);
			}
		} else {
			return googleUserContentUrl(iurl);
		}
	} else if (site.youtube) {
		const id = new URL(newUrl).searchParams.get('v');
		return await getYouTubeThumbnail(id);
	} else if (site.spotify && newUrl === location.href) {
		const coverEl =
			document.querySelector(
				'img._5d10f53f6ab203d3259e148b9f1c2278-scss[srcset]',
			) ||
			document.querySelector(
				'.main-view-container__scroll-node-child > section > div:first-child img[srcset]',
			) ||
			document.querySelector('.os-content img[srcset]') ||
			document.querySelector('img._5d10f53f6ab203d3259e148b9f1c2278-scss') ||
			document.querySelector(
				'.main-view-container__scroll-node-child > section > div:first-child img',
			) ||
			document.querySelector('.os-content img');
		if (!(coverEl instanceof HTMLImageElement)) {
			throw alert('Image element not found');
		}
		if (coverEl && coverEl.srcset) {
			// For /album/ urls.
			const srcset = coverEl.srcset.split(',');
			// The last src in srcset is the highest res
			const srcItem = srcset[srcset.length - 1].trim();
			const srcUrl = srcItem.split(' ')[0];
			return srcUrl;
		} else if (coverEl) {
			// For /playlist/ urls
			return coverEl.src;
		}
	}
}

async function getOembedImageUrl(newUrl) {
	const origin = new URL(newUrl).origin;
	const oembedUrl = `${origin}/oembed?format=json&url=${newUrl}`;
	const response = await fetch(oembedUrl);
	const oembed = await response.json();
	if (!oembed) {
		return;
	}
	return oembed.thumbnail_url;
}

let lastImageUrl;
async function getImageUrl(newUrl) {
	let imageUrl;
	try {
		imageUrl = await getImageUrlCustom(newUrl);
	} catch (error) {
		try {
			imageUrl = await getOembedImageUrl(newUrl);
		} catch (_oembedError) {
			notify(`Error getting thumbnail: ${error}`);
			console.error(`Error getting thumbnail: ${error}`);
			return;
		}
	}
	if (!imageUrl) {
		imageUrl = await getOembedImageUrl(newUrl);
	}
	if (!imageUrl) {
		throw 'Could not find any thumbnail';
	}
	lastImageUrl = imageUrl;
	return imageUrl;
}

function getFilename(site, imageUrl) {
	console.log(site, imageUrl);
	let filename = 'Thumbnail';
	if (
		site.soundcloud ||
		site.youtubeMusic ||
		site.youtubeMusicPlaylist ||
		site.spotify
	) {
		filename = 'Cover';
	}
	if (imageUrl.endsWith('.jpg')) {
		filename = `${filename}.jpg`;
	} else if (imageUrl.endsWith('.png')) {
		filename = `${filename}.png`;
	} else {
		filename = `${filename}.jpg`;
	}

	return filename;
}

function keydownEventListener(e) {
	if (
		e.key === 'Escape' &&
		e.metaKey === false &&
		e.altKey === false &&
		e.ctrlKey === false &&
		e.shiftKey === false
	) {
		e.preventDefault();
		close();
	}
}
async function copyEventListener(e) {
	e.preventDefault();
	try {
		const result = await copy(lastImageUrl)
		if (result && result.as) {
			notify(`Copied as ${result.as}`);
		}
		close();
	} catch (error) {
		console.error('Error copying thumbnail', error);
		notify(`Error copying thumbnail: ${error}`);
	}
}
async function open() {
	document.addEventListener('keydown', keydownEventListener);
	document.addEventListener('copy', copyEventListener);
	thumbnailGrabber.style.display = '';
	document.body.classList.add('thumbnail-grabber-prevent-scroll');
}

function close() {
	document.removeEventListener('keydown', keydownEventListener);
	document.removeEventListener('copy', copyEventListener);
	thumbnailGrabber.style.display = 'none';
	document.body.classList.remove('thumbnail-grabber-prevent-scroll');
}
close();

let lastFilename;
async function setup(newUrl) {
	const imageUrl = await getImageUrl(newUrl);
	const site = getSite(newUrl);
	lastFilename = getFilename(site, imageUrl);
	if (!img) {
		throw alert('No img');
	}
	img.src = imageUrl;
	return imageUrl;
}

chrome.runtime.onMessage.addListener(async function (
	msg,
	_sender,
	sendResponse,
) {
	if (msg.type === 'existance-check') {
		sendResponse({ injected: true });
	} else if (msg.type === 'notify') {
		notify(msg.notificationMsg);
	} else if (msg.type === 'open') {
		try {
			const imageUrl = await setup(msg.externalUrl || location.href);
			open(imageUrl);
		} catch (error) {
			notify(`Error opening thumbnail: ${error}`);
			console.error(`Error opening thumbnail: ${error}`);
		}
	} else if (msg.type === 'download') {
		try {
			const imageUrl = await setup(msg.externalUrl || location.href);
			console.log('DOWNLOAD', imageUrl);
			await download(imageUrl, lastFilename);
		} catch (error) {
			notify(`Error downloading thumbnail: ${error}`);
			console.error(`Error downloading thumbnail: ${error}`);
		}
		if (thumbnailGrabber.style.display !== 'none') {
			close();
		}
	} else if (msg.type === 'copy') {
		try {
			const imageUrl = await setup(msg.externalUrl || location.href);
			const result = await copy(imageUrl);
			if (result && result.as) {
				notify(`Copied as ${result.as}`);
			} else {
				notify('Copied');
			}
		} catch (error) {
			console.error('Error copying thumbnail', error);
			notify(`Error copying thumbnail: ${error}`);
		}
		if (thumbnailGrabber.style.display !== 'none') {
			close();
		}
	}
});

thumbnailGrabber.addEventListener('click', async function (e) {
	if (!(e.target instanceof HTMLElement)) {
		alert('No thumbnailGrabber click target');
	} else if (e.target === this) {
		close();
	} else if (e.target.textContent === 'DOWNLOAD') {
		try {
			await download(lastImageUrl, lastFilename);
		} catch (err) {
			console.error(`Error downloading thumbnail: ${err}`);
			notify(`Error downloading thumbnail: ${err}`);
		}
		close();
	} else if (e.target.textContent === 'COPY') {
		try {
			const result = await copy(lastImageUrl);
			if (result && result.as) {
				notify(`Copied as ${result.as}`);
			} else {
				notify('Copied');
			}
		} catch (error) {
			console.error('Error copying thumbnail', error);
			notify(`Error copying thumbnail: ${error}`);
		}
		close();
	} else if (e.target.textContent === 'OPTIONS') {
		chrome.runtime.sendMessage({ type: 'options' });
	}
});

document.body.appendChild(thumbnailGrabber);

async function download(url, filename) {
	const imageResponse = await fetch(url);
	const imgBlob = await imageResponse.blob();
	const a = document.createElement('a');
	document.body.appendChild(a);
	var blobUrl = window.URL.createObjectURL(imgBlob);
	a.href = blobUrl;
	a.download = filename;
	a.click();
	document.body.removeChild(a);
}

function createImage(options) {
	options = options || {};
	const img = Image ? new Image() : document.createElement('img');
	if (options.src) {
		img.src = options.src;
	}
	return img;
}

async function convertToPng(imgBlob): Promise<void> {
	return new Promise((resolve, reject) => {
		const imageUrl = window.URL.createObjectURL(imgBlob);
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			throw alert('No 2d canvas ctx')
		}
		const imageEl = createImage({ src: imageUrl });
		imageEl.onload = (e) => {
			if (!(e.target instanceof HTMLImageElement)) {
				throw alert('No imageEl target');
			}
			canvas.width = e.target.width;
			canvas.height = e.target.height;
			ctx.drawImage(e.target, 0, 0, e.target.width, e.target.height);
			canvas.toBlob(
				async function (blob) {
					try {
						await copyToClipboard(blob);
						resolve();
					} catch (error) {
						if (
							error.message.toLowerCase().includes('document is not focused')
						) {
							reject('Tab must be focused');
						} else {
							reject(error);
						}
					}
				},
				'image/png',
				1,
			);
		};
	});
}

async function copyToClipboard(pngBlob) {
	await navigator.clipboard.write([
		// eslint-disable-next-line no-undef
		new ClipboardItem({
			[pngBlob.type]: pngBlob,
		}),
	]);
}

async function firefoxCopy(url) {
		const response = await fetch(url);
		const arrayBuffer = await response.arrayBuffer();
		const contentType = response.headers.get('Content-Type');
		let imageType
		if (contentType === 'image/jpeg' || contentType === 'image/jpg') {
			imageType = 'jpeg'
		} else if (contentType === 'image/png') {
			imageType = 'png'
		} else if (url.endsWith('.jpeg') || url.endsWith('.jpg')) {
			imageType = 'jpeg'
		} else if (url.endsWith('.png')) {
			imageType = 'png'
		} else {
			throw new Error('Unknown image type')
		}
		const error = await chrome.runtime.sendMessage({ type: 'copyblob', arrayBuffer, imageType, });
		if (!error?.success) {
			throw new Error('setImageData not supported')
		}
}

async function copy(url) {
	try {
		await firefoxCopy(url)
	} catch (_error) {
		const imageResponse = await fetch(url);
		const imgBlob = await imageResponse.blob();
		if (url.endsWith('.png')) {
			await copyToClipboard(imgBlob);
		} else {
			await convertToPng(imgBlob);
			return { as: 'PNG' }
		}
	}
}
