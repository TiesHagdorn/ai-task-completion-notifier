// This script runs in the context of the web page.
// It watches for changes to detect when an AI response is complete.

if (typeof window.aiTaskNotifierInjected === 'undefined') {
  window.aiTaskNotifierInjected = true;

  const AI_PLATFORMS = {
    'chatgpt.com': {
      // For ChatGPT, we watch for the "stop" button
      indicatorSelector: 'button[data-testid="stop-button"]'
    },
    'gemini.google.com': {
      // For Gemini, we now watch for the specific "Stop response" button
      indicatorSelector: 'button[aria-label="Stop response"]'
    }
  };

  const currentHost = window.location.hostname;
  const platformConfig = AI_PLATFORMS[Object.keys(AI_PLATFORMS).find(host => currentHost.includes(host))];

  if (platformConfig) {
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
      chrome.runtime.sendMessage({ action: "taskCompleted" });
    }

    const observer = new MutationObserver(() => {
      const indicatorElement = document.querySelector(platformConfig.indicatorSelector);
      if (indicatorElement) {
        handleGenerationStart();
      } else {
        handleGenerationEnd();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log(`AI Task Notifier: Now actively monitoring ${currentHost}.`);
  }
}

