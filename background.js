// background.js

// Listener for messages from the content script.
// It's now an async function to handle storage operations.
chrome.runtime.onMessage.addListener(async (message, sender) => {
  const tabId = sender.tab.id;

  if (message.action === "startObservingTitle") {
    // Save the tab's original title to session storage.
    await chrome.storage.session.set({ [tabId]: message.title });
    
    // Update the tab's title to show the loading indicator.
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (title) => {
        document.title = '⏳ ' + title;
      },
      args: [message.title]
    });

  } else if (message.action === "taskCompleted") {
    // Retrieve the original title from session storage.
    const data = await chrome.storage.session.get(tabId.toString());
    const originalTitle = data[tabId];

    if (originalTitle) {
      // Restore the original title.
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (title) => {
          document.title = title;
        },
        args: [originalTitle]
      });

      // Check if the tab is active before sending a notification.
      chrome.tabs.get(tabId, (tab) => {
        if (!tab.active) {
          chrome.notifications.create({
            type: "basic",
            iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=" + new URL(tab.url).hostname,
            title: "AI Task Complete!",
            message: `The page "${originalTitle}" has finished its task.`
          });
        }
      });

      // Clean up by removing the title from storage.
      await chrome.storage.session.remove(tabId.toString());
    }
  }
});

// Programmatically inject the content script when a new tab is created or updated.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith("https://chatgpt.com/")) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }).catch(err => console.error("Script injection failed:", err));
  }
});