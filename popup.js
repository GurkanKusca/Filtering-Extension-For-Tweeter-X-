const input = document.getElementById("filterInput");
const addBtn = document.getElementById("addBtn");
const saveBtn = document.getElementById("saveBtn");
const list = document.getElementById("filterList");
const statusDiv = document.getElementById("status");
const filterCountDiv = document.getElementById("filterCount");
const blockedCountDiv = document.getElementById("blockedCount");

let filters = [];

// Load existing filters when popup opens
chrome.storage.local.get(['userFilters', 'blockedCount'], (result) => {
  if (result.userFilters) {
    filters = result.userFilters;
    renderFilters();
  }
  if (result.blockedCount) {
    blockedCountDiv.textContent = `Images blocked: ${result.blockedCount}`;
  } else {
    blockedCountDiv.textContent = 'Images blocked: 0';
  }
});

// Add filter to the list
addBtn.addEventListener("click", addFilter);
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") addFilter();
});

function addFilter() {
  const value = input.value.trim().toLowerCase();
  if (value && !filters.includes(value)) {
    filters.push(value);
    renderFilters();
    input.value = "";
    showStatus("Filter added!", "success");
  }
}

// Render the filters on the popup
function renderFilters() {
  list.innerHTML = "";
  filterCountDiv.textContent = `Active filters: ${filters.length}`;
  
  filters.forEach((f, i) => {
    const li = document.createElement("li");
    
    const span = document.createElement("span");
    span.textContent = f;
    li.appendChild(span);

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "✕";
    removeBtn.className = "remove-btn";
    removeBtn.addEventListener("click", () => {
      filters.splice(i, 1);
      renderFilters();
      showStatus("Filter removed", "success");
    });

    li.appendChild(removeBtn);
    list.appendChild(li);
  });
}

// Save filters as JavaScript array (NOT Python string!)
saveBtn.addEventListener("click", async () => {
  await chrome.storage.local.set({ userFilters: filters });
  showStatus("✓ Filters saved successfully!", "success");
  console.log("Saved filters:", filters);
  
  // Notify background script that settings changed
  chrome.runtime.sendMessage({ action: "filtersUpdated" });
});

function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = "block";
  
  setTimeout(() => {
    statusDiv.style.display = "none";
  }, 3000);
}