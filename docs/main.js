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

  // 5. Secure Email Link Obfuscation (Prevents static spambot harvesting)
  document.querySelectorAll('.contact-email').forEach((link) => {
    const user = link.getAttribute('data-user');
    const domain = link.getAttribute('data-domain');
    if (user && domain) {
      link.setAttribute('href', `mailto:${user}@${domain}`);
    }
  });

  // 6. Footer Active Link Highlighting
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.footer-col a').forEach((link) => {
    const href = link.getAttribute('href');
    if (href && !href.startsWith('http') && !href.startsWith('mailto') && !href.startsWith('#')) {
      const linkPage = href.split('?')[0].split('#')[0];
      if (linkPage === currentPage) {
        link.classList.add('active');
      }
    }
  });

  // 7. Top navigation: mobile menu toggle, Docs dropdown, active-link state
  const navToggleBtn = document.querySelector('.mobile-menu-btn');
  const topNav = document.getElementById('topNav');
  if (navToggleBtn && topNav) {
    navToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = topNav.classList.toggle('open');
      navToggleBtn.setAttribute('aria-expanded', String(open));
    });
  }

  const navDropdowns = document.querySelectorAll('.nav-dropdown');
  const closeDropdowns = () => {
    navDropdowns.forEach((dd) => {
      dd.classList.remove('open');
      const t = dd.querySelector('.nav-dropdown-toggle');
      if (t) t.setAttribute('aria-expanded', 'false');
    });
  };
  navDropdowns.forEach((dd) => {
    const toggleEl = dd.querySelector('.nav-dropdown-toggle');
    if (!toggleEl) return;
    toggleEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dd.classList.contains('open');
      closeDropdowns();
      if (!isOpen) {
        dd.classList.add('open');
        toggleEl.setAttribute('aria-expanded', 'true');
      }
    });
  });
  // Close open dropdowns on outside click or Escape
  document.addEventListener('click', closeDropdowns);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDropdowns();
  });

  // Highlight the current page in the top nav (and its parent Docs toggle)
  document.querySelectorAll('.top-nav a').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('#')) return;
    const linkPage = href.split('?')[0].split('#')[0];
    if (linkPage && linkPage === currentPage) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
      if (link.classList.contains('nav-dropdown-item')) {
        const parent = link.closest('.nav-dropdown');
        const parentToggle = parent && parent.querySelector('.nav-dropdown-toggle');
        if (parentToggle) parentToggle.classList.add('active');
      }
    }
  });

  // 8. Scroll to top on every page load (prevents stale scroll from bfcache)
  window.scrollTo(0, 0);
});

