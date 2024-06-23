function setStatus(msg, keep) {
	const status = document.getElementById('status');
	if (status) {
		status.style.animation = '';
		status.textContent = msg;
		window.requestAnimationFrame(() => {
			if (!keep) {
				status.style.animation = 'fade-out 1s forwards';
			}
		});
	}
}

function save() {
	const grabMethod = document.getElementById('grab-method').value;
	const cxOpen = document.getElementById('cx-open').checked;
	const cxDownload = document.getElementById('cx-download').checked;
	const cxCopy = document.getElementById('cx-copy').checked;
	chrome.storage.local.set(
		{
			grabMethod: grabMethod,
			cxOpen: cxOpen,
			cxDownload: cxDownload,
			cxCopy: cxCopy,
		},
		() => {
			if (chrome.runtime.lastError) {
				setStatus('Error saving options :/', true);
			} else {
				setStatus('Saved');
			}
		},
	);
}

function restoreOptions() {
	chrome.storage.local.get(
		{
			grabMethod: 'Open',
			cxOpen: false,
			cxDownload: true,
			cxCopy: false,
		},
		(items) => {
			if (chrome.runtime.lastError) {
				console.warn(
					`Error retrieving options:${chrome.runtime.lastError.message}`,
				);
				setStatus('Error retrieving options :/', true);
			} else {
				document.getElementById('grab-method').value = items.grabMethod;
				document.getElementById('cx-open').checked = items.cxOpen;
				document.getElementById('cx-download').checked = items.cxDownload;
				document.getElementById('cx-copy').checked = items.cxCopy;
			}
		},
	);
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('grab-method').addEventListener('change', save);
document.getElementById('cx-open').addEventListener('click', save);
document.getElementById('cx-download').addEventListener('click', save);
document.getElementById('cx-copy').addEventListener('click', save);

document.getElementById('shortcuts-link').addEventListener('click', () => {
	chrome.tabs.create({
		url: 'chrome://extensions/configureCommands',
	});
});
