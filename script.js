document.addEventListener('DOMContentLoaded', () => {
  const toolbarOptions = [
    [{ 'header': [1, 2, false] }],
    ['bold', 'italic', 'underline'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['code-block']
  ];

  const quill = new Quill('#editor', {
    modules: {
      syntax: true,
      toolbar: toolbarOptions,
      keyboard: {}
    },
    theme: 'snow'
  });

  // Debounce function
  function debounce(func, delay) {
    let timeout;
    return function(...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), delay);
    };
  }

  // Auto-save functionality
  const autoSave = debounce(() => {
    const content = quill.getContents();
    localStorage.setItem('notepad_content', JSON.stringify(content));
    console.log('Content saved to localStorage');
  }, 1500);

  quill.on('text-change', () => {
    autoSave();
  });

  // Load content from localStorage
  const savedContent = localStorage.getItem('notepad_content');
  if (savedContent) {
    quill.setContents(JSON.parse(savedContent));
  }

  // Theme switcher logic
  const themeToggle = document.getElementById('theme-toggle');
  const body = document.body;

  const applyTheme = (theme) => {
    if (theme === 'dark') {
      body.classList.add('dark-mode');
    } else {
      body.classList.remove('dark-mode');
    }
  };

  themeToggle.addEventListener('click', () => {
    const newTheme = body.classList.contains('dark-mode') ? 'light' : 'dark';
    localStorage.setItem('notepad_theme', newTheme);
    applyTheme(newTheme);
  });

  // Load saved theme
  const savedTheme = localStorage.getItem('notepad_theme') || 'light';
  applyTheme(savedTheme);

  // Download functionality
  const downloadBtn = document.getElementById('download-btn');
  const downloadOptions = document.getElementById('download-options');
  const downloadTxt = document.getElementById('download-txt');
  const downloadHtml = document.getElementById('download-html');

  downloadBtn.addEventListener('click', () => {
    downloadOptions.classList.toggle('show');
  });

  // Close the dropdown if the user clicks outside of it
  window.addEventListener('click', (event) => {
    if (!event.target.matches('.dropbtn')) {
      if (downloadOptions.classList.contains('show')) {
        downloadOptions.classList.remove('show');
      }
    }
  });

  function downloadFile(content, fileName, contentType) {
    const a = document.createElement('a');
    const file = new Blob([content], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  downloadTxt.addEventListener('click', (e) => {
    e.preventDefault();
    const text = quill.getText();
    downloadFile(text, 'note.txt', 'text/plain');
  });

  downloadHtml.addEventListener('click', (e) => {
    e.preventDefault();
    const html = quill.root.innerHTML;
    downloadFile(html, 'note.html', 'text/html');
  });
});