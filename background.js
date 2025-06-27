// ----- URL SHORTCUTS FUNCTIONALITY -----

// Store shortcuts in memory with fast lookup structures
let shortcuts = [];
let shortcutsMap = new Map(); // For fast exact lookups
let shortcutsWithoutAtMap = new Map(); // For lookups without @ symbol
let defaultKeyword = "";
let defaultUrl = "";

// Load shortcuts from the configuration file
fetch(chrome.runtime.getURL('shortcuts.json'))
  .then(response => response.json())
  .then(data => {
    shortcuts = data.shortcuts;
    
    // Create optimized lookup maps
    shortcuts.forEach(shortcut => {
      shortcutsMap.set(shortcut.shortcut, shortcut.url);
      shortcutsWithoutAtMap.set(shortcut.shortcut.slice(1), shortcut.url);
    });
    
    // Cache default values
    defaultKeyword = shortcuts.length > 0 ? shortcuts[0].shortcut.slice(1) : "vvc";
    defaultUrl = shortcuts.length > 0 ? shortcuts[0].url : "";
    
    setupShortcutsListeners();
  })
  .catch(error => {
    console.error('Failed to load shortcuts:', error);
  });

// New helper functions for URL transformations
function transformUrl(url) {
  // Handle Notion URLs
  // if (url.match(/^https?:\/\/(www\.)?notion\.so\//)) {
  //   return url.replace(/^https?:\/\/(www\.)?notion\.so\//, 'notion://');
  // }
  
  // Handle Todoist task URLs
  const todoistMatch = url.match(/^https?:\/\/app\.todoist\.com\/app\/task\/([a-zA-Z0-9]+)/);
  if (todoistMatch && todoistMatch[1]) {
    return `todoist://task?id=${todoistMatch[1]}`;
  }
  
  return url;
}

function setupShortcutsListeners() {
  // Handle omnibox input - this is the address bar with the @ keyword
  chrome.omnibox.onInputEntered.addListener(function(text) {
    handleShortcut(text);
  });

  // Handle suggestions in the omnibox with pre-computed data
  chrome.omnibox.onInputChanged.addListener((text, suggest) => {
    const suggestions = [];
    
    // Only prepare filtered suggestions
    shortcuts.forEach(shortcut => {
      const shortcutWithoutAt = shortcut.shortcut.slice(1);
      if (!text || shortcutWithoutAt.includes(text)) {
        suggestions.push({
          content: shortcutWithoutAt,
          description: `Go to: ${shortcut.url} (${shortcut.shortcut})`
        });
      }
    });
    
    suggest(suggestions);
  });

  // Monitor address bar navigation attempts
  chrome.webNavigation.onBeforeNavigate.addListener(function(details) {
    if (details.frameId === 0) {
      checkAndRedirect(details.url, details.tabId);
    }
  });
  
  // Monitor URL changes in the address bar
  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.url) {
      checkAddressBarShortcut(changeInfo.url, tabId);
    }
  });
}

// Fast shortcut handling using Map lookups
function handleShortcut(text) {
  // Check for exact match (without @)
  if (shortcutsWithoutAtMap.has(text)) {
    const targetUrl = transformUrl(shortcutsWithoutAtMap.get(text));
    chrome.tabs.update({ url: targetUrl });
    return true;
  }
  
  // Check for exact match (with @)
  const withAt = `@${text}`;
  if (shortcutsMap.has(withAt)) {
    const targetUrl = transformUrl(shortcutsMap.get(withAt));
    chrome.tabs.update({ url: targetUrl });
    return true;
  }
  
  // Default case
  if (defaultUrl) {
    const targetUrl = transformUrl(defaultUrl);
    chrome.tabs.update({ url: targetUrl });
    return true;
  }
  
  return false;
}

// Check if the URL was entered in the address bar with a shortcut
function checkAddressBarShortcut(url, tabId) {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // Check for Notion or Todoist URLs and transform them directly
    if ((hostname === 'notion.so' || hostname === 'www.notion.so') ||
        (hostname === 'app.todoist.com' && urlObj.pathname.includes('/app/task/'))) {
      const transformedUrl = transformUrl(url);
      if (transformedUrl !== url) {
        chrome.tabs.update(tabId, { url: transformedUrl });
        return true;
      }
    }
    
    // Fast path: Check for search engine queries first
    if ((hostname.includes('google.com') && urlObj.pathname.includes('/search')) ||
        (hostname.includes('bing.com') && urlObj.pathname.includes('/search')) ||
        hostname.includes('duckduckgo.com')) {
      
      const query = urlObj.searchParams.get('q');
      if (query) {
        const trimmedQuery = query.trim();
        
        // Direct map lookup is faster than looping
        if (shortcutsMap.has(trimmedQuery)) {
          const targetUrl = transformUrl(shortcutsMap.get(trimmedQuery));
          chrome.tabs.update(tabId, { url: targetUrl });
          return true;
        }
      }
    }
    
    // Check for @ alone (default case)
    if (url === '@' || url === 'http://@/' || url === 'https://@/') {
      const targetUrl = transformUrl(defaultUrl);
      chrome.tabs.update(tabId, { url: targetUrl });
      return true;
    }
    
    // Handle direct entry with efficient pattern matching
    const decodedUrl = decodeURIComponent(url.toLowerCase().trim());
    
    // Check direct matches with the shortcut map
    if (shortcutsMap.has(decodedUrl)) {
      const targetUrl = transformUrl(shortcutsMap.get(decodedUrl));
      chrome.tabs.update(tabId, { url: targetUrl });
      return true;
    }
    
    // Extract potential shortcut from URL path
    // Optimized pattern matching for common URL formats
    for (const [shortcut, targetUrl] of shortcutsMap.entries()) {
      // Common URL patterns for shortcuts
      if (decodedUrl === shortcut || 
          decodedUrl === `http://${shortcut}/` ||
          decodedUrl === `https://${shortcut}/` ||
          decodedUrl.endsWith(`/${shortcut}`) ||
          decodedUrl.endsWith(`/${shortcut}/`)) {
        const transformedUrl = transformUrl(targetUrl);
        chrome.tabs.update(tabId, { url: transformedUrl });
        return true;
      }
    }
  } catch (e) {
    console.error("URL parsing error:", e);
  }
  
  return false;
}

