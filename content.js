// This script runs in the context of the web page.
// It watches for changes to detect when an AI response is complete.

// --- GUARD CLAUSE ---
// This prevents the script from being injected multiple times.
if (typeof window.aiTaskNotifierInjected === 'undefined') {
  window.aiTaskNotifierInjected = true;

  // Configuration for each supported AI site.
  const SITE_CONFIG = {
    'chatgpt.com': {
      indicatorSelector: 'button[data-testid="stop-button"]',
    },
    'gemini.google.com': {
      indicatorSelector: 'button[aria-label="Stop response"]',
    },
    'claude.ai': {
      indicatorSelector: 'button[aria-label="Stop response"]',
    }
  };

  const currentHost = window.location.hostname;
  const config = SITE_CONFIG[Object.keys(SITE_CONFIG).find(host => currentHost.includes(host))];

  if (config) {
    let isGenerating = false;

    function sendMessage(message) {
      try {
        // This will fail if the extension context is invalidated.
        chrome.runtime.sendMessage(message);
      } catch (error) {
        console.log("AI Task Notifier: Extension context invalidated. Muting error:", error.message);
        // The observer should be disconnected to prevent further errors.
        observer.disconnect();
      }
    }

    function handleGenerationStart() {
      if (isGenerating) return;
      isGenerating = true;
      console.log("AI Task Notifier: Generation started.");
      sendMessage({
        action: "startObservingTitle",
        title: document.title,
      });
    }

    function handleGenerationEnd() {
      if (!isGenerating) return;
      isGenerating = false;
      console.log("AI Task Notifier: Generation complete.");
      sendMessage({
        action: "taskCompleted",
      });
    }

    const observer = new MutationObserver(() => {
      const indicatorElement = document.querySelector(config.indicatorSelector);
      if (indicatorElement) {
        handleGenerationStart();
      } else {
        handleGenerationEnd();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    console.log("AI Task Notifier: Now actively monitoring the page.");
  }
}
