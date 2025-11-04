console.log("Twitter Image Filter: Content script loaded");

// Replace broken images with placeholder
function replaceBlockedImages() {
  const images = document.querySelectorAll('img');
  
  images.forEach(img => {
    // If image failed to load (was blocked)
    if (!img.complete || img.naturalHeight === 0) {
      // Check if it's a Twitter image
      if (img.src.includes('twimg.com')) {
        // Replace with placeholder
        img.style.background = '#f0f0f0';
        img.style.border = '2px dashed #ccc';
        img.style.display = 'flex';
        img.style.alignItems = 'center';
        img.style.justifyContent = 'center';
        img.style.minHeight = '200px';
        img.alt = '🚫 Image blocked by filter';
        
        // Add text overlay
        if (!img.nextElementSibling || !img.nextElementSibling.classList.contains('filter-notice')) {
          const notice = document.createElement('div');
          notice.className = 'filter-notice';
          notice.style.cssText = `
            position: absolute;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 10px;
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none;
          `;
          notice.textContent = '🚫 Image filtered';
          img.parentElement.style.position = 'relative';
          img.parentElement.appendChild(notice);
        }
      }
    }
  });
}

// Run replacement periodically (Twitter loads content dynamically)
setInterval(replaceBlockedImages, 1000);

// Also run on page load
window.addEventListener('load', replaceBlockedImages);