const urlUtil = require('./modules/url-util.js');

function xhr(url, requestType, responseType) {
  return new Promise((resolve, reject) => {
    var xhr = new XMLHttpRequest();
    xhr.open(requestType, url);
    xhr.responseType = responseType;
    xhr.onload = function() {
      if (this.status == 200) {
        resolve(this.response);
      } else {
        reject('xhr got status '+this.status);
      }
    };
    xhr.onerror = function(event) {
      reject('xhr error:'+event.message);
    };
    xhr.send();
  });
}

var thumbnailGrabber = document.createElement('div');
thumbnailGrabber.id = 'thumbnail-grabber';

thumbnailGrabber.innerHTML = 
`
<div id="thumbnail-grabber-card">
  <img>
  <div id="thumbnail-grabber-buttons">
    <div><p>DOWNLOAD</p></div>
    <div><p>COPY</p></div>
    <div><p>OPTIONS</p></div>
  </div>
</div>
`;
var notificationInnerHTML =
`
<p>x</p>
<img></img>
<p></p>
`;

function notify(msg) {
  var notificationElement = document.createElement('div');
  notificationElement.innerHTML = notificationInnerHTML;
  notificationElement.classList.add('thumbnail-grabber-notification');
  notificationElement.querySelector('p:last-child').textContent = msg;

  notificationElement.querySelector('p:first-child').addEventListener('click', function() {
    notificationElement.style.animation = 'none';
    requestAnimationFrame(function() {
      notificationElement.classList.add('thumbnail-grabber-notification-removing');
      setTimeout(function() {
        if (notificationElement.parentElement) {
          notificationElement.parentElement.removeChild(notificationElement);
        }
      }, 500);
    });
  });

  var icon = chrome.runtime.getURL('icon48.png');
  notificationElement.querySelector('img').src = icon;
  
  document.body.appendChild(notificationElement);
  setTimeout(function() {
    if (notificationElement.parentElement) {
      notificationElement.parentElement.removeChild(notificationElement);
    }
  }, 5000);
}

