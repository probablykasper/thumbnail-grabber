async function action(tabId, options) {
	await injectIfNotAlready(tabId);
	chrome.tabs.sendMessage(tabId, options);
}

async function actionInCurrentTab(options) {
	const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
	await action(tabs[0].id, options);
}

chrome.action.onClicked.addListener(async (tab) => {
	await action(tab.id, { type: 'open' });
});

chrome.runtime.onMessage.addListener((msg, _sender, _sendResponse) => {
	if (msg.type === 'options') {
		chrome.runtime.openOptionsPage();
	} else if (msg.type === 'copyblob') {
		try {
			browser.clipboard.setImageData(msg.arrayBuffer, msg.imageType);
			return Promise.resolve({ success: true });
		} catch (_error) {
			return Promise.resolve({ success: false });
		}
	}
});

chrome.commands.onCommand.addListener((command) => {
	if (['open', 'download', 'copy'].includes(command)) {
		actionInCurrentTab({ type: command });
	}
});

async function createContextMenus() {
	const items = await chrome.storage.local.get({
		grabMethod: 'Open',
		cxOpen: false,
		cxDownload: true,
		cxCopy: false,
	});
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
}

async function injectIfNotAlready(tabId) {
	const response = await chrome.tabs
		.sendMessage(tabId, {
			type: 'existance-check',
		})
		.catch(() => {
			// handle error by do nothing
		});
	if (response?.injected) {
		// already injected
		return true;
	} else {
		// not yet injected, so do that
		await chrome.scripting.executeScript({
			target: { tabId: tabId },
			files: ['up_/content-script.js'],
		});
		await chrome.scripting.insertCSS({
			target: { tabId: tabId },
			files: ['up_/content-script.css'],
		});
		return false;
	}
}

chrome.contextMenus.onClicked.addListener((info, _tab) => {
	let actionType = String(info.menuItemId);
	if (actionType.endsWith('-link')) {
		actionType = actionType.slice(0, -'-link'.length);
	}
	const url = info.linkUrl || info.pageUrl;
	// if the url is incorrect, that error will be handled by the content script
	if (info.linkUrl) {
		actionInCurrentTab({ type: actionType, externalUrl: url });
	} else {
		actionInCurrentTab({ type: actionType });
	}
});

chrome.runtime.onInstalled.addListener(async () => {
	await createContextMenus();
});
chrome.storage.onChanged.addListener((_changes, _areaName) => {
	chrome.contextMenus.removeAll(async () => {
		await createContextMenus();
	});
});
