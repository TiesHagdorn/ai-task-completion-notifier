// This is the service worker that runs in the background.
// It listens for events and handles the logic that affects the browser,
// such as sending notifications.

// A simple map to store original titles for restoration.
const tabTitles = {};

// Listener for messages from the content script.
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === "startObservingTitle") {
    // Store the original title.
    tabTitles[sender.tab.id] = message.title;

    // This script runs a function in the tab's context to change the title.
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      func: (title) => {
        document.title = '⏳ ' + title;
      },
      args: [tabTitles[sender.tab.id]]
    });

  } else if (message.action === "taskCompleted") {
    // The response is complete, handle the title and notification.
    const originalTitle = tabTitles[sender.tab.id];

    // Restore the title.
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      func: (title) => {
        document.title = title;
      },
      args: [originalTitle]
    });

    // Check if the tab that sent the message is active.
    chrome.tabs.get(sender.tab.id, (tab) => {
      if (!tab.active) {
        chrome.notifications.create({
          type: "basic",
          iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=" + new URL(tab.url).hostname,
          title: "AI Task Complete!",
          message: `The page "${originalTitle}" has finished its task.`
        });
      }
    });

    delete tabTitles[sender.tab.id];
  }
});

// Programmatically inject the content script when a new tab is created or updated.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only inject if the page is fully loaded and it's a ChatGPT URL.
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith("https://chatgpt.com/")) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }).catch(err => console.error("Script injection failed:", err));
  }
});