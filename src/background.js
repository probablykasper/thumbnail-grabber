function action(tabId, options) {
	injectIfNotAlready(tabId, () => {
		chrome.tabs.sendMessage(tabId, options);
	});
}

function actionInCurrentTab(options) {
	chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
		action(tabs[0].id, options);
	});
}

chrome.browserAction.onClicked.addListener(function (tab) {
	action(tab.id, { type: 'open' });
});

chrome.runtime.onMessage.addListener(
	// eslint-disable-next-line no-unused-vars
	function (msg, _sender, _sendResponse) {
		if (msg.type === 'options') {
			chrome.runtime.openOptionsPage();
		}
	},
);

chrome.commands.onCommand.addListener(function (command) {
	if (['open', 'download', 'copy'].includes(command)) {
		actionInCurrentTab({ type: command });
	}
});

function createContextMenus() {
	chrome.storage.local.get(
		{
			grabMethod: 'Open',
			cxOpen: false,
			cxDownload: true,
			cxCopy: false,
		},
		function (items) {
			if (chrome.runtime.lastError) {
				console.warn(
					`Error retrieving options:${chrome.runtime.lastError.message}`,
				);
			} else {
				if (items.cxOpen === true) {
					chrome.contextMenus.create({
						id: 'open',
						title: 'Open thumbnail',
						contexts: ['page', 'video'],
					});
					chrome.contextMenus.create({
						id: 'open-link',
						title: 'Open thumbnail',
						contexts: ['link'],
					});
				}
				if (items.cxDownload === true) {
					chrome.contextMenus.create({
						id: 'download',
						title: 'Download thumbnail',
						contexts: ['page', 'video'],
					});
					chrome.contextMenus.create({
						id: 'download-link',
						title: 'Download thumbnail',
						contexts: ['link'],
					});
				}
				if (items.cxCopy === true) {
					chrome.contextMenus.create({
						id: 'copy',
						title: 'Copy thumbnail',
						contexts: ['page', 'video'],
					});
					chrome.contextMenus.create({
						id: 'copy-link',
						title: 'Copy thumbnail',
						contexts: ['link'],
					});
				}
			}
		},
	);
}

function injectIfNotAlready(tabId, callback) {
	chrome.tabs.sendMessage(tabId, { type: 'existance-check' }, (response) => {
		if (chrome.runtime.lastError) {
			window.x;
		} // handle error by do nothing
		if (response && response.injected) {
			// already injected
			callback(true);
		} else {
			// not yet injected, so do that
			chrome.tabs.executeScript(tabId, { file: 'content-script.js' }, () => {
				chrome.tabs.insertCSS(tabId, { file: 'content-script.css' }, () => {
					callback();
				});
			});
		}
	});
}

chrome.contextMenus.onClicked.addListener((info, _tab) => {
	let actionType = info.menuItemId;
	if (actionType.endsWith('-link')) {
		actionType = actionType.slice(0, -'-link'.length);
	}
	let url = info.linkUrl || info.pageUrl;
	// if the url is incorrect, that error will be handled by the content script
	if (info.linkUrl) {
		actionInCurrentTab({ type: actionType, externalUrl: url });
	} else {
		actionInCurrentTab({ type: actionType });
	}
});

chrome.runtime.onInstalled.addListener(function () {
	createContextMenus();
});
chrome.storage.onChanged.addListener(function (_changes, _areaName) {
	chrome.contextMenus.removeAll(() => {
		createContextMenus();
	});
});