async function getYouTubeThumbnail(id) {
  const urls = [
    `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
    `https://img.youtube.com/vi/${id}/sddefault.jpg`,
    `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
  ];
  const urlPromises = urls.map(url => {
    return async function() {
      await xhr(url, 'GET', 'blob');
      return url;
    };
  });
  let error = '';
  for (const urlPromise of urlPromises) {
    try {
      const url = await urlPromise;
      return url;
    } catch(err) {
      error = err;
      continue;
    }
  }
  throw `No thumbnail found (${error})`;
}

function googleUserContentUrl(urlObj) {
  // This is a `googleusercontent.com` url, which ends in something
  // like `=w60-h60-l90-rj`. Not sure what `l90` or `rj` mean, but it seems
  // to be the same without them. We replace all of this with `=s0` to get
  // the original size of the image.
  // Info about `googleusercontent.com` urls:
  // https://sites.google.com/site/picasaresources/Home/Picasa-FAQ/google-photos-1/how-to/how-to-get-a-direct-link-to-an-image
  var imgPathname = urlObj.pathname.split('=')[0]+'=s0';
  return urlObj.origin + imgPathname + urlObj.search + urlObj.hash;
}

var img = thumbnailGrabber.querySelector('img');
var imageUrl;

let lastImageUrl;
async function getImageUrl(newUrl) {
  let url;
  const site = urlUtil.getSite(newUrl);
  if (site == 'soundcloud') {
    if (newUrl == location.href) {
      // would be easier to grab the <meta og:image> element, but that does
      // not update when we navigate to new pages
      var coverEl = document.querySelector('.interactive.sc-artwork > span');
      var bgImg = window.getComputedStyle(coverEl).backgroundImage;
      var bgImgUrl = bgImg.slice(4, -1);
      if (bgImgUrl.endsWith('"') && bgImgUrl.endsWith('"')) {
        bgImgUrl = bgImgUrl.slice(1, -1);
      }
      url = bgImgUrl;
    } else {
      const oembedUrl = 'https://soundcloud.com/oembed?format=json&url='+newUrl;
      const oembed = await xhr(oembedUrl, 'POST', 'json');
      url = oembed.thumbnail_url;
    }
  } else if (site == 'youtube music') {
    if (newUrl != location.href) throw 'For YouTube Music, you need to be at the URL';
    const coverImg = document.querySelector('.ytmusic-player-bar.image');
    const iurl = new URL(coverImg.src);
    if (iurl.hostname == 'i.ytimg.com') {
      if (!iurl.pathname.startsWith('/vi/')) {
        throw "i.ytimg.com url doesn't start with /vi/";
      }
      const id = iurl.pathname.substr(4, 11);
      url = await getYouTubeThumbnail(id);
    } else {
      url = googleUserContentUrl(iurl);
    }
  } else if (site == 'youtube music playlist') {
    if (newUrl != location.href) throw 'For YouTube Music, you need to be at the URL';
    const coverImg = document.querySelector('#img');
    const iurl = new URL(coverImg.src);
    if (iurl.hostname == 'i.ytimg.com') {
      if (iurl.pathname.startsWith('/vi/')) {
        const id = iurl.pathname.substr(4, 11);
        url = await getYouTubeThumbnail(id);
      }
    } else {
      url = googleUserContentUrl(iurl);
    }
  } else if (site == 'youtube') {
    if (newUrl == location.href) {
      // youtube updates the schemaObject when we navigate to new pages
      const schemaObject = JSON.parse(document.getElementById('scriptTag').text);
      url = schemaObject.thumbnailUrl[0];
    } else {
      const id = new URL(newUrl).searchParams.get('v');
      url = await getYouTubeThumbnail(id);
    }
  } else if (site == 'spotify') {
    if (newUrl == location.href) {
      const coverEl = document.querySelector('._4c838ef3d2b6da1a61669046bbfae3d1-scss');
      if (coverEl.srcset) {
        // For /album/ urls.
        const srcset = coverEl.srcset.split(',');
        // The last src in srcset is the highest res
        const srcItem = srcset[srcset.length-1].trim();
        const srcUrl = srcItem.split(' ')[0];
        url = srcUrl;
      } else {
        // For /playlist/ urls
        url = coverEl.src;
      }
    } else {
      const oembedUrl = 'https://open.spotify.com/oembed?format=json&url='+newUrl;
      const oembed = await xhr(oembedUrl, 'POST', 'json');
      url = oembed.thumbnail_url;
    }
  } else {
    throw 'Not supported on this URL';
  }
  lastImageUrl = url;
  return url;
}

function getFilename(newUrl, imageUrl) {
  const site = urlUtil.getSite(newUrl);
  let filename = 'Thumbnail';
  switch (site) {
    case 'soundcloud':
    case 'youtube music':
    case 'youtube music playlist':
    case 'spotify':
      filename = 'Cover';
  }
  if (site == 'soundcloud') filename = 'Cover';
  else if (site == 'youtube music') filename = 'Cover';
  else if (site == 'youtube music playlist') filename = 'Cover';
  else if (site == 'spotify') filename = 'Cover';
  const fileExt = imageUrl.split('.').pop(-1);
  if (fileExt == 'jpg' || fileExt == 'png') {
    filename = filename+'.'+fileExt;
  } else {
    filename = filename+'.jpg';
  }
  return filename;
}

function keydownEventListener(e) {
  if (
    e.key == 'Escape' &&
    e.metaKey == false &&
    e.altKey == false &&
    e.ctrlKey == false &&
    e.shiftKey == false
  ) {
    e.preventDefault();
    close();
  }
}
function copyEventListener(e) {
  e.preventDefault();
  copy(lastImageUrl).then(() => {
    close();
  }).catch((error) => {
    console.error('Error copying thumbnail: '+error);
    notify('Error copying thumbnail: '+error);
    close();
  });
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

async function setup(newUrl) {
  imageUrl = await getImageUrl(newUrl);
  img.src = imageUrl;
  return imageUrl;
}

chrome.runtime.onMessage.addListener(async function(msg, sender, sendResponse) {
  if (msg.type == 'existance-check') {
    sendResponse({ injected: true });
  } else if (msg.type == 'notify') {
    notify(msg.notificationMsg);
  } else if (msg.type == 'open') {
    try {
      const imageUrl = await setup(msg.externalUrl || location.href);
      open(imageUrl);
    } catch(error) {
      notify('Error opening thumbnail: '+error);
      console.error('Error opening thumbnail: '+error);
    }
  } else if (msg.type == 'download') {
    try {
      const imageUrl = await setup(msg.externalUrl || location.href);
      const filename = getFilename(imageUrl);
      await download(imageUrl, filename);
    } catch(error) {
      notify('Error downloading thumbnail: '+error);
      console.error('Error downloading thumbnail: '+error);
    }
    if (thumbnailGrabber.style.display != 'none') close();
  } else if (msg.type == 'copy') {
    try {
      const imageUrl = await setup(msg.externalUrl || location.href);
      await copy(imageUrl);
      notify('Copied');
    } catch(error) {
      notify('Error copying thumbnail: '+error);
      console.error('Error copying thumbnail: '+error);
    }
    if (thumbnailGrabber.style.display != 'none') close();
  }
});

thumbnailGrabber.addEventListener('click', async function(e) {
  if (e.target == this) {
    close();
  } else if (e.target.textContent == 'DOWNLOAD') {
    try {
      const filename = getFilename(lastImageUrl);
      await download(lastImageUrl, filename);
    } catch(err) {
      console.error('Error downloading thumbnail: '+err);
      notify('Error downloading thumbnail: '+err);
    }
    close();
  } else if (e.target.textContent == 'COPY') {
    try {
      await copy(lastImageUrl);
      notify('Copied');
    } catch(err) {
      console.error('Error copying thumbnail: '+err);
      notify('Error copying thumbnail: '+err);
    }
    close();
  } else if (e.target.textContent == 'OPTIONS') {
    chrome.runtime.sendMessage({ type: 'options' });
  }
});

document.body.appendChild(thumbnailGrabber);

async function download(url, filename) {
  const imgBlob = await xhr(url, 'GET', 'blob');
  const a = document.createElement('a');
  a.style = 'display: none';
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

async function convertToPng(imgBlob) {
  return new Promise((resolve, reject) => {
    const imageUrl = window.URL.createObjectURL(imgBlob);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const imageEl = createImage({ src: imageUrl });
    imageEl.onload = (e) => {
      canvas.width = e.target.width;
      canvas.height = e.target.height;
      ctx.drawImage(e.target, 0, 0, e.target.width, e.target.height);
      canvas.toBlob(async function(blob) {
        try {
          await copyToClipboard(blob);
          resolve();
        } catch(error) {
          if (error.message.toLowerCase().includes('document is not focused')) {
            reject('Tab must be focused');
          } else {
            reject(error);
          }
        }
      }, 'image/png', 1);
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

async function copy(url) {
  const imgBlob = await xhr(url, 'GET', 'blob');
  if (url.endsWith('.png')) {
    await copyToClipboard(imgBlob);
  } else {
    await convertToPng(imgBlob);
  }
}