// Check URL for shortcuts and redirect if found
function checkAndRedirect(url, tabId) {
  return checkAddressBarShortcut(url, tabId);
}

// ----- TAB SWITCHER FUNCTIONALITY -----

// Keep track of the active and last active tab IDs
let currentTabId = null;
let lastTabId = null;

// Initialize tab tracking on extension startup
function initializeTabTracking() {
  // Retrieve stored tab IDs if they exist
  chrome.storage.local.get(['currentTabId', 'lastTabId'], function(result) {
    if (result.currentTabId) currentTabId = result.currentTabId;
    if (result.lastTabId) lastTabId = result.lastTabId;
    
    // If we have restored tab IDs, verify they still exist
    if (currentTabId) {
      chrome.tabs.get(currentTabId, function(tab) {
        if (chrome.runtime.lastError) {
          // Tab doesn't exist anymore, reset
          currentTabId = null;
          chrome.storage.local.remove('currentTabId');
        }
      });
    }
    
    if (lastTabId) {
      chrome.tabs.get(lastTabId, function(tab) {
        if (chrome.runtime.lastError) {
          // Tab doesn't exist anymore, reset
          lastTabId = null;
          chrome.storage.local.remove('lastTabId');
        }
      });
    }
    
    // If no current tab is stored or it's invalid, get the active tab
    if (!currentTabId) {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs.length > 0) {
          currentTabId = tabs[0].id;
          saveTabIds();
        }
      });
    }
  });
}

// Save tab IDs to persistent storage
function saveTabIds() {
  chrome.storage.local.set({
    'currentTabId': currentTabId, 
    'lastTabId': lastTabId
  });
}

// When a tab is activated
chrome.tabs.onActivated.addListener(function(activeInfo) {
  if (currentTabId !== null && currentTabId !== activeInfo.tabId) {
    lastTabId = currentTabId;
  }
  currentTabId = activeInfo.tabId;
  saveTabIds();
});

// When a tab is removed
chrome.tabs.onRemoved.addListener(function(tabId) {
  // If the removed tab was the current or last tab, adjust accordingly
  if (tabId === currentTabId) {
    currentTabId = lastTabId;
    lastTabId = null;
    saveTabIds();
  } else if (tabId === lastTabId) {
    lastTabId = null;
    saveTabIds();
  }
});

// When a new tab is created
chrome.tabs.onCreated.addListener(function(tab) {
  // If this is the first tab, make it the current tab
  if (currentTabId === null) {
    currentTabId = tab.id;
    saveTabIds();
  }
});

// ----- GOOGLE DRIVE SHORTCUTS FUNCTIONALITY -----

// Handle browser action click as a fallback (does nothing visibly)
chrome.action.onClicked.addListener(() => {
  // No popup, no action on click
});

// ----- COMBINED COMMAND HANDLER -----

// When any command is triggered
chrome.commands.onCommand.addListener(function(command) {
  // Tab switcher command
  if (command === "switch-tab") {
    if (lastTabId !== null) {
      // Try to switch to the last tab
      chrome.tabs.get(lastTabId, function(tab) {
        if (!chrome.runtime.lastError) {
          // Tab exists, switch to it
          chrome.tabs.update(lastTabId, { active: true });
        } else {
          // Tab doesn't exist, find a fallback tab
          chrome.tabs.query({}, function(tabs) {
            if (tabs.length > 1) {
              // Find another tab that's not the current one
              const fallbackTab = tabs.find(t => t.id !== currentTabId);
              if (fallbackTab) {
                lastTabId = fallbackTab.id;
                chrome.tabs.update(lastTabId, { active: true });
                saveTabIds();
              }
            }
          });
        }
      });
    } else {
      // If no last tab, try to find another tab to switch to
      chrome.tabs.query({}, function(tabs) {
        if (tabs.length > 1) {
          const otherTab = tabs.find(t => t.id !== currentTabId);
          if (otherTab) {
            lastTabId = otherTab.id;
            chrome.tabs.update(lastTabId, { active: true });
            saveTabIds();
          }
        }
      });
    }
  }
  
  // Google Drive shortcuts commands
  else if (command === "open-drive-account-0") {
    chrome.tabs.create({ url: "https://drive.google.com/drive/u/0/recent" });
  } 
  else if (command === "open-drive-account-3") {
    chrome.tabs.create({ url: "https://drive.google.com/drive/u/3/recent" });
  }
  
  // Calendar shortcut command
  else if (command === "open-calendar") {
    chrome.tabs.create({ url: "https://calendar.notion.so/" });
  }
});

// Initialize when the extension starts
initializeTabTracking();
