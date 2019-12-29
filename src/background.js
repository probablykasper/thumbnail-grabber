chrome.browserAction.onClicked.addListener(function(activeTab) {
  var newURL = "popup.html";
  chrome.tabs.create({ url: newURL });
});
