const thumbnailGrabber = document.createElement('div');
thumbnailGrabber.id = 'thumbnail-grabber';

const buttonText = {
	download: 'Download',
	copy: 'Copy',
	options: 'Options',
};
thumbnailGrabber.innerHTML = `
<div id="thumbnail-grabber-card">
	<img tabindex="0">
	<div id="thumbnail-grabber-buttons">
		<button tabindex="0">${buttonText.download}</button>
		<button tabindex="0">${buttonText.copy}</button>
		<button tabindex="0">${buttonText.options}</button>
	</div>
</div>
`;
const notificationInnerHTML = `
<p>x</p>
<img></img>
<p></p>
`;

/** Returns the `msg` */
function notify(msg: string) {
	const notificationElement = document.createElement('div');
	notificationElement.innerHTML = notificationInnerHTML;
	notificationElement.classList.add('thumbnail-grabber-notification');
	const lastChild = notificationElement.querySelector('p:last-child');
	if (!(lastChild instanceof HTMLElement)) {
		throw notify('No p:last-child');
	}
	lastChild.textContent = msg;

	const firstChild = notificationElement.querySelector('p:first-child');
	if (!(firstChild instanceof HTMLElement)) {
		throw notify('No p:first-child');
	}
	firstChild.addEventListener('click', () => {
		notificationElement.style.animation = 'none';
		requestAnimationFrame(() => {
			notificationElement.classList.add(
				'thumbnail-grabber-notification-removing',
			);
			setTimeout(() => {
				if (notificationElement.parentElement) {
					notificationElement.parentElement.removeChild(notificationElement);
				}
			}, 500);
		});
	});

	const icon = chrome.runtime.getURL('icon48.png');
	const iconImgElement = notificationElement.querySelector('img');
	if (!(iconImgElement instanceof HTMLElement)) {
		throw notify('No iconImgElement');
	}
	iconImgElement.src = icon;

	document.body.appendChild(notificationElement);
	setTimeout(() => {
		if (notificationElement.parentElement) {
			notificationElement.parentElement.removeChild(notificationElement);
		}
	}, 5000);
	return msg;
}

