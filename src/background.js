function open() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
    chrome.tabs.sendMessage(tabs[0].id, {type: 'open'});
  });
}

chrome.browserAction.onClicked.addListener(function() {
  open();
});
