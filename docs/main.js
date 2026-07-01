// Immediately apply saved theme preference to avoid FOUC before DOM is ready
(() => {
  try {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
      document.documentElement.classList.add('theme-light');
    }
  } catch (e) {
    console.warn('localStorage not accessible, defaulting to dark theme.');
  }
})();

document.addEventListener('DOMContentLoaded', () => {
  let currentTheme = 'dark';
  try {
    currentTheme = localStorage.getItem('theme') || 'dark';
  } catch (e) {}

  // 1. Inject Floating Theme Toggle Button globally
  const toggle = document.createElement('button');
  toggle.id = 'theme-toggle';
  toggle.className = 'theme-toggle';
  toggle.setAttribute('aria-label', 'Toggle light/dark theme');
  toggle.innerHTML = `
    <!-- Sun icon (shown in dark theme to switch to light) -->
    <svg class="sun-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="4"></circle>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>
    </svg>
    <!-- Moon icon (shown in light theme to switch to dark) -->
    <svg class="moon-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>
  `;

  // Attach event handler
  toggle.addEventListener('click', () => {
    const isLight = document.documentElement.classList.toggle('theme-light');
    const newTheme = isLight ? 'light' : 'dark';
    try {
      localStorage.setItem('theme', newTheme);
    } catch (e) {
      console.warn('localStorage setItem failed:', e);
    }

    // Sync theme with demo iframe if present
    syncIframeTheme(newTheme);
  });

  document.body.appendChild(toggle);

  // Sync theme with iframe initially on load
  const iframe = document.getElementById('demo-iframe');
  if (iframe) {
    // Modify initial src to include theme parameter so it loads with correct theme
    try {
      const url = new URL(iframe.src, window.location.href);
      url.searchParams.set('theme', currentTheme);
      iframe.src = url.toString();
    } catch (e) {
      console.error('Error modifying iframe src:', e);
    }
    
    // Also sync via postMessage when iframe finishes loading
    iframe.addEventListener('load', () => {
      const activeTheme = document.documentElement.classList.contains('theme-light') ? 'light' : 'dark';
      syncIframeTheme(activeTheme);
    });
  }

  function syncIframeTheme(themeName) {
    const activeIframe = document.getElementById('demo-iframe');
    if (activeIframe && activeIframe.contentWindow) {
      activeIframe.contentWindow.postMessage({ type: 'theme', theme: themeName }, '*');
    }
  }

  // 2. Copy to Clipboard logic for <pre><code> blocks
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

  // 3. Floating Back-to-Top Button logic
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

  // 4. Responsive table labels for mobile stacked layout
  document.querySelectorAll('.token-table').forEach((table) => {
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
    table.querySelectorAll('tbody tr').forEach((row) => {
      row.querySelectorAll('td').forEach((td, index) => {
        if (headers[index]) {
          td.setAttribute('data-label', headers[index]);
        }
      });
    });
  });
});