async function getYouTubeThumbnail(id: string) {
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

function googleUserContentUrl(urlObj: URL) {
	// This is a `googleusercontent.com` url, which ends in something
	// like `=w60-h60-l90-rj`. Not sure what `l90` or `rj` mean, but it seems
	// to be the same without them. We replace all of this with `=s0` to get
	// the original size of the image.
	// Info about `googleusercontent.com` urls:
	// https://sites.google.com/site/picasaresources/Home/Picasa-FAQ/google-photos-1/how-to/how-to-get-a-direct-link-to-an-image
	const imgPathname = `${urlObj.pathname.split('=')[0]}=s0`;
	return urlObj.origin + imgPathname + urlObj.search + urlObj.hash;
}

const img = thumbnailGrabber.querySelector('img');
if (!img) {
	throw notify('Error: No img element');
}

let lastImageUrl: string;
async function getImageUrl(url: string) {
	let imageUrl: string | undefined;
	try {
		imageUrl = await getImageUrlCustom(url);
	} catch (error) {
		try {
			imageUrl = await getOembedImageUrl(url);
		} catch (_oembedError) {
			throw notify(`Error getting thumbnail: ${error}`);
		}
	}
	if (!imageUrl) {
		imageUrl = await getOembedImageUrl(url);
	}
	if (!imageUrl) {
		throw notify('Could not find any thumbnail');
	}
	lastImageUrl = imageUrl;
	return imageUrl;
}

function getFilename(site: Site | null, imageUrl = '') {
	console.log(site, imageUrl);
	let filename = 'Cover';
	if (site === 'youtube' || site === null) {
		filename = 'Thumbnail';
	}
	if (imageUrl.endsWith('.jpg')) {
		return `${filename}.jpg`;
	} else if (imageUrl.endsWith('.png')) {
		return `${filename}.png`;
	} else {
		return `${filename}.jpg`;
	}
}

function keydownEventListener(e: KeyboardEvent) {
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
async function copyEventListener(e: ClipboardEvent) {
	e.preventDefault();
	try {
		const result = await copy(lastImageUrl);
		notify(`Copied as ${result?.imageType}`);
		close();
	} catch (error) {
		throw notify(`Error copying thumbnail: ${error}`);
	}
}

let lastActiveElement: Element | null = null;
const focusTrapInstance = focusTrap(thumbnailGrabber);

async function open() {
	document.addEventListener('keydown', keydownEventListener);
	document.addEventListener('copy', copyEventListener);
	thumbnailGrabber.style.display = '';
	document.body.classList.add('thumbnail-grabber-prevent-scroll');
	focusTrapInstance.open(img || thumbnailGrabber);
}

function close() {
	document.removeEventListener('keydown', keydownEventListener);
	document.removeEventListener('copy', copyEventListener);
	thumbnailGrabber.style.display = 'none';
	document.body.classList.remove('thumbnail-grabber-prevent-scroll');
	focusTrapInstance.close();
}
close();

function focusTrap(el: HTMLElement) {
	function getFocusElements() {
		return el.querySelectorAll(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
		);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Tab' && e.shiftKey && !e.ctrlKey && !e.metaKey) {
			const focusElements = getFocusElements();
			const lastFocusElement = focusElements[focusElements.length - 1];
			if (
				focusElements[0] &&
				document.activeElement?.isSameNode(focusElements[0]) &&
				lastFocusElement instanceof HTMLElement
			) {
				lastFocusElement.focus();
				e.preventDefault();
			}
		} else if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
			const focusElements = getFocusElements();
			const lastFocusElement = focusElements[focusElements.length - 1];
			if (
				document.activeElement?.isSameNode(lastFocusElement) &&
				focusElements[0] instanceof HTMLElement
			) {
				focusElements[0].focus();
				e.preventDefault();
			}
		}
	}
	el.addEventListener('keydown', handleKeydown);
	return {
		open(focusElement: HTMLElement) {
			lastActiveElement = document.activeElement;
			focusElement.focus();
		},
		close() {
			if (lastActiveElement instanceof HTMLElement) {
				lastActiveElement.focus();
			}
			lastActiveElement = null;
		},
	};
}

let lastFilename: string;
async function setup(url: string) {
	const imageUrl = await getImageUrl(url);
	const site = getSite(url);
	lastFilename = getFilename(site, imageUrl);
	if (!img) {
		throw notify('No img');
	}
	img.src = imageUrl;
	return imageUrl;
}

chrome.runtime.onMessage.addListener(async (msg, _sender, sendResponse) => {
	if (msg.type === 'existance-check') {
		sendResponse({ injected: true });
	} else if (msg.type === 'notify') {
		notify(msg.notificationMsg);
	} else if (msg.type === 'open') {
		try {
			const imageUrl = await setup(msg.externalUrl || location.href);
			open(imageUrl);
		} catch (error) {
			throw notify(`Error opening thumbnail: ${error}`);
		}
	} else if (msg.type === 'download') {
		try {
			const imageUrl = await setup(msg.externalUrl || location.href);
			console.log('DOWNLOAD', imageUrl);
			await download(imageUrl, lastFilename);
		} catch (error) {
			throw notify(`Error downloading thumbnail: ${error}`);
		}
		if (thumbnailGrabber.style.display !== 'none') {
			close();
		}
	} else if (msg.type === 'copy') {
		try {
			const imageUrl = await setup(msg.externalUrl || location.href);
			const result = await copy(imageUrl);
			notify(`Copied as ${result?.imageType}`);
		} catch (error) {
			throw notify(`Error copying thumbnail: ${error}`);
		}
		if (thumbnailGrabber.style.display !== 'none') {
			close();
		}
	}
});

