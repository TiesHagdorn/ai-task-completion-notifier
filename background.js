// background.js

chrome.runtime.onMessage.addListener(async (message, sender) => {
  const tabId = sender.tab.id;

  if (message.action === "startObservingTitle") {
    await chrome.storage.session.set({ [tabId]: message.title });
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (title) => {
        document.title = '⏳ ' + title;
      },
      args: [message.title]
    });

  } else if (message.action === "taskCompleted") {
    const data = await chrome.storage.session.get(tabId.toString());
    const originalTitle = data[tabId];

    if (originalTitle) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (title) => {
          document.title = title;
        },
        args: [originalTitle]
      });

      console.log("Attempting to create notification...");
      
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icon128.png", // Use the local icon
        title: "AI Task Complete!",
        message: `The page "${originalTitle}" has finished its task.`
      });

      await chrome.storage.session.remove(tabId.toString());
    }
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith("https://chatgpt.com/")) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }).catch(err => console.error("Script injection failed:", err));
  }
});