var thumbnailGrabber = document.createElement('div');
thumbnailGrabber.id = "thumbnail-grabber";

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
`

var img = thumbnailGrabber.querySelector('img');
var url, filename;
function setup() {
  if (location.hostname.endsWith('soundcloud.com')) {
    var ogImage = document.querySelector('meta[property="og:image"]');
    url = ogImage.getAttribute('content');
    filename = 'cover';
  } else if (location.hostname.endsWith('youtube.com')) {
    var schemaObject = JSON.parse(document.getElementById('scriptTag').text);
    url = schemaObject.thumbnailUrl[0];
    filename = 'thumbnail';
  }
  var fileExt = url.split('.').pop(-1);
  filename = filename+'.'+fileExt;
  img.src = url;
}

// make ctrl+c copy image
// esc to close

var hasBeenOpened = false;
function open() {
  thumbnailGrabber.style.display = "";
  if (!hasBeenOpened) setup();
  document.body.classList.add('thumbnail-grabber-prevent-scroll');
  hasBeenOpened = true;
}
function close() {
  thumbnailGrabber.style.display = "none";
  document.body.classList.remove('thumbnail-grabber-prevent-scroll');
}
close();

thumbnailGrabber.addEventListener('click', function(e) {
  if (e.target == this) close();
});

document.body.appendChild(thumbnailGrabber);

chrome.runtime.onMessage.addListener(function(msg) {
  if (msg.type == "open") open();
})