thumbnailGrabber.addEventListener('contextmenu', async (e) => {
	// make sure context menu can be shown
	e.stopPropagation();
});
thumbnailGrabber.addEventListener('click', async function (e) {
	if (!(e.target instanceof HTMLElement)) {
		throw notify('No thumbnailGrabber click target');
	} else if (e.target === this) {
		// backdrop clicked
		close();
	} else if (e.target.textContent === buttonText.download) {
		try {
			await download(lastImageUrl, lastFilename);
		} catch (err) {
			throw notify(`Error downloading thumbnail: ${err}`);
		}
		close();
	} else if (e.target.textContent === buttonText.copy) {
		try {
			const result = await copy(lastImageUrl);
			notify(`Copied as ${result?.imageType}`);
		} catch (error) {
			throw notify(`Error copying thumbnail: ${error}`);
		}
		close();
	} else if (e.target.textContent === buttonText.options) {
		chrome.runtime.sendMessage({ type: 'options' });
	}
});

document.body.appendChild(thumbnailGrabber);

async function download(url: string, filename: string) {
	const imageResponse = await fetch(url);
	const imgBlob = await imageResponse.blob();
	const a = document.createElement('a');
	document.body.appendChild(a);
	const blobUrl = window.URL.createObjectURL(imgBlob);
	a.href = blobUrl;
	a.download = filename;
	a.click();
	document.body.removeChild(a);
}

function createImage(src: string) {
	const img = Image ? new Image() : document.createElement('img');
	img.src = src;
	return img;
}

