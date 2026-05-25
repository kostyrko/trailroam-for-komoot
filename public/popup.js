const openTrailroamButton = document.querySelector('#open-trailroam');
const popupStatus = document.querySelector('#popup-status');

function setStatus(message) {
  if (popupStatus) {
    popupStatus.textContent = message;
  }
}

openTrailroamButton?.addEventListener('click', async () => {
  const appUrl = chrome.runtime.getURL('app/index.html');

  try {
    await chrome.tabs.create({ url: appUrl });
    window.close();
  } catch {
    setStatus('Unable to open Trailroam.');
  }
});
