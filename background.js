// background.js

chrome.runtime.onMessage.addListener(async (message, sender) => {
  const tabId = sender.tab.id;
  const tabUrl = sender.tab.url; // Get the URL from the sender

  // Helper function to get the AI name from the URL
  function getAiName(url) {
    if (url.includes('chatgpt.com')) return 'ChatGPT';
    if (url.includes('gemini.google.com')) return 'Gemini';
    if (url.includes('claude.ai')) return 'Claude';
    return 'The AI'; // Fallback name
  }

  if (message.action === "startObservingTitle") {
    // Store the original title
    await chrome.storage.session.set({ [tabId]: message.title });
    
    // Set the hourglass emoji in the title
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (title) => {
        document.title = '⏳ ' + title;
      },
      args: [message.title]
    });

  } else if (message.action === "taskCompleted") {
    // Retrieve the original title
    const data = await chrome.storage.session.get(tabId.toString());
    const originalTitle = data[tabId];

    if (originalTitle) {
      // Restore the original title
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (title) => {
          document.title = title;
        },
        args: [originalTitle]
      });

      // Check the user's preference from the options popup
      const { showNotifications } = await chrome.storage.sync.get({ showNotifications: true });

      // If notifications are enabled, create one
      if (showNotifications) {
        const aiName = getAiName(tabUrl); // Get the dynamic name
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icon128.png",
          title: "AI Task Complete!",
          message: `${aiName} has finished its task.` // Updated message
        });
      }

      // Clean up storage
      await chrome.storage.session.remove(tabId.toString());
    }
  }
});

// An array of supported URLs for easy checking
const supportedUrls = [
  "https://chatgpt.com/",
  "https://gemini.google.com/",
  "https://claude.ai/"
];

// Programmatically inject the content script when a new tab is created or updated.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const isSupported = tab.url && supportedUrls.some(url => tab.url.startsWith(url));
  if (changeInfo.status === 'complete' && isSupported) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }).catch(err => console.error("Script injection failed:", err));
  }
});