async function convertToPng(imgBlob: Blob): Promise<void> {
	return new Promise((resolve, reject) => {
		const imageUrl = window.URL.createObjectURL(imgBlob);
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			throw alert('No 2d canvas ctx');
		}
		const imageEl = createImage(imageUrl);
		imageEl.onload = (e) => {
			if (!(e.target instanceof HTMLImageElement)) {
				throw alert('No imageEl target');
			}
			canvas.width = e.target.width;
			canvas.height = e.target.height;
			ctx.drawImage(e.target, 0, 0, e.target.width, e.target.height);
			canvas.toBlob(
				async (blob) => {
					try {
						if (!blob) {
							throw notify('Browser blob error');
						}
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

async function copyToClipboard(pngBlob: Blob) {
	await navigator.clipboard.write([
		// eslint-disable-next-line no-undef
		new ClipboardItem({
			[pngBlob.type]: pngBlob,
		}),
	]);
}

async function firefoxCopy(url: string) {
	const response = await fetch(url);
	const arrayBuffer = await response.arrayBuffer();
	const contentType = response.headers.get('Content-Type');
	let imageType: string;
	if (contentType === 'image/jpeg' || contentType === 'image/jpg') {
		imageType = 'jpeg';
	} else if (contentType === 'image/png') {
		imageType = 'png';
	} else if (url.endsWith('.jpeg') || url.endsWith('.jpg')) {
		imageType = 'jpeg';
	} else if (url.endsWith('.png')) {
		imageType = 'png';
	} else {
		throw new Error('Unknown image type');
	}
	const error = await chrome.runtime.sendMessage({
		type: 'copyblob',
		arrayBuffer,
		imageType,
	});
	if (!error?.success) {
		throw new Error('setImageData not supported');
	}
	return { imageType: imageType.toUpperCase() };
}

async function copy(url: string) {
	try {
		const result = await firefoxCopy(url);
		return { imageType: result.imageType.toUpperCase() };
	} catch (_error) {
		const imageResponse = await fetch(url);
		const imgBlob = await imageResponse.blob();
		const imageType = imgBlob.type.replace(/^image\//, '');
		try {
			await copyToClipboard(imgBlob);
			return { imageType: imageType.toUpperCase() };
		} catch (_e) {
			convertToPng(imgBlob);
			return { imageType: 'PNG', converted: true };
		}
	}
}

type Site =
	| 'soundcloud'
	| 'youtubeMusic'
	| 'youtubeMusicPlaylist'
	| 'youtube'
	| 'spotify';

function getSite(newUrl: string): Site | null {
	const url = new URL(newUrl);
	if (url.hostname.endsWith('soundcloud.com')) {
		return 'soundcloud';
	} else if (
		url.hostname === 'music.youtube.com' &&
		url.pathname === '/watch' &&
		url.searchParams.has('v')
	) {
		return 'youtubeMusic';
	} else if (
		url.hostname === 'music.youtube.com' &&
		url.pathname === '/playlist' &&
		url.searchParams.has('list')
	) {
		return 'youtubeMusicPlaylist';
	} else if (
		url.hostname.endsWith('youtube.com') &&
		!url.hostname.includes('music') &&
		url.pathname === '/watch' &&
		url.searchParams.has('v')
	) {
		return 'youtube';
	} else if (url.hostname === 'open.spotify.com') {
		return 'spotify';
	} else {
		return null;
	}
}

async function getImageUrlCustom(url: string) {
	const site = getSite(url);
	if (site === 'soundcloud' && url === location.href) {
		// would be easier to grab the <meta og:image> element, but that does
		// not update when we navigate to new pages
		const coverEl = document.querySelector('.interactive.sc-artwork > span');
		if (!(coverEl instanceof HTMLElement)) {
			throw notify('Artwork element not found');
		}
		const bgImg = window.getComputedStyle(coverEl).backgroundImage;
		let bgImgUrl = bgImg.slice(4, -1);
		if (bgImgUrl.endsWith('"') && bgImgUrl.endsWith('"')) {
			bgImgUrl = bgImgUrl.slice(1, -1);
		}
		return bgImgUrl;
	} else if (site === 'youtubeMusic') {
		if (url !== location.href) {
			throw 'For YouTube Music, you need to be at the URL';
		}
		const coverImg = document.querySelector('.ytmusic-player-bar.image');
		if (!(coverImg instanceof HTMLImageElement)) {
			throw notify('Player bar image not found');
		}
		const iurl = new URL(coverImg.src);
		if (iurl.hostname === 'i.ytimg.com') {
			if (!iurl.pathname.startsWith('/vi/')) {
				throw "i.ytimg.com url doesn't start with /vi/";
			}
			const id = iurl.pathname.substring(4, 4 + 11);
			return await getYouTubeThumbnail(id);
		} else {
			return googleUserContentUrl(iurl);
		}
	} else if (site === 'youtubeMusicPlaylist') {
		if (url !== location.href) {
			throw 'For YouTube Music, you need to be at the URL';
		}
		const coverImg = document.querySelector('#img');
		if (!(coverImg instanceof HTMLImageElement)) {
			throw notify('Image element not found');
		}
		const iurl = new URL(coverImg.src);
		if (iurl.hostname === 'i.ytimg.com') {
			if (iurl.pathname.startsWith('/vi/')) {
				const id = iurl.pathname.substring(4, 4 + 11);
				return await getYouTubeThumbnail(id);
			}
		} else {
			return googleUserContentUrl(iurl);
		}
	} else if (site === 'youtube' && new URL(url).searchParams.has('v')) {
		const id = new URL(url).searchParams.get('v') as string;
		return await getYouTubeThumbnail(id);
	} else if (site === 'spotify' && url === location.href) {
		const coverEl =
			document.querySelector('img.zmOtW0vqqn1qpZrtQ_w9[srcset]') ||
			document.querySelector('[aria-label="View album artwork"] img[srcset]') ||
			document.querySelector(
				'.main-view-container__scroll-node-child section > div:first-child img[srcset]',
			) ||
			document.querySelector('img.zmOtW0vqqn1qpZrtQ_w9') ||
			document.querySelector(
				'[aria-label="View album artwork"] img.zmOtW0vqqn1qpZrtQ_w9',
			) ||
			document.querySelector(
				'.main-view-container__scroll-node-child section > div:first-child img',
			);
		if (!(coverEl instanceof HTMLImageElement)) {
			throw notify('Image element not found');
		}
		if (coverEl?.srcset) {
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

async function getOembedImageUrl(url: string) {
	const origin = new URL(url).origin;
	const oembedUrl = `${origin}/oembed?format=json&url=${url}`;
	const response = await fetch(oembedUrl);
	const oembed = await response.json();
	if (!oembed) {
		return;
	}
	return oembed.thumbnail_url;
}
