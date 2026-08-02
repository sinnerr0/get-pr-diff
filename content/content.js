let systemPrompt = DEFAULT_SYSTEM_PROMPT;

readSystemPrompt().then(stored => {
  systemPrompt = stored;
});

onSystemPromptChanged(updated => {
  systemPrompt = updated;
});

function getReviewButton() {
  const reviewButtonOld = document.querySelector('.js-reviews-toggle');
  const reviewButtonNew = document.querySelector('[class*="ReviewMenuButton"]');
  const prCodeButton = document.querySelector('[class*="PullRequestCodeButton"]');
  return reviewButtonOld || reviewButtonNew || prCodeButton;
}

function addCopyDiffButton() {
  if (document.querySelector('#pr-diff-copy-button')) return;

  // Look for the Review changes or PR Code button
  const reviewButton = getReviewButton();
  if (!reviewButton) return;

  const button = document.createElement('button');
  button.id = 'pr-diff-copy-button';
  button.className = 'Button--secondary Button';
  button.type = 'button';
  button.setAttribute('data-view-component', 'true');
  button.innerHTML = `
    <span class="Button-content">
      <span class="Button-label">
        <svg class="octicon octicon-paste mr-1" height="16" viewBox="0 0 16 16" width="16" aria-hidden="true">
          <path fill-rule="evenodd" d="M5.75 1a.75.75 0 00-.75.75v3c0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75v-3a.75.75 0 00-.75-.75h-4.5zm.75 3V2.5h3V4h-3zm-2.874-.467a.75.75 0 00-.752-1.298A1.75 1.75 0 002 3.75v9.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0014 13.25v-9.5a1.75 1.75 0 00-.874-1.515.75.75 0 10-.752 1.298.25.25 0 01.126.217v9.5a.25.25 0 01-.25.25h-8.5a.25.25 0 01-.25-.25v-9.5a.25.25 0 01.126-.217z"></path>
        </svg>
        Copy Diff
      </span>
    </span>
  `;
  
  button.addEventListener('click', async () => {
    button.disabled = true;
    button.querySelector('.Button-label').textContent = 'Copying...';
    
    try {
      const prInfo = getPRInfo();
      const diff = await fetchPRDiff(prInfo);
      const markdown = formatDiffAsMarkdown(prInfo, diff);
      
      await navigator.clipboard.writeText(markdown);
      
      button.querySelector('.Button-label').textContent = 'Copied!';
      setTimeout(() => {
        button.innerHTML = `
          <span class="Button-content">
            <span class="Button-label">
              <svg class="octicon octicon-paste mr-1" height="16" viewBox="0 0 16 16" width="16" aria-hidden="true">
                <path fill-rule="evenodd" d="M5.75 1a.75.75 0 00-.75.75v3c0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75v-3a.75.75 0 00-.75-.75h-4.5zm.75 3V2.5h3V4h-3zm-2.874-.467a.75.75 0 00-.752-1.298A1.75 1.75 0 002 3.75v9.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0014 13.25v-9.5a1.75 1.75 0 00-.874-1.515.75.75 0 10-.752 1.298.25.25 0 01.126.217v9.5a.25.25 0 01-.25.25h-8.5a.25.25 0 01-.25-.25v-9.5a.25.25 0 01.126-.217z"></path>
              </svg>
              Copy Diff
            </span>
          </span>
        `;
        button.disabled = false;
      }, 2000);
    } catch (error) {
      console.error('Error copying diff:', error);
      button.querySelector('.Button-label').textContent = 'Error!';
      setTimeout(() => {
        button.innerHTML = `
          <span class="Button-content">
            <span class="Button-label">
              <svg class="octicon octicon-paste mr-1" height="16" viewBox="0 0 16 16" width="16" aria-hidden="true">
                <path fill-rule="evenodd" d="M5.75 1a.75.75 0 00-.75.75v3c0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75v-3a.75.75 0 00-.75-.75h-4.5zm.75 3V2.5h3V4h-3zm-2.874-.467a.75.75 0 00-.752-1.298A1.75 1.75 0 002 3.75v9.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0014 13.25v-9.5a1.75 1.75 0 00-.874-1.515.75.75 0 10-.752 1.298.25.25 0 01.126.217v9.5a.25.25 0 01-.25.25h-8.5a.25.25 0 01-.25-.25v-9.5a.25.25 0 01.126-.217z"></path>
              </svg>
              Copy Diff
            </span>
          </span>
        `;
        button.disabled = false;
      }, 2000);
    }
  });

  // Insert before the Review changes button
  reviewButton.parentElement.insertBefore(button, reviewButton);
}

function getPRInfo() {
  const title = getPRTitle();
  
  const [owner, repo] = window.location.pathname.split('/').slice(1, 3);
  const prNumber = window.location.pathname.split('/')[4];
  
  return { title, owner, repo, prNumber };
}

function getPRTitle() {
  const titleElementOld = document.querySelector('.js-issue-title');
  if (titleElementOld) return titleElementOld.textContent.trim();
  const titleElementNew = document.querySelector('[class*="PageHeader-Title"]');
  if (titleElementNew) return titleElementNew.textContent.trim();
  return 'Unknown PR';
}

async function fetchPRDiff({ owner, repo, prNumber }) {
  const url = new URL(window.location.href);
  url.pathname = `/${owner}/${repo}/pull/${prNumber}.diff`;
  const diffUrl = `${url.origin}${url.pathname}`;

  // Use background script to fetch the diff (avoids CORS)
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: 'fetchDiff', url: diffUrl },
      response => {
        if (response && response.success) {
          resolve(response.diff);
        } else {
          reject(new Error(response?.error || 'Failed to fetch diff'));
        }
      }
    );
  });
}

function formatDiffAsMarkdown({ title, owner, repo, prNumber }, diff) {
  const prUrl = `https://github.com/${owner}/${repo}/pull/${prNumber}`;
  
  return `${systemPrompt}

# Pull Request: ${title}

**Repository:** ${owner}/${repo}  
**PR Number:** #${prNumber}  
**URL:** ${prUrl}

## Diff

\`\`\`diff
${diff}
\`\`\`
`;
}

const observer = new MutationObserver(() => {
  if (window.location.pathname.includes('/pull/') && getReviewButton()) {
    addCopyDiffButton();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addCopyDiffButton);
} else {
  addCopyDiffButton();
}