let blockedKeywords = [];
let isEnabled = true;

// Load initial keywords and enabled state
chrome.storage.sync.get({ keywords: [], enabled: true }, (data) => {
  isEnabled = data.enabled;
  blockedKeywords = data.keywords.map(k => k.toLowerCase());
  if (isEnabled) {
    scanAndHide();
  }
});

// Listen for updates from popup
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    let stateChanged = false;
    
    if (changes.enabled !== undefined) {
      isEnabled = changes.enabled.newValue;
      stateChanged = true;
    }
    
    if (changes.keywords) {
      blockedKeywords = changes.keywords.newValue.map(k => k.toLowerCase());
      stateChanged = true;
    }

    if (stateChanged) {
      // Remove 'filterHidden' flag from everything so we can rescan or show them
      document.querySelectorAll('[data-filter-hidden="true"]').forEach(el => {
        el.removeAttribute('data-filter-hidden');
        el.style.display = ''; // reset display
      });

      if (isEnabled) {
        scanAndHide(); // Rescan immediately
      }
    }
  }
});

function getPlatformSelectors() {
  const hostname = window.location.hostname;
  if (hostname.includes('facebook.com')) {
    // Facebook: feed posts, list items (search results), profiles, and modals
    return [
      'div[role="article"]', 
      'div[role="listitem"]',
      'div[data-pagelet^="FeedUnit"]',
      'div.x1yztbdb', // common container class on FB
      'div[role="dialog"]' // Catches comment modals
    ];
  } else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
    // Twitter/X: timeline rows, user cells in search
    return [
      'div[data-testid="cellInnerDiv"]', 
      'article[data-testid="tweet"]',
      'div[data-testid="UserCell"]'
    ];
  } else if (hostname.includes('instagram.com')) {
    // Instagram: articles, main content, and modals
    return [
      'article',
      'main',
      'div[role="dialog"]' // Catches post pop-ups
    ];
  } else if (hostname.includes('youtube.com')) {
    // YouTube
    return [
      'ytd-rich-item-renderer',      // Home feed videos
      'ytd-video-renderer',          // Search result videos
      'ytd-comment-thread-renderer', // Comments
      'ytd-post-renderer',           // Community posts
      'tp-yt-paper-dialog'           // Dialogs
    ];
  }
  return [];
}

function hidePost(post) {
  if (post.dataset.filterHidden === 'true') return;
  post.dataset.filterHidden = 'true';
  post.setAttribute('style', 'display: none !important;');
  
  try {
    chrome.runtime.sendMessage({ type: 'ITEM_BLOCKED' });
  } catch (e) {
    // Handle case where extension was reloaded
  }
}

function scanAndHide() {
  if (!isEnabled) return;
  if (blockedKeywords.length === 0) return;

  const selectors = getPlatformSelectors();
  if (selectors.length === 0) return;

  // Find all post containers on the page
  const posts = document.querySelectorAll(selectors.join(', '));
  
  posts.forEach(post => {
    // If it's already hidden by us, skip
    if (post.dataset.filterHidden === 'true') return;

    // Use textContent to catch hidden text (e.g. behind "show more" if it's in the DOM but hidden via CSS)
    let textToScan = post.textContent || "";
    
    // Also include hrefs of links inside the post (catches shared URLs with the keyword)
    const links = post.querySelectorAll('a');
    links.forEach(link => {
      textToScan += " " + link.href;
    });

    const lowerText = textToScan.toLowerCase();

    // Check if any blocked keyword is in the text
    const shouldHide = blockedKeywords.some(keyword => lowerText.includes(keyword));

    if (shouldHide) {
      hidePost(post);
    }
  });
}

// Set up MutationObserver to handle dynamically loaded content
const observer = new MutationObserver((mutations) => {
  if (!isEnabled) return;
  let shouldScan = false;
  for (let mutation of mutations) {
    if (mutation.addedNodes.length > 0) {
      for (let i = 0; i < mutation.addedNodes.length; i++) {
        if (mutation.addedNodes[i].nodeType === 1) { 
          shouldScan = true;
          break;
        }
      }
    }
    if (shouldScan) break;
  }
  
  if (shouldScan) {
    // Debounce the scan slightly to batch mutations
    if (window.scanTimeout) clearTimeout(window.scanTimeout);
    window.scanTimeout = setTimeout(scanAndHide, 100);
  }
});

setTimeout(() => {
  observer.observe(document.body, { childList: true, subtree: true });
}, 1000);
