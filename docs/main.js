document.addEventListener('DOMContentLoaded', () => {
  // 1. Copy to Clipboard logic for <pre><code> blocks
  document.querySelectorAll('pre code').forEach((codeBlock) => {
    const pre = codeBlock.parentNode;
    if (!pre) return;
    
    // Create container and wrap the pre block
    const container = document.createElement('div');
    container.className = 'code-container';
    pre.parentNode.insertBefore(container, pre);
    container.appendChild(pre);
    
    // Create the copy button
    const button = document.createElement('button');
    button.className = 'copy-btn';
    button.type = 'button';
    button.textContent = 'Copy';
    
    button.addEventListener('click', async () => {
      // Get text content, trimming trailing linebreaks
      const textToCopy = codeBlock.textContent || '';
      try {
        await navigator.clipboard.writeText(textToCopy.trim());
        button.textContent = 'Copied!';
        button.classList.add('copied');
        setTimeout(() => {
          button.textContent = 'Copy';
          button.classList.remove('copied');
        }, 2000);
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    });
    
    container.appendChild(button);
  });

  // 2. Floating Back-to-Top Button logic
  const btt = document.getElementById('back-to-top');
  if (btt) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        btt.classList.add('show');
      } else {
        btt.classList.remove('show');
      }
    });
    
    btt.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
});
