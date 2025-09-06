// content.js

// This script runs in the context of the web page.
// It watches for changes to detect when an AI response is complete.

// --- GUARD CLAUSE ---
// This checks if the script has already been injected. If so, it stops.
if (typeof window.aiTaskNotifierInjected === 'undefined') {
  window.aiTaskNotifierInjected = true;

  const AI_STOP_BUTTON_SELECTOR = 'button[data-testid="stop-button"]';
  let isGenerating = false;

  function handleGenerationStart() {
    if (isGenerating) return;
    isGenerating = true;
    console.log("AI Task Notifier: Generation started.");
    chrome.runtime.sendMessage({
      action: "startObservingTitle",
      title: document.title
    });
  }

  function handleGenerationEnd() {
    if (!isGenerating) return;
    isGenerating = false;
    console.log("AI Task Notifier: Generation complete.");
    chrome.runtime.sendMessage({
      action: "taskCompleted"
    });
  }

  const observer = new MutationObserver(() => {
    const stopButton = document.querySelector(AI_STOP_BUTTON_SELECTOR);
    if (stopButton) {
      handleGenerationStart();
    } else {
      handleGenerationEnd();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log("AI Task Notifier: Now actively monitoring the page.");

} // --- End of Guard Clause ---