const urlUtil = require('./modules/url-util.js');

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!changeInfo.url) return;
  if (urlUtil.getSite(changeInfo.url)) {
    chrome.browserAction.setIcon({
      path: {
        "16": "icon16.png",
        "48": "icon48.png",
        "128": "icon128.png"
      }
    })
  } else {
    chrome.browserAction.setIcon({
      path: {
        "16": "icon16-gray.png",
        "48": "icon48-gray.png",
        "128": "icon128-gray.png"
      }
    })
  }
});

function action(type, externalUrl) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
    chrome.tabs.sendMessage(tabs[0].id, {type, externalUrl});
  });
}

chrome.browserAction.onClicked.addListener(function() {
  console.log('OPEN');
  action('open');
});

chrome.runtime.onMessage.addListener(
  function(msg, sender, sendResponse) {
    if (msg.type == 'options') {
      chrome.runtime.openOptionsPage();
    }
  }
);

chrome.commands.onCommand.addListener(function(command) {
  if (['open', 'download', 'copy'].includes(command)) {
    action(command);
  }
});

function createContextMenus(items) {
  chrome.storage.local.get({
  	grabMethod: 'Open',
  	cxOpen: false,
  	cxDownload: true,
  	cxCopy: false,
  }, function(items) {
  	if (chrome.runtime.lastError) {
  		console.warn('Error retrieving options:' + chrome.runtime.lastError.message);
  	} else {
      if (items.cxOpen == true) {
        chrome.contextMenus.create({
          id: 'open',
          title: 'Open thumbnail',
          documentUrlPatterns: urlUtil.matchPatterns,
          contexts: ['page', 'video'],
        });
        chrome.contextMenus.create({
          id: 'open-link',
          title: 'Open thumbnail',
          targetUrlPatterns: urlUtil.matchPatterns,
          contexts: ['link'],
        });
      }
      if (items.cxDownload == true) {
        chrome.contextMenus.create({
          id: 'download',
          title: 'Download thumbnail',
          documentUrlPatterns: urlUtil.matchPatterns,
          contexts: ['page', 'video'],
        });
        chrome.contextMenus.create({
          id: 'download-link',
          title: 'Download thumbnail',
          targetUrlPatterns: urlUtil.matchPatterns,
          contexts: ['link'],
        });
      }
      if (items.cxCopy == true) {
        chrome.contextMenus.create({
          id: 'copy',
          title: 'Copy thumbnail',
          documentUrlPatterns: urlUtil.matchPatterns,
          contexts: ['page', 'video'],
        });
        chrome.contextMenus.create({
          id: 'copy-link',
          title: 'Copy thumbnail',
          targetUrlPatterns: urlUtil.matchPatterns,
          contexts: ['link'],
        });
      }
  	}
  })
 
}

function injectIfNotAlready(tabId, callback) {
  chrome.tabs.sendMessage(tabId, {type: 'existance-check'}, response => {
    if (chrome.runtime.lastError) {} // handle error by do nothing
    if (response && response.injected) {
      // already injected
      callback(true);
    } else {
      // not yet injected, so do that
      chrome.tabs.executeScript(tabId, {file: 'content-script.js'}, () => {
        chrome.tabs.insertCSS(tabId, {file: 'content-script.css'}, () => {
          callback();
        });
      });
    }
  }); 
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  let menuItemId = info.menuItemId;
  if (menuItemId.endsWith('-link')) {
    menuItemId = menuItemId.slice(0, -'-link'.length)
  }
  injectIfNotAlready(tab.id, () => {
    let url = info.linkUrl || info.pageUrl;
    if (!urlUtil.getSite(url)) {
      action('notify', `Error ${menuItemId}ing thumbnail: Not supported on this URL`);
    }
    if (info.linkUrl) {
      action(menuItemId, url);
    } else {
      action(menuItemId);
    }
  });
})

chrome.runtime.onInstalled.addListener(function() {
  createContextMenus();
});
chrome.storage.onChanged.addListener(function(changes, areaName) {
  chrome.contextMenus.removeAll(() => {
    createContextMenus();
  });
});
