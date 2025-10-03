document.addEventListener('DOMContentLoaded', () => {
  const toolbarOptions = [
    [{ 'header': [1, 2, false] }],
    ['bold', 'italic', 'underline'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }]
  ];

  const quill = new Quill('#editor', {
    modules: {
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
});