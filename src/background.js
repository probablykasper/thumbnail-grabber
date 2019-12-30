function open() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
    chrome.tabs.sendMessage(tabs[0].id, {type: 'open'});
  });
}

chrome.browserAction.onClicked.addListener(function() {
  open();
});

chrome.runtime.onMessage.addListener(
  function(msg, sender, sendResponse) {
    console.log('dada');
    console.log(msg.type);
    if (msg.type == 'options') {
      chrome.tabs.create({
        url: 'chrome://extensions/?options='+chrome.runtime.id
      });
    }
  }
)
