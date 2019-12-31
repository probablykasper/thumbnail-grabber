function open() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
    chrome.tabs.sendMessage(tabs[0].id, {type: 'open'});
  });
}
function download() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
    chrome.tabs.sendMessage(tabs[0].id, {type: 'download'});
  });
}
function copy() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
    chrome.tabs.sendMessage(tabs[0].id, {type: 'copy'});
  });
}

chrome.browserAction.onClicked.addListener(function() {
  open();
});

chrome.runtime.onMessage.addListener(
  function(msg, sender, sendResponse) {
    if (msg.type == 'options') {
      chrome.tabs.create({
        url: 'chrome://extensions/?options='+chrome.runtime.id
      });
    }
  }
);

chrome.commands.onCommand.addListener(function(command) {
  if (command == 'open') {
    open();
  } else if (command == 'download') {
    download();
  } else if (command == 'copy') {
    copy();
  }
});
