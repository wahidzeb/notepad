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
  const newNoteOptions = document.getElementById('new-note-options');
  const themeToggle = document.getElementById('theme-toggle');
  const body = document.body;
  const downloadBtn = document.getElementById('download-btn');
  const downloadOptions = document.getElementById('download-options');
  const downloadTxt = document.getElementById('download-txt');
  const downloadHtml = document.getElementById('download-html');
  const downloadJson = document.getElementById('download-json');
  const formatJsonBtn = document.getElementById('format-json-btn');
  const editorContainer = document.getElementById('editor-container');
  const bookmarkContainer = document.getElementById('bookmark-container');
  const whiteboardContainer = document.getElementById('whiteboard-container');

  // --- STATE MANAGEMENT ---
  let state = {
    notes: [],
    activeNoteId: null,
  };

  const getActiveNote = () => state.notes.find(note => note.id === state.activeNoteId);

  // --- CORE FUNCTIONS ---
  const saveState = () => {
    const activeNote = getActiveNote();
    if (activeNote) {
      if (activeNote.type === 'whiteboard') {
        const canvas = document.getElementById('whiteboard-canvas');
        activeNote.content = canvas.toDataURL();
      } else if (activeNote.type !== 'bookmark') {
        activeNote.content = quill.getContents();
      }
    }
    localStorage.setItem('notepad_session', JSON.stringify(state));
  };

  const debouncedSave = debounce(saveState, 500);

  const adjustUiForNoteType = (noteType) => {
    editorContainer.style.display = 'none';
    bookmarkContainer.style.display = 'none';
    whiteboardContainer.style.display = 'none';

    if (noteType === 'bookmark') {
      bookmarkContainer.style.display = 'block';
      renderBookmarks();
    } else if (noteType === 'whiteboard') {
      whiteboardContainer.style.display = 'flex';
      resizeCanvas();
      const activeNote = getActiveNote();
      if (activeNote && activeNote.content) {
        const img = new Image();
        img.src = activeNote.content;
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
      }
    } else {
      editorContainer.style.display = 'flex';
      const toolbar = document.querySelector('.ql-toolbar');
      toolbar.style.display = noteType === 'plain-text' ? 'none' : 'block';
    }
  };

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

    saveState();

    state.activeNoteId = noteId;
    const activeNote = getActiveNote();

    if (['rich-text', 'plain-text'].includes(activeNote.type)) {
      quill.setContents(activeNote.content);
    } else {
      quill.setContents([{ insert: '\n' }]);
    }

    adjustUiForNoteType(activeNote.type);
    renderTabs();
  };

  const createNote = (type = 'rich-text') => {
    const newNoteId = Date.now();
    const noteNumber = state.notes.length + 1;
    let content, name;

    switch (type) {
      case 'plain-text':
        name = `Plain Text ${noteNumber}`;
        content = { ops: [{ insert: 'This is a plain text note.\n' }] };
        break;
      case 'bookmark':
        name = `Bookmarks ${noteNumber}`;
        content = [];
        break;
      case 'whiteboard':
        name = `Whiteboard ${noteNumber}`;
        content = null;
        break;
      case 'rich-text':
      default:
        name = `Note ${noteNumber}`;
        content = { ops: [{ insert: '\n' }] };
        break;
    }

    const newNote = { id: newNoteId, name, type, content };
    state.notes.push(newNote);
    switchNote(newNoteId);
  };

  const closeNote = (noteIdToClose) => {
    const noteIndex = state.notes.findIndex(note => note.id === noteIdToClose);
    if (noteIndex === -1) return;

    state.notes.splice(noteIndex, 1);

    if (state.notes.length === 0) {
      createNote();
      return;
    }

    if (state.activeNoteId === noteIdToClose) {
      const newActiveIndex = Math.max(0, noteIndex - 1);
      state.activeNoteId = state.notes[newActiveIndex].id;
      const activeNote = getActiveNote();
      if (['rich-text', 'plain-text'].includes(activeNote.type)) {
        quill.setContents(activeNote.content);
      }
      adjustUiForNoteType(activeNote.type);
    }

    renderTabs();
    saveState();
  };

  // --- EVENT LISTENERS ---

  newNoteBtn.addEventListener('click', () => newNoteOptions.classList.toggle('show'));
  newNoteOptions.addEventListener('click', (e) => {
    e.preventDefault();
    const noteType = e.target.dataset.noteType;
    if (noteType) {
      createNote(noteType);
      newNoteOptions.classList.remove('show');
    }
  });

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

  quill.on('text-change', () => debouncedSave());

  const addBookmarkForm = document.getElementById('add-bookmark-form');
  const bookmarkTitleInput = document.getElementById('bookmark-title');
  const bookmarkUrlInput = document.getElementById('bookmark-url');
  const bookmarkList = document.getElementById('bookmark-list');

  const renderBookmarks = () => {
      const activeNote = getActiveNote();
      if (!activeNote || activeNote.type !== 'bookmark') return;

      bookmarkList.innerHTML = '';
      activeNote.content.forEach(bookmark => {
          const item = document.createElement('div');
          item.className = 'bookmark-item';

          const link = document.createElement('a');
          link.href = bookmark.url;
          link.textContent = bookmark.title;
          link.target = '_blank';

          const urlText = document.createElement('p');
          urlText.textContent = bookmark.url;

          item.appendChild(link);
          item.appendChild(urlText);
          bookmarkList.appendChild(item);
      });
  };

  addBookmarkForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const activeNote = getActiveNote();
      const title = bookmarkTitleInput.value;
      const url = bookmarkUrlInput.value;

      if (activeNote && activeNote.type === 'bookmark' && title && url) {
          activeNote.content.push({ title, url });
          saveState();
          renderBookmarks();
          addBookmarkForm.reset();
      }
  });

  const canvas = document.getElementById('whiteboard-canvas');
  const ctx = canvas.getContext('2d');
  const wbToolbar = {
    pen: document.getElementById('wb-pen'),
    eraser: document.getElementById('wb-eraser'),
    color: document.getElementById('wb-color'),
    clear: document.getElementById('wb-clear'),
  };

  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  let currentTool = 'pen';

  const resizeCanvas = () => {
    const container = document.getElementById('whiteboard-container');
    const canvas = document.getElementById('whiteboard-canvas');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight - document.getElementById('whiteboard-toolbar').offsetHeight;
  };

  const draw = (e) => {
    if (!isDrawing) return;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
    [lastX, lastY] = [e.offsetX, e.offsetY];
  };

  canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    [lastX, lastY] = [e.offsetX, e.offsetY];
    ctx.strokeStyle = currentTool === 'pen' ? wbToolbar.color.value : '#FFFFFF';
    ctx.lineWidth = currentTool === 'pen' ? 2 : 20;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  });

  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', () => { if (isDrawing) { isDrawing = false; debouncedSave(); } });
  canvas.addEventListener('mouseout', () => { if (isDrawing) { isDrawing = false; debouncedSave(); } });

  wbToolbar.pen.addEventListener('click', () => {
    currentTool = 'pen';
    wbToolbar.pen.classList.add('active');
    wbToolbar.eraser.classList.remove('active');
  });

  wbToolbar.eraser.addEventListener('click', () => {
    currentTool = 'eraser';
    wbToolbar.eraser.classList.add('active');
    wbToolbar.pen.classList.remove('active');
  });

  wbToolbar.clear.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveState();
  });

  const debouncedResize = debounce(() => {
    const activeNote = getActiveNote();
    if (activeNote && activeNote.type === 'whiteboard') {
      const data = canvas.toDataURL();
      resizeCanvas();
      const img = new Image();
      img.src = data;
      img.onload = () => ctx.drawImage(img, 0, 0);
    }
  }, 250);

  window.addEventListener('resize', debouncedResize);

  function debounce(func, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  }

  const applyTheme = (theme) => body.classList.toggle('dark-mode', theme === 'dark');
  themeToggle.addEventListener('click', () => {
    const newTheme = body.classList.contains('dark-mode') ? 'light' : 'dark';
    localStorage.setItem('notepad_theme', newTheme);
    applyTheme(newTheme);
  });

  downloadBtn.addEventListener('click', () => downloadOptions.classList.toggle('show'));
  window.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) {
      downloadOptions.classList.remove('show');
      newNoteOptions.classList.remove('show');
    }
  });

  function downloadFile(content, fileName, contentType) {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  downloadTxt.addEventListener('click', (e) => { e.preventDefault(); downloadFile(quill.getText(), 'note.txt', 'text/plain'); });
  downloadHtml.addEventListener('click', (e) => { e.preventDefault(); downloadFile(quill.root.innerHTML, 'note.html', 'text/html'); });
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
      // Filter out any broken note types from previous sessions
      state.notes = state.notes.filter(note => ['rich-text', 'plain-text', 'bookmark', 'whiteboard'].includes(note.type));
    }
    if (!state.notes || state.notes.length === 0) {
      state = { notes: [], activeNoteId: null };
      createNote();
    } else {
      if (!getActiveNote()) state.activeNoteId = state.notes[0].id;
      const activeNote = getActiveNote();
      if (['rich-text', 'plain-text'].includes(activeNote.type)) {
        quill.setContents(activeNote.content);
      }
      adjustUiForNoteType(activeNote.type);
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