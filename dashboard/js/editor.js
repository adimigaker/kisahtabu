document.addEventListener('DOMContentLoaded', function() {
    var urlParams = new URLSearchParams(window.location.search);
    var seriesIdParam = urlParams.get('id');
    var chapterParam = urlParams.get('chapter');
    var isNew = urlParams.get('new') === 'true';

    var currentId = seriesIdParam || '';
    var currentChapter = chapterParam || '01';

    // DOM Elements
    var headerIdChapter = document.getElementById('headerIdChapter');
    var editIdChapterBtn = document.getElementById('editIdChapterBtn');
    var idChapterEdit = document.getElementById('idChapterEdit');
    var editSeriesId = document.getElementById('editSeriesId');
    var editChapterNum = document.getElementById('editChapterNum');
    var saveIdChapterBtn = document.getElementById('saveIdChapterBtn');
    var cancelIdChapterBtn = document.getElementById('cancelIdChapterBtn');
    var storyTitle = document.getElementById('storyTitle');
    var storyThumb = document.getElementById('storyThumb');
    var editorContent = document.getElementById('editorContent');
    var editorToolbar = document.getElementById('editorToolbar');
    var publishBtn = document.getElementById('publishBtn');
    var saveDraftBtn = document.getElementById('saveDraftBtn');
    var wordCount = document.getElementById('wordCount');
    var charCount = document.getElementById('charCount');
    var toast = document.getElementById('toast');

    // ========== LOAD STORY ==========
    async function loadStory() {
        if (isNew) {
            var info = JSON.parse(sessionStorage.getItem('newStoryInfo') || '{}');
            if (info.id) currentId = info.id;
            if (info.chapter) currentChapter = info.chapter;
            if (info.title) storyTitle.value = info.title;
            sessionStorage.removeItem('newStoryInfo');
        } else if (seriesIdParam) {
            try {
                var story = await API.getStory(seriesIdParam);
                if (story) {
                    currentId = story.id;
                    storyTitle.value = story.title || '';
                    storyThumb.value = story.thumbnail || '';
                    
                    var chapters = await API.getChapterList(seriesIdParam);
                    if (chapters && chapters.length > 0) {
                        var lastChap = chapters[chapters.length - 1];
                        currentChapter = lastChap.chapter;
                        var chapData = await API.getChapter(seriesIdParam, lastChap.chapter);
                        if (chapData) editorContent.innerHTML = chapData.content || '';
                    }
                }
            } catch (err) {
                console.error('Gagal load story:', err);
            }
        }
        
        // Load draft
        var draft = JSON.parse(localStorage.getItem('draft_' + currentId));
        if (draft && draft.content) {
            editorContent.innerHTML = draft.content;
            if (draft.title) storyTitle.value = draft.title;
        }
        
        updateHeaderDisplay();
        updateStats();
    }

    function updateHeaderDisplay() {
        headerIdChapter.textContent = (currentId || 'ID') + '-' + (currentChapter || '01');
    }

    // ========== ID-CHAPTER EDIT ==========
    editIdChapterBtn.addEventListener('click', function() {
        editSeriesId.value = currentId;
        editChapterNum.value = currentChapter;
        idChapterEdit.style.display = 'block';
        editSeriesId.focus();
        editSeriesId.select();
    });

    saveIdChapterBtn.addEventListener('click', function() {
        var newId = editSeriesId.value.trim().toUpperCase();
        var newChapter = editChapterNum.value.trim();
        if (!newId) { showToast('⚠️ ID tidak boleh kosong'); return; }
        if (!newChapter) { showToast('⚠️ Chapter tidak boleh kosong'); return; }
        currentId = newId;
        currentChapter = newChapter;
        updateHeaderDisplay();
        idChapterEdit.style.display = 'none';
        showToast('✅ Tersimpan');
        saveDraftAuto();
    });

    cancelIdChapterBtn.addEventListener('click', function() {
        idChapterEdit.style.display = 'none';
    });

    // ========== TOOLBAR ==========
    function getCurrentBlockTag() {
        var sel = window.getSelection();
        if (sel.rangeCount === 0) return '';
        var node = sel.getRangeAt(0).startContainer;
        if (node.nodeType === 3) node = node.parentElement;
        var block = node.closest('h1,h2,h3,h4,h5,h6,p,div');
        return block ? block.tagName : '';
    }

    function updateToolbarState() {
        var buttons = editorToolbar.querySelectorAll('button[data-cmd]');
        for (var i = 0; i < buttons.length; i++) {
            var btn = buttons[i];
            var cmd = btn.dataset.cmd;
            var val = btn.dataset.val;
            if (cmd === 'formatBlock' && val) {
                btn.classList.toggle('active', getCurrentBlockTag() === val.toUpperCase());
            } else {
                btn.classList.toggle('active', document.queryCommandState(cmd));
            }
        }
    }

    var toolbarButtons = editorToolbar.querySelectorAll('button[data-cmd]');
    for (var i = 0; i < toolbarButtons.length; i++) {
        toolbarButtons[i].addEventListener('click', function(e) {
            e.preventDefault();
            var cmd = this.dataset.cmd;
            var val = this.dataset.val || null;
            if (cmd === 'formatBlock') {
                var current = getCurrentBlockTag();
                document.execCommand(cmd, false, current === val.toUpperCase() ? 'p' : val);
            } else {
                document.execCommand(cmd, false, null);
                this.classList.toggle('active', document.queryCommandState(cmd));
            }
            editorContent.focus();
            updateStats();
            saveDraftAuto();
        });
    }

    editorContent.addEventListener('keyup', function() {
        updateToolbarState();
        updateStats();
        saveDraftAuto();
    });

    editorContent.addEventListener('mouseup', updateToolbarState);

    editorContent.addEventListener('paste', function(e) {
        e.preventDefault();
        var text = (e.clipboardData || window.clipboardData).getData('text/plain');
        if (!text.trim()) return;
        var paragraphs = text.split('\n').filter(function(p) { return p.trim(); });
        var html = '';
        for (var i = 0; i < paragraphs.length; i++) {
            html += '<p>' + paragraphs[i] + '</p>';
        }
        document.execCommand('insertHTML', false, html);
        updateStats();
        saveDraftAuto();
    });

    // ========== INSERT IMAGE ==========
    document.getElementById('insertImageBtn').addEventListener('click', function(e) {
        e.preventDefault();
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async function() {
            var file = input.files[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) {
                showToast('⚠️ Maks 5MB');
                return;
            }
            showToast('📤 Upload...');
            var result = await API.uploadImage(file);
            if (result.success) {
                editorContent.focus();
                document.execCommand('insertImage', false, result.url);
                showToast('✅ Terupload!');
                updateStats();
                saveDraftAuto();
            } else {
                showToast('❌ Gagal upload');
            }
        };
        input.click();
    });

    // ========== INSERT DIVIDER ==========
    document.getElementById('insertDividerBtn').addEventListener('click', function(e) {
        e.preventDefault();
        editorContent.focus();
        document.execCommand('insertHorizontalRule', false, null);
        updateStats();
        saveDraftAuto();
    });

    // ========== STATS ==========
    function updateStats() {
        var text = editorContent.innerText || '';
        var words = text.trim() ? text.trim().split(/\s+/).length : 0;
        wordCount.textContent = words + ' kata';
        charCount.textContent = text.length + ' karakter';
    }

    // ========== DRAFT ==========
    function saveDraftAuto() {
        if (!currentId) return;
        localStorage.setItem('draft_' + currentId, JSON.stringify({
            id: currentId,
            chapter: currentChapter,
            title: storyTitle.value,
            thumb: storyThumb.value,
            content: editorContent.innerHTML,
            timestamp: Date.now()
        }));
    }

    saveDraftBtn.addEventListener('click', function() {
        saveDraftAuto();
        showToast('💾 Draft tersimpan');
    });

    // ========== PUBLISH ==========
    publishBtn.addEventListener('click', async function() {
        if (!currentId) {
            showToast('⚠️ Isi ID dulu!');
            editIdChapterBtn.click();
            return;
        }
        
        var title = storyTitle.value.trim();
        var content = editorContent.innerHTML.trim();
        
        if (!title) { showToast('⚠️ Judul wajib diisi!'); return; }
        if (!content || content === '<br>' || content === '<p><br></p>') {
            showToast('⚠️ Konten kosong!');
            return;
        }

        publishBtn.textContent = '⏳ Menyimpan...';
        publishBtn.disabled = true;
        showToast('📤 Mengirim ke server...');

        try {
            var chapters = await API.getChapterList(currentId);
            var chapterList = [];
            
            if (chapters && chapters.length > 0) {
                for (var i = 0; i < chapters.length; i++) {
                    chapterList.push({
                        chapter: chapters[i].chapter,
                        title: chapters[i].title,
                        content: ''
                    });
                }
            }
            
            var newChap = { chapter: currentChapter, title: title, content: content };
            var found = false;
            for (var j = 0; j < chapterList.length; j++) {
                if (chapterList[j].chapter === currentChapter) {
                    chapterList[j] = newChap;
                    found = true;
                    break;
                }
            }
            if (!found) chapterList.push(newChap);

            console.log('Sending to API...');
            var result = await API.saveStory({
                id: currentId,
                title: title,
                thumbnail: storyThumb.value.trim(),
                chapters: chapterList
            });
            console.log('API result:', result);

            if (result.success) {
                localStorage.removeItem('draft_' + currentId);
                publishBtn.textContent = '✅ Berhasil!';
                publishBtn.style.background = '#555';
                showToast('🎉 Cerita berhasil diterbitkan!');
                
                setTimeout(function() {
                    window.location.href = 'index.html';
                }, 1500);
            } else {
                throw new Error(result.error || 'Gagal menyimpan');
            }
        } catch (err) {
            console.error('Publish error:', err);
            publishBtn.textContent = 'Terbitkan';
            publishBtn.disabled = false;
            showToast('❌ Gagal: ' + (err.message || 'Coba lagi'));
        }
    });

    // ========== TOAST ==========
    function showToast(msg) {
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(function() {
            toast.classList.remove('show');
        }, 2000);
    }

    // ========== SHORTCUT ==========
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveDraftAuto();
            showToast('💾 Draft tersimpan');
        }
        if (e.key === 'Escape' && idChapterEdit.style.display === 'block') {
            idChapterEdit.style.display = 'none';
        }
    });

    // ========== INIT ==========
    loadStory();
    updateHeaderDisplay();
    updateToolbarState();
    window.addEventListener('beforeunload', function() { saveDraftAuto(); });
    console.log('✅ Editor siap!');
});