// This script runs in the context of the web page.
// It watches for changes to detect when an AI response is complete.

// This selector uses the unique ID of the button, which is the most reliable option.
const AI_STOP_BUTTON_SELECTOR = '#composer-submit-button';

// A flag to ensure we only send the notification once per page load.
let hasNotified = false;

// Store the original document title so we can restore it later.
let originalTitle = document.title;
let isMonitoring = false;
let monitorInterval = null; // To hold the interval ID

// Function to start monitoring the page for a response.
function startMonitoring() {
  // Clear any existing interval to prevent multiple loops.
  if (monitorInterval) {
    clearInterval(monitorInterval);
  }
  if (isMonitoring) return;
  isMonitoring = true;

  console.log("AI Task Notifier: Starting monitoring for a new response.");

  // Poll for the stop button every 500ms. This is more reliable than a single observer.
  monitorInterval = setInterval(() => {
    const stopButton = document.querySelector(AI_STOP_BUTTON_SELECTOR);

    if (stopButton) {
      clearInterval(monitorInterval);
      console.log("AI Task Notifier: Found stop button. Starting title indicator and body observer.");
      
      // Send a message to the background script to start the title observer.
      chrome.runtime.sendMessage({
        action: "startObservingTitle",
        title: originalTitle
      });

      // Start the main observer to watch for the button's disappearance.
      const bodyObserver = new MutationObserver(() => {
        if (!hasNotified && !document.querySelector(AI_STOP_BUTTON_SELECTOR)) {
          console.log("AI Task Notifier: Stop button disappeared, response is complete.");
          chrome.runtime.sendMessage({
            action: "taskCompleted",
            finalTitle: document.title
          });
          hasNotified = true;
          bodyObserver.disconnect();
        }
      });

      bodyObserver.observe(document.body, { childList: true, subtree: true });
    }
  }, 500);
}

// Function to reset and restart monitoring, crucial for SPAs.
function reinitialize() {
  hasNotified = false;
  isMonitoring = false;
  originalTitle = document.title; // Update title in case it changed
  startMonitoring();
}

// Re-initialize the script on common SPA navigation events.
window.addEventListener('popstate', reinitialize);
window.addEventListener('hashchange', reinitialize);

// Also watch for URL changes that don't trigger the events above.
let lastUrl = location.href; 
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    reinitialize();
  }
}).observe(document.body, {subtree: true, childList: true});


// Start the process when the content script is first loaded.
startMonitoring();