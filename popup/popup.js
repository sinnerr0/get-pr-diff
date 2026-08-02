document.addEventListener('DOMContentLoaded', async () => {
  const systemPromptTextarea = document.getElementById('systemPrompt');
  const saveButton = document.getElementById('saveButton');
  const statusDiv = document.getElementById('status');

  const showStatus = (message, variant) => {
    statusDiv.textContent = message;
    statusDiv.className = variant ? `status ${variant}` : 'status';
  };

  const clearStatus = () => showStatus('', null);

  systemPromptTextarea.value = await readSystemPrompt();

  saveButton.addEventListener('click', async () => {
    saveButton.disabled = true;

    try {
      await writeSystemPrompt(systemPromptTextarea.value.trim());
      showStatus('Settings saved successfully!', 'success');
      setTimeout(clearStatus, 2000);
    } catch (error) {
      showStatus(`Failed to save: ${error.message}`, 'error');
    } finally {
      saveButton.disabled = false;
    }
  });

  systemPromptTextarea.addEventListener('input', clearStatus);
});
