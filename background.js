console.log("Twitter Image Filter: Background script loaded");

let userFilters = [];
let blockedCount = 0;

// Load user preferences
chrome.storage.local.get(['userFilters', 'blockedCount'], (result) => {
  userFilters = result.userFilters || [];
  blockedCount = result.blockedCount || 0;
  console.log("Loaded filters:", userFilters);
  console.log("Blocked count:", blockedCount);
});

// Listen for filter updates from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "filtersUpdated") {
    chrome.storage.local.get('userFilters', (result) => {
      userFilters = result.userFilters || [];
      console.log("Filters updated:", userFilters);
    });
  }
});

// Cache to avoid re-checking same images
const checkedImages = new Map();

// Intercept image requests on Twitter
chrome.webRequest.onBeforeRequest.addListener(
  async function(details) {
    // Only process Twitter images
    if (!isTwitterImage(details.url)) {
      return { cancel: false };
    }

    // Skip if no filters set
    if (!userFilters || userFilters.length === 0) {
      console.log("No filters set, allowing image");
      return { cancel: false };
    }

    // Check cache first
    if (checkedImages.has(details.url)) {
      const shouldBlock = checkedImages.get(details.url);
      console.log(`Cache hit for ${details.url}: ${shouldBlock ? 'BLOCK' : 'ALLOW'}`);
      return { cancel: shouldBlock };
    }

    console.log("Checking image:", details.url);

    try {
      // Call your Python backend
      const response = await fetch('http://localhost:5000/filter-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: details.url,
          user_filters: userFilters
        })
      });

      if (!response.ok) {
        console.error("Backend error:", response.status);
        return { cancel: false }; // Allow on error
      }

      const result = await response.json();
      const shouldBlock = result.should_block;

      // Cache result
      checkedImages.set(details.url, shouldBlock);

      if (shouldBlock) {
        blockedCount++;
        chrome.storage.local.set({ blockedCount: blockedCount });
        console.log(`🚫 BLOCKED: ${result.reason} (${result.confidence})`);
      } else {
        console.log(`✓ ALLOWED: ${result.reason}`);
      }

      return { cancel: shouldBlock };

    } catch (error) {
      console.error("Error checking image:", error);
      // Allow image if backend is down
      return { cancel: false };
    }
  },
  {
    urls: [
      "*://*.twimg.com/*",
      "*://pbs.twimg.com/*",
      "*://ton.twimg.com/*"
    ],
    types: ["image"]
  },
  ["blocking"]
);

// Helper function to identify Twitter images
function isTwitterImage(url) {
  return url.includes('twimg.com') && 
         (url.includes('.jpg') || url.includes('.png') || 
          url.includes('.webp') || url.includes('.jpeg') ||
          url.includes('format='));
}