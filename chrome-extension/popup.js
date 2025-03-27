document.addEventListener('DOMContentLoaded', () => {
  const noteInput = document.getElementById('noteInput');
  const saveButton = document.getElementById('saveButton');
  
  // Kubernetes backend service URL (use your EXTERNAL-IP from kubectl get services)
  const BACKEND_URL = 'http://a2f2af860725d450b98395e40f2dd3b0-1687692579.us-west-1.elb.amazonaws.com/api/notes';

  saveButton.addEventListener('click', async () => {
      const note = noteInput.value.trim();
      
      if (!note) {
          alert('Please enter a note!');
          return;
      }

      saveButton.disabled = true;
      saveButton.textContent = 'Saving...';

      try {
          const response = await fetch(BACKEND_URL, {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({ content: note })
          });

          if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
          }

          noteInput.value = '';
          alert('Note saved successfully! 🎉');
      } catch (err) {
          alert(`Error: ${err.message}`);
      } finally {
          saveButton.disabled = false;
          saveButton.textContent = 'Save Note';
      }
  });
});