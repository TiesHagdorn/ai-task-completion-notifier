// options.js

const notificationToggle = document.getElementById('show-notification');

// Load the saved setting and update the toggle's state.
// We'll default to 'true' (checked) if no setting is found.
chrome.storage.sync.get({ showNotification: true }, (data) => {
  notificationToggle.checked = data.showNotification;
});

// When the toggle is clicked, save the new setting.
notificationToggle.addEventListener('change', () => {
  chrome.storage.sync.set({ showNotification: notificationToggle.checked });
});
