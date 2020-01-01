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

  notificationElement.querySelector('p:first-child').addEventListener('click', function(e) {
    notificationElement.style.animation = 'none';
    requestAnimationFrame(function() {
      notificationElement.classList.add('thumbnail-grabber-notification-removing');
      setTimeout(function() {
        if (notificationElement.parentElement) {
          notificationElement.parentElement.removeChild(notificationElement);
        }
      }, 500);
    })
  })

  var icon = chrome.runtime.getURL('icon48.png');
  notificationElement.querySelector('img').src = icon;
  
  document.body.appendChild(notificationElement);
  setTimeout(function() {
    if (notificationElement.parentElement) {
      notificationElement.parentElement.removeChild(notificationElement);
    }
  }, 5000);
}

var img = thumbnailGrabber.querySelector('img');
var url, filename;
function setup() {
  if (
    location.hostname.endsWith('soundcloud.com') &&
    location.pathname.split('/').length-1 >= 2
  ) {
    var coverEl = document.querySelector('.interactive.sc-artwork > span');
    var bgImg = window.getComputedStyle(coverEl).backgroundImage;
    var bgImgUrl = bgImg.slice(4, -1);
    if (bgImgUrl.endsWith('"') && bgImgUrl.endsWith('"')) {
      bgImgUrl = bgImgUrl.slice(1, -1);
    }
    url = bgImgUrl;
    filename = 'cover';
  } else if (
    location.hostname.endsWith('youtube.com') &&
    location.pathname == '/watch' &&
    new URL(location.href).searchParams.has('v')
  ) {
    var schemaObject = JSON.parse(document.getElementById('scriptTag').text);
    url = schemaObject.thumbnailUrl[0];
    filename = 'thumbnail';
  } else {
    return false;
  }
  var fileExt = url.split('.').pop(-1);
  filename = filename+'.'+fileExt;
  img.src = url;
  return true;
}

var copyEventListener = function(e) {
  copy(url, function(err) {
    if (err) {
      console.error('error copying thumbnail: ', err);
      notify('Error copying thumbnail: '+err);
    }
    close();
  });
  e.preventDefault();
}
var keydownEventListener = function(e) {
  if (
    e.key == 'Escape' &&
    e.metaKey == false &&
    e.altKey == false &&
    e.ctrlKey == false &&
    e.shiftKey == false
  ) {
    close();
  }
}
function open() {
  document.addEventListener('keydown', keydownEventListener);
  document.addEventListener('copy', copyEventListener);
  var validUrl = setup();
  if (validUrl) {
    thumbnailGrabber.style.display = '';
    document.body.classList.add('thumbnail-grabber-prevent-scroll');
  } else {
    notify('No thumbnail detected on this page');
  }
}

function close() {
  document.removeEventListener('keydown', keydownEventListener);
  document.removeEventListener('copy', copyEventListener);
  thumbnailGrabber.style.display = 'none';
  document.body.classList.remove('thumbnail-grabber-prevent-scroll');
}
close();

chrome.runtime.onMessage.addListener(function(msg) {
  if (msg.type == 'open') {
    open();
  } else if (msg.type == 'download') {
    var validUrl = setup();
    if (!validUrl) notify('No thumbnail detected on this page');
    download(url, filename, function(err) {
      if (err) {
        console.error('error downloading thumbnail: ', err);
        notify('Error downloading thumbnail: '+err);
      }
      if (thumbnailGrabber.style.display != 'none') close();
    });
  } else if (msg.type == 'copy') {
    var validUrl = setup();
    if (!validUrl) notify('No thumbnail detected on this page');
    copy(url, function(err) {
      if (err) {
        console.error('error copying thumbnail: ', err);
        notify('Error copying thumbnail: '+err);
      } else {
        notify('Copied');
      }
      if (thumbnailGrabber.style.display != 'none') close();
    });
  }
})

thumbnailGrabber.addEventListener('click', function(e) {
  if (e.target == this) {
    close();
  } else if (e.target.textContent == 'DOWNLOAD') {
    download(url, filename, function(err) {
      if (err) {
        console.error('error downloading thumbnail: ', err);
        notify('Error downloading thumbnail: '+err);
      }
      close();
    });
  } else if (e.target.textContent == 'COPY') {
    copy(url, function(err) {
      if (err) {
        console.error('error copying thumbnail: ', err);
        notify('Error copying thumbnail: '+err);
      }
      close();
    });
  } else if (e.target.textContent == 'OPTIONS') {
    chrome.runtime.sendMessage({type: 'options'});
  }
});

document.body.appendChild(thumbnailGrabber);


function getBlob(url, callback) { // callback(err, blob)
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.responseType = 'blob';
  xhr.onload = function(event) {
    if (this.status != 200) {
      callback('xhr got status '+this.status, null);
    } else {
      callback(null, this.response);
    }
  };
  xhr.onerror = function(event) {
    callback('xhr error:', event, null);
  };
  xhr.send();
}

function download(url, filename, callback) {
  getBlob(url, function(err, blob) {
    if (err) return callback(true);
    try {
      var a = document.createElement('a');
      a.style = 'display: none';
      document.body.appendChild(a);
      var url = window.URL.createObjectURL(blob);
      a.href = url;
      a.download = filename;
      a.click();
      document.body.removeChild(a);
      callback();
    } catch(err) {
      callback(err)
    }
  });
}

function createImage(options) {
  options = options || {};
  const img = (Image) ? new Image() : document.createElement('img');
  if (options.src) {
  	img.src = options.src;
  }
  return img;
}
       
function convertToPng(imgBlob, callback) {
  const imageUrl = window.URL.createObjectURL(imgBlob);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const imageEl = createImage({ src: imageUrl });
  imageEl.onload = (e) => {
    canvas.width = e.target.width;
    canvas.height = e.target.height;
    ctx.drawImage(e.target, 0, 0, e.target.width, e.target.height);
    canvas.toBlob(function(blob) {
      copyToClipboard(blob, callback);
    }, 'image/png', 1);
  };      
}

async function copyToClipboard(pngBlob, callback) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
            [pngBlob.type]: pngBlob
        })
      ]);
      callback(null);
    } catch (error) {
        callback(error);
    }
}

async function copy(url, callback) {
  getBlob(url, function(err, imgBlob) {
    if (err) return callback(true);
    try {
      if (url.endsWith('.jpg') || url.endsWith('.jpeg')) {
        convertToPng(imgBlob, callback);
      } else if (url.endsWith('.png')) {
        copyToClipboard(imgBlob, callback);
      } else {
        callback('Format unsupported');
      }
    } catch(err) {
      callback(err);
    }
  });
}
