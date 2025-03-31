// Edge Cut Fix - Prevents Edge's Cut feature from interfering with text selection
// This script runs on all pages to ensure text selections work as expected

(function() {
  // Function to handle mousedown events
  function handleMouseDown(event) {
    // Only run this fix in Microsoft Edge
    if (!navigator.userAgent.includes('Edg')) {
      return;
    }
    
    // Check if there's a text selection
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      // Prevent Edge Cut feature from activating on text selections
      event.stopPropagation();
    }
  }

  // Function to prevent Edge Cut from activating when selecting text
  function setupEdgeCutFix() {
    // Add true as third parameter to capture events before they reach other handlers
    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('mouseup', function(event) {
      // Delay to allow normal selection to occur
      setTimeout(() => {
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed) {
          // Ensure selected text remains selected
          const range = selection.getRangeAt(0);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }, 10);
    }, true);
  }

  // Initialize the fix
  setupEdgeCutFix();
})();
