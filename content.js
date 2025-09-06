// This script runs in the context of the web page.
// It watches for changes to detect when an AI response is complete.

// --- GUARD CLAUSE ---
// This prevents the script from being injected multiple times.
if (typeof window.aiTaskNotifierInjected === 'undefined') {
  window.aiTaskNotifierInjected = true;

  // Configuration for each supported AI site.
  // Each site has a unique selector to find its "generating" indicator.
  const SITE_CONFIG = {
    'chatgpt.com': {
      indicatorSelector: 'button[data-testid="stop-button"]',
    },
    'gemini.google.com': {
      indicatorSelector: 'button[aria-label="Stop response"]',
    },
    'claude.ai': {
      // Claude shows a button with the aria-label "Stop response" while generating.
      indicatorSelector: 'button[aria-label="Stop response"]',
    }
  };

  // Determine which site we're on.
  const currentHost = window.location.hostname;
  const config = SITE_CONFIG[Object.keys(SITE_CONFIG).find(host => currentHost.includes(host))];

  // Only run the script if we are on a supported site.
  if (config) {
    let isGenerating = false;

    function handleGenerationStart() {
      if (isGenerating) return;
      isGenerating = true;
      console.log("AI Task Notifier: Generation started.");
      chrome.runtime.sendMessage({
        action: "startObservingTitle",
        title: document.title,
      });
    }

    function handleGenerationEnd() {
      if (!isGenerating) return;
      isGenerating = false;
      console.log("AI Task Notifier: Generation complete.");
      chrome.runtime.sendMessage({
        action: "taskCompleted",
      });
    }

    // Use a MutationObserver to instantly react to page changes.
    const observer = new MutationObserver(() => {
      const indicatorElement = document.querySelector(config.indicatorSelector);

      if (indicatorElement) {
        handleGenerationStart();
      } else {
        handleGenerationEnd();
      }
    });

    // Start observing the entire document.
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    console.log("AI Task Notifier: Now actively monitoring the page.");
  }
}

