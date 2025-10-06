document.addEventListener('DOMContentLoaded', () => {
  // --- QUILL INITIALIZATION ---
  const Font = Quill.import('formats/font');
  Font.whitelist = ['roboto', 'lora', 'inconsolata'];
  Quill.register(Font, true);

  const toolbarOptions = [
    [{ 'font': Font.whitelist }],
    [{ 'header': [1, 2, false] }],
    ['bold', 'italic', 'underline'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
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

  // --- DOM ELEMENTS ---
  const tabsList = document.getElementById('tabs-list');
  const newNoteBtn = document.getElementById('new-note-btn');
  const themeToggle = document.getElementById('theme-toggle');
  const body = document.body;
  const downloadBtn = document.getElementById('download-btn');
  const downloadOptions = document.getElementById('download-options');
  const downloadTxt = document.getElementById('download-txt');
  const downloadHtml = document.getElementById('download-html');
  const downloadJson = document.getElementById('download-json');
  const formatJsonBtn = document.getElementById('format-json-btn');

  // --- STATE MANAGEMENT ---
  let state = {
    notes: [],
    activeNoteId: null,
  };

  const getActiveNote = () => state.notes.find(note => note.id === state.activeNoteId);

  // --- CORE FUNCTIONS ---
  const saveState = () => {
    // Before saving, ensure the current editor content is in the state
    const activeNote = getActiveNote();
    if (activeNote) {
      activeNote.content = quill.getContents();
    }
    localStorage.setItem('notepad_session', JSON.stringify(state));
  };

  const debouncedSave = debounce(saveState, 500);

  const renderTabs = () => {
    tabsList.innerHTML = '';
    state.notes.forEach(note => {
      const tab = document.createElement('div');
      tab.className = 'tab';
      tab.dataset.id = note.id;
      if (note.id === state.activeNoteId) {
        tab.classList.add('active');
      }

      const tabName = document.createElement('span');
      tabName.className = 'tab-name';
      tabName.textContent = note.name;

      const closeBtn = document.createElement('button');
      closeBtn.className = 'tab-close';
      closeBtn.innerHTML = '&times;';

      tab.appendChild(tabName);
      tab.appendChild(closeBtn);
      tabsList.appendChild(tab);
    });
  };

  const switchNote = (noteId) => {
    if (state.activeNoteId === noteId) return;

    // Save current content before switching
    saveState();

    state.activeNoteId = noteId;
    const activeNote = getActiveNote();

    quill.setContents(activeNote.content);
    renderTabs();
    // Don't call saveState() here again, as it's handled by text-change
  };

  const createNote = () => {
    const newNoteId = Date.now();
    const noteNumber = state.notes.length + 1;
    const newNote = {
      id: newNoteId,
      name: `Note ${noteNumber}`,
      content: { ops: [{ insert: '\n' }] } // Start with a blank note
    };
    state.notes.push(newNote);
    switchNote(newNoteId);
    saveState(); // Save immediately after creating
  };

  const closeNote = (noteIdToClose) => {
    const noteIndex = state.notes.findIndex(note => note.id === noteIdToClose);
    if (noteIndex === -1) return;

    // Remove the note
    state.notes.splice(noteIndex, 1);

    // If there are no notes left, create a new one
    if (state.notes.length === 0) {
      createNote();
      return;
    }

    // If the closed note was the active one, switch to a different note
    if (state.activeNoteId === noteIdToClose) {
      // Switch to the note to the left, or the first note if it was the first one
      const newActiveIndex = Math.max(0, noteIndex - 1);
      state.activeNoteId = state.notes[newActiveIndex].id;
      quill.setContents(getActiveNote().content);
    }

    renderTabs();
    saveState();
  };

  // --- EVENT LISTENERS ---

  // Tabs
  newNoteBtn.addEventListener('click', createNote);
  tabsList.addEventListener('click', (e) => {
    const target = e.target;
    const tab = target.closest('.tab');
    if (!tab) return;

    const noteId = Number(tab.dataset.id);
    if (target.classList.contains('tab-close')) {
      closeNote(noteId);
    } else {
      switchNote(noteId);
    }
  });

  // Editor
  quill.on('text-change', (delta, oldDelta, source) => {
    if (source === 'user') {
      debouncedSave();
    }
  });

  // --- OTHER FEATURES (Theme, Download, JSON) ---
  function debounce(func, delay) {
    let timeout;
    return function(...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), delay);
    };
  }

  // Theme
  const applyTheme = (theme) => body.classList.toggle('dark-mode', theme === 'dark');
  themeToggle.addEventListener('click', () => {
    const newTheme = body.classList.contains('dark-mode') ? 'light' : 'dark';
    localStorage.setItem('notepad_theme', newTheme);
    applyTheme(newTheme);
  });

  // Download
  downloadBtn.addEventListener('click', () => downloadOptions.classList.toggle('show'));
  window.addEventListener('click', (e) => {
    if (!e.target.matches('.dropbtn')) downloadOptions.classList.remove('show');
  });

  function downloadFile(content, fileName, contentType) {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  downloadTxt.addEventListener('click', (e) => {
    e.preventDefault();
    downloadFile(quill.getText(), 'note.txt', 'text/plain');
  });
  downloadHtml.addEventListener('click', (e) => {
    e.preventDefault();
    downloadFile(quill.root.innerHTML, 'note.html', 'text/html');
  });
  downloadJson.addEventListener('click', (e) => {
    e.preventDefault();
    const text = quill.getText().replace(/[\uFEFF\u200B-\u200D\u00A0]/g, '').trim();
    try {
      const jsonObj = JSON.parse(text);
      const formattedJson = JSON.stringify(jsonObj, null, 2);
      downloadFile(formattedJson, 'note.json', 'application/json');
    } catch (error) {
      alert(`Invalid JSON: ${error.message}`);
    }
  });

  // JSON Formatting
  formatJsonBtn.addEventListener('click', () => {
    let range = quill.getSelection();
    let textToFormat, formatRange;
    if (range && range.length > 0) {
      textToFormat = quill.getText(range.index, range.length);
      formatRange = range;
    } else {
      textToFormat = quill.getText();
      formatRange = { index: 0, length: textToFormat.length };
    }
    const sanitizedText = textToFormat.replace(/[\uFEFF\u200B-\u200D\u00A0]/g, '').trim();
    if (!sanitizedText) return alert("Nothing to format.");
    try {
      const jsonObj = JSON.parse(sanitizedText);
      const formattedJson = JSON.stringify(jsonObj, null, 2);
      quill.deleteText(formatRange.index, formatRange.length);
      quill.insertText(formatRange.index, formattedJson, 'user');
      quill.setSelection(formatRange.index, formattedJson.length);
    } catch (error) {
      alert(`Invalid JSON: ${error.message}`);
    }
  });


  // --- INITIALIZATION ---
  const loadState = () => {
    const savedState = localStorage.getItem('notepad_session');
    if (savedState) {
      state = JSON.parse(savedState);
    }
    // If no notes exist after loading, create a default one
    if (!state.notes || state.notes.length === 0) {
      state = { notes: [], activeNoteId: null };
      createNote(); // This will create the first note and set it as active
    } else {
        // Ensure there's a valid active note
        if (!getActiveNote()) {
            state.activeNoteId = state.notes[0].id;
        }
        quill.setContents(getActiveNote().content);
        renderTabs();
    }
  };

  const loadTheme = () => {
      const savedTheme = localStorage.getItem('notepad_theme') || 'light';
      applyTheme(savedTheme);
  };

  loadState();
  loadTheme();
});