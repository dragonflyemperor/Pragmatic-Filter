document.addEventListener('DOMContentLoaded', () => {
  const keywordInput = document.getElementById('keywordInput');
  const addButton = document.getElementById('addButton');
  const keywordList = document.getElementById('keywordList');
  const pageCountEl = document.getElementById('pageCount');
  const totalCountEl = document.getElementById('totalCount');

  // Load keywords from storage
  chrome.storage.sync.get({ keywords: [] }, (data) => {
    renderKeywords(data.keywords);
  });

  // Get initial stats and set interval
  updateStats();
  setInterval(updateStats, 2000);

  // Add keyword on button click
  addButton.addEventListener('click', addKeyword);

  // Add keyword on Enter key
  keywordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addKeyword();
    }
  });

  function updateStats() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentTabId = tabs[0] ? tabs[0].id : null;
      
      chrome.runtime.sendMessage({ type: 'GET_STATS' }, (response) => {
        if (response) {
          totalCountEl.textContent = response.totalBlocked || 0;
          if (currentTabId && response.tabBlockedCounts[currentTabId]) {
            pageCountEl.textContent = response.tabBlockedCounts[currentTabId];
          } else {
            pageCountEl.textContent = '0';
          }
        }
      });
    });
  }

  function addKeyword() {
    const keyword = keywordInput.value.trim().toLowerCase();
    if (keyword) {
      chrome.storage.sync.get({ keywords: [] }, (data) => {
        let keywords = data.keywords;
        if (!keywords.includes(keyword)) {
          keywords.push(keyword);
          chrome.storage.sync.set({ keywords }, () => {
            renderKeywords(keywords);
            keywordInput.value = '';
          });
        } else {
          // Visual feedback if already exists (optional)
          keywordInput.value = '';
        }
      });
    }
  }

  // Render list
  function renderKeywords(keywords) {
    keywordList.innerHTML = '';
    
    if (keywords.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No keywords added yet.';
      li.style.justifyContent = 'center';
      li.style.color = '#777';
      keywordList.appendChild(li);
      return;
    }

    keywords.forEach((keyword) => {
      const li = document.createElement('li');
      li.textContent = keyword;
      
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Remove';
      deleteBtn.className = 'delete-btn';
      deleteBtn.onclick = () => removeKeyword(keyword);
      
      li.appendChild(deleteBtn);
      keywordList.appendChild(li);
    });
  }

  // Remove keyword
  function removeKeyword(keywordToRemove) {
    chrome.storage.sync.get({ keywords: [] }, (data) => {
      let keywords = data.keywords.filter(k => k !== keywordToRemove);
      chrome.storage.sync.set({ keywords }, () => {
        renderKeywords(keywords);
      });
    });
  }
});
