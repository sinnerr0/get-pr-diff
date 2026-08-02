const SYSTEM_PROMPT_KEY = 'systemPrompt';

const DEFAULT_SYSTEM_PROMPT = `You're an experienced developer doing a quick code review. Focus on what matters most and keep it concise.

What to Look For:
• Bugs & Logic Issues: Anything that could break or behave unexpectedly
• Security Problems: Potential vulnerabilities, exposed secrets, unsafe inputs
• Performance Issues: Inefficient code, unnecessary database calls, memory leaks
• Code Quality: Complex/unclear code, poor naming, missing error handling
• Best Practices: Violations of common standards for the language/framework

Response Format:
Only comment on files that have issues. For each problem:
📁 filename.ext
Brief issue description.
\`\`\`language
// Suggested fix with minimal context
\`\`\`

Guidelines:
• Prioritize critical issues (security, bugs) over style preferences
• Be direct but helpful - explain why the change matters
• Skip obvious or minor style issues unless they hurt readability
• If no significant issues found, just say "LGTM! 👍"

Please review this pull request diff:`;

// storage.sync caps a single item at 8KB, which silently rejects longer prompts.
const promptArea = chrome.storage.local;

function readSystemPrompt() {
  return new Promise(resolve => {
    promptArea.get([SYSTEM_PROMPT_KEY], stored => {
      if (typeof stored?.[SYSTEM_PROMPT_KEY] === 'string') {
        resolve(stored[SYSTEM_PROMPT_KEY]);
        return;
      }

      // Prompts saved by versions that used storage.sync.
      chrome.storage.sync.get([SYSTEM_PROMPT_KEY], legacy => {
        resolve(
          typeof legacy?.[SYSTEM_PROMPT_KEY] === 'string'
            ? legacy[SYSTEM_PROMPT_KEY]
            : DEFAULT_SYSTEM_PROMPT
        );
      });
    });
  });
}

function writeSystemPrompt(systemPrompt) {
  return new Promise((resolve, reject) => {
    promptArea.set({ [SYSTEM_PROMPT_KEY]: systemPrompt }, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    });
  });
}

function onSystemPromptChanged(handler) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !changes[SYSTEM_PROMPT_KEY]) return;

    const { newValue } = changes[SYSTEM_PROMPT_KEY];
    handler(typeof newValue === 'string' ? newValue : DEFAULT_SYSTEM_PROMPT);
  });
}
