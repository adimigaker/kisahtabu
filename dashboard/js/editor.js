document.addEventListener('DOMContentLoaded', function() {
    var urlParams = new URLSearchParams(window.location.search);
    var editId = urlParams.get('id');
    var isNew = urlParams.get('new') === 'true';

    var currentId = editId || '';
    var originalId = editId || '';

    var headerIdChapter = document.getElementById('headerIdChapter');
    var editIdChapterBtn = document.getElementById('editIdChapterBtn');
    var idChapterEdit = document.getElementById('idChapterEdit');
    var editSeriesId = document.getElementById('editSeriesId');
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

    var uploadThumbBtn = document.getElementById('uploadThumbBtn');
    var thumbPreview = document.getElementById('thumbPreview');
    var thumbPreviewImg = document.getElementById('thumbPreviewImg');
    var removeThumbBtn = document.getElementById('removeThumbBtn');

    // Image Modal
    var imageModal = document.getElementById('imageModal');
    var closeImageModal = document.getElementById('closeImageModal');
    var imageTabs = document.querySelectorAll('.image-tab');
    var tabUrl = document.getElementById('tabUrl');
    var tabUpload = document.getElementById('tabUpload');
    var imageUrlInput = document.getElementById('imageUrlInput');
    var insertUrlBtn = document.getElementById('insertUrlBtn');
    var uploadArea = document.getElementById('uploadArea');
    var imageFileInput = document.getElementById('imageFileInput');
    var imagePreview = document.getElementById('imagePreview');
    var imagePreviewImg = document.getElementById('imagePreviewImg');
    var removeImagePreview = document.getElementById('removeImagePreview');
    var pendingImageUrl = '';

    var svg = {
        spinner: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
        check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
        alert: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
        upload: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
        save: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
        send: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
        x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    };

    function showToast(icon, msg) {
        if (!toast) return;
        toast.innerHTML = '<span style="display:flex;align-items:center;gap:6px;">' + icon + ' ' + msg + '</span>';
        toast.classList.add('show');
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(function() { toast.classList.remove('show'); }, 2000);
    }

    function updateThumbPreview() {
        var url = storyThumb.value.trim();
        if (url) { thumbPreview.style.display = 'inline-block'; thumbPreviewImg.src = url; }
        else { thumbPreview.style.display = 'none'; thumbPreviewImg.src = ''; }
    }

    storyThumb.addEventListener('input', updateThumbPreview);
    updateThumbPreview();

    uploadThumbBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        var input = document.createElement('input');
        input.type = 'file'; input.accept = 'image/*';
        input.onchange = async function() {
            var file = input.files[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) { showToast(svg.alert, 'Maks 5MB'); return; }
            showToast(svg.upload, 'Upload thumbnail...');
            var result = await API.uploadImage(file);
            if (result.success) { storyThumb.value = result.url; updateThumbPreview(); showToast(svg.check, 'Thumbnail terupload!'); saveDraftAuto(); }
            else showToast(svg.x, 'Gagal upload');
        };
        input.click();
    });

    removeThumbBtn.addEventListener('click', function() { storyThumb.value = ''; updateThumbPreview(); saveDraftAuto(); });

    async function loadStory() {
        if (isNew) {
            var info = JSON.parse(sessionStorage.getItem('newStoryInfo') || '{}');
            if (info.id) { currentId = info.id; originalId = info.id; }
            if (info.title) storyTitle.value = info.title;
            sessionStorage.removeItem('newStoryInfo');
        } else if (editId) {
            try {
                var stories = await API.getAllStories();
                var story = stories.find(function(s) { return s.id === editId; });
                if (story) {
                    currentId = story.id;
                    originalId = story.id;
                    storyTitle.value = story.title || '';
                    storyThumb.value = story.thumbnail || '';
                    editorContent.innerHTML = story.content || '';
                    updateThumbPreview();
                }
            } catch (err) {}
        }
        var draft = JSON.parse(localStorage.getItem('draft_' + currentId));
        if (draft && draft.content) {
            editorContent.innerHTML = draft.content;
            if (draft.title) storyTitle.value = draft.title;
            if (draft.thumb) { storyThumb.value = draft.thumb; updateThumbPreview(); }
        }
        updateHeaderDisplay();
        updateStats();
    }

    function updateHeaderDisplay() { headerIdChapter.textContent = currentId || 'ID-01'; }

    editIdChapterBtn.addEventListener('click', function() {
        editSeriesId.value = currentId;
        idChapterEdit.style.display = 'block';
        editSeriesId.focus();
    });

    saveIdChapterBtn.addEventListener('click', function() {
        var newId = editSeriesId.value.trim().toUpperCase();
        if (!newId) { showToast(svg.alert, 'ID tidak boleh kosong'); return; }
        currentId = newId;
        updateHeaderDisplay();
        idChapterEdit.style.display = 'none';
        showToast(svg.check, 'Tersimpan');
        saveDraftAuto();
    });

    cancelIdChapterBtn.addEventListener('click', function() { idChapterEdit.style.display = 'none'; });

    function getCurrentBlockTag() {
        var sel = window.getSelection();
        if (sel.rangeCount === 0) return '';
        var node = sel.getRangeAt(0).startContainer;
        if (node.nodeType === 3) node = node.parentElement;
        var block = node.closest('h1,h2,h3,h4,h5,h6,p,div');
        return block ? block.tagName : '';
    }

    function updateToolbarState() {
        editorToolbar.querySelectorAll('button[data-cmd]').forEach(function(btn) {
            var cmd = btn.dataset.cmd, val = btn.dataset.val;
            if (cmd === 'formatBlock' && val) btn.classList.toggle('active', getCurrentBlockTag() === val.toUpperCase());
            else btn.classList.toggle('active', document.queryCommandState(cmd));
        });
    }

    editorToolbar.querySelectorAll('button[data-cmd]').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            var cmd = this.dataset.cmd, val = this.dataset.val || null;
            if (cmd === 'formatBlock') {
                var current = getCurrentBlockTag();
                document.execCommand(cmd, false, current === val.toUpperCase() ? 'p' : val);
            } else { document.execCommand(cmd, false, null); this.classList.toggle('active', document.queryCommandState(cmd)); }
            editorContent.focus(); updateStats(); saveDraftAuto();
        });
    });

    editorContent.addEventListener('keyup', function() { updateToolbarState(); updateStats(); saveDraftAuto(); });
    editorContent.addEventListener('mouseup', updateToolbarState);
    editorContent.addEventListener('paste', function(e) {
        e.preventDefault();
        var text = (e.clipboardData || window.clipboardData).getData('text/plain');
        if (!text.trim()) return;
        var html = text.split('\n').filter(function(p) { return p.trim(); }).map(function(p) { return '<p>' + p + '</p>'; }).join('');
        document.execCommand('insertHTML', false, html);
        updateStats(); saveDraftAuto();
    });

    // ========== INSERT DIVIDER ==========
    document.getElementById('insertDividerBtn').addEventListener('click', function(e) {
        e.preventDefault();
        editorContent.focus();
        document.execCommand('insertHorizontalRule', false, null);
        updateStats();
        saveDraftAuto();
    });

    // ========== IMAGE MODAL ==========
    document.getElementById('insertImageBtn').addEventListener('click', function(e) {
        e.preventDefault();
        imageModal.style.display = 'flex';
        imageUrlInput.value = '';
        pendingImageUrl = '';
        imagePreview.style.display = 'none';
        imagePreviewImg.src = '';
        imageTabs.forEach(function(t) { t.classList.remove('active'); });
        imageTabs[0].classList.add('active');
        tabUrl.style.display = 'block';
        tabUpload.style.display = 'none';
        setTimeout(function() { imageUrlInput.focus(); }, 100);
    });

    closeImageModal.addEventListener('click', function() { imageModal.style.display = 'none'; });
    imageModal.addEventListener('click', function(e) { if (e.target === imageModal) imageModal.style.display = 'none'; });

    imageTabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            imageTabs.forEach(function(t) { t.classList.remove('active'); });
            this.classList.add('active');
            if (this.dataset.tab === 'url') { tabUrl.style.display = 'block'; tabUpload.style.display = 'none'; }
            else { tabUrl.style.display = 'none'; tabUpload.style.display = 'block'; }
        });
    });

    insertUrlBtn.addEventListener('click', function() {
        var url = imageUrlInput.value.trim();
        if (!url) { showToast(svg.alert, 'URL tidak boleh kosong'); return; }
        pendingImageUrl = url;
        imagePreviewImg.src = url;
        imagePreview.style.display = 'inline-block';
    });

    imageUrlInput.addEventListener('input', function() {
        var url = imageUrlInput.value.trim();
        if (url) { pendingImageUrl = url; imagePreviewImg.src = url; imagePreview.style.display = 'inline-block'; }
        else { imagePreview.style.display = 'none'; }
    });

    uploadArea.addEventListener('click', function() { imageFileInput.click(); });

    uploadArea.addEventListener('dragover', function(e) { e.preventDefault(); this.style.borderColor = '#333'; this.style.background = '#f0f0f0'; });
    uploadArea.addEventListener('dragleave', function() { this.style.borderColor = '#ddd'; this.style.background = '#fafafa'; });
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.style.borderColor = '#ddd';
        this.style.background = '#fafafa';
        var file = e.dataTransfer.files[0];
        if (file) handleImageFile(file);
    });

    imageFileInput.addEventListener('change', function() { var file = this.files[0]; if (file) handleImageFile(file); });

    async function handleImageFile(file) {
        if (file.size > 5 * 1024 * 1024) { showToast(svg.alert, 'Maks 5MB'); return; }
        showToast(svg.upload, 'Upload...');
        var result = await API.uploadImage(file);
        if (result.success) { pendingImageUrl = result.url; imagePreviewImg.src = result.url; imagePreview.style.display = 'inline-block'; showToast(svg.check, 'Terupload!'); }
        else showToast(svg.x, 'Gagal upload');
    }

    removeImagePreview.addEventListener('click', function() {
        pendingImageUrl = ''; imagePreview.style.display = 'none'; imagePreviewImg.src = ''; imageUrlInput.value = '';
    });

    imagePreviewImg.addEventListener('click', function() { if (pendingImageUrl) insertImageToEditor(pendingImageUrl); });
    imagePreviewImg.addEventListener('dblclick', function() { if (pendingImageUrl) insertImageToEditor(pendingImageUrl); });

    function insertImageToEditor(url) {
        imageModal.style.display = 'none';
        editorContent.focus();
        document.execCommand('insertImage', false, url);
        updateStats();
        saveDraftAuto();
    }

    imageUrlInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); var url = imageUrlInput.value.trim(); if (url) insertImageToEditor(url); }
    });

    // ========== STATS ==========
    function updateStats() {
        var text = editorContent.innerText || '';
        wordCount.textContent = (text.trim() ? text.trim().split(/\s+/).length : 0) + ' kata';
        charCount.textContent = text.length + ' karakter';
    }

    function saveDraftAuto() {
        if (!currentId) return;
        localStorage.setItem('draft_' + currentId, JSON.stringify({
            id: currentId, title: storyTitle.value, thumb: storyThumb.value,
            content: editorContent.innerHTML, timestamp: Date.now()
        }));
    }

    saveDraftBtn.addEventListener('click', function() { saveDraftAuto(); showToast(svg.save, 'Draft tersimpan'); });

    publishBtn.addEventListener('click', async function() {
        if (!currentId) { showToast(svg.alert, 'Isi ID dulu!'); editIdChapterBtn.click(); return; }
        var title = storyTitle.value.trim();
        var content = editorContent.innerHTML.trim();
        if (!title) { showToast(svg.alert, 'Judul wajib diisi!'); return; }
        if (!content || content === '<br>' || content === '<p><br></p>') { showToast(svg.alert, 'Konten kosong!'); return; }

        publishBtn.innerHTML = svg.spinner + ' Menyimpan...';
        publishBtn.disabled = true;

        try {
            if (originalId && currentId !== originalId) {
                await API.deleteStory(originalId);
                localStorage.removeItem('draft_' + originalId);
            }
            var result = await API.saveStory({ id: currentId, title: title, thumbnail: storyThumb.value.trim(), content: content });
            if (result.success) {
                localStorage.removeItem('draft_' + currentId);
                originalId = currentId;
                publishBtn.innerHTML = svg.check + ' Berhasil!';
                showToast(svg.check, 'Cerita berhasil diterbitkan!');
                setTimeout(function() { window.location.href = 'index.html'; }, 1500);
            } else { throw new Error(result.error || 'Gagal'); }
        } catch (err) {
            publishBtn.innerHTML = svg.send + ' Terbitkan';
            publishBtn.disabled = false;
            showToast(svg.x, 'Gagal: ' + (err.message || 'Coba lagi'));
        }
    });

    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveDraftAuto(); showToast(svg.save, 'Draft tersimpan'); }
        if (e.key === 'Escape') {
            if (imageModal.style.display === 'flex') imageModal.style.display = 'none';
            if (idChapterEdit.style.display === 'block') idChapterEdit.style.display = 'none';
        }
    });

    loadStory();
    updateHeaderDisplay();
    updateToolbarState();
    window.addEventListener('beforeunload', function() { saveDraftAuto(); });
});