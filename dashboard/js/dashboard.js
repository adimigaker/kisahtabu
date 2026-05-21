
document.addEventListener('DOMContentLoaded', function() {
    var stories = [];
    var deleteIndex = null;

    var seriesContainer = document.getElementById('seriesContainer');
    var exportBtn = document.getElementById('exportBtn');
    var syncBtn = document.getElementById('syncBtn');
    
    // Popup baru
    var newStoryBtn = document.getElementById('newStoryBtn');
    var newStoryModal = document.getElementById('newStoryModal');
    var newStoryForm = document.getElementById('newStoryForm');
    var popupId = document.getElementById('popupId');
    var popupChapter = document.getElementById('popupChapter');
    var popupTitle = document.getElementById('popupTitle');
    var closeModalBtn = document.getElementById('closeModalBtn');

    // Konfirmasi delete
    var confirmOverlay = document.getElementById('confirmDeleteOverlay');
    var deleteStoryName = document.getElementById('deleteStoryName');
    var cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    var confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    var toast = document.getElementById('toast');

    // ========== LOAD DATA ==========
    async function loadStories() {
        seriesContainer.innerHTML = '<div class="empty-state"><p>⏳ Memuat cerita...</p></div>';
        console.log('Loading stories from API...');
        
        try {
            stories = await API.getAllStories();
            console.log('Stories loaded:', stories.length);
            renderSeries();
        } catch (err) {
            console.error('Load error:', err);
            seriesContainer.innerHTML = '<div class="empty-state"><p>❌ Gagal memuat</p><button onclick="location.reload()" style="margin-top:10px;padding:8px 16px;background:#333;color:#fff;border:none;border-radius:6px;cursor:pointer;">Coba Lagi</button></div>';
        }
    }

    function renderSeries() {
        if (!seriesContainer) return;
        seriesContainer.innerHTML = '';
        
        if (!stories || stories.length === 0) {
            seriesContainer.innerHTML = '<div class="empty-state"><h3>Belum ada cerita</h3><p>Klik Cerita Baru untuk mulai</p></div>';
            return;
        }

        for (var i = 0; i < stories.length; i++) {
            var series = stories[i];
            var wrapper = document.createElement('div');
            wrapper.className = 'series-card-wrapper';
            
            wrapper.innerHTML = '<div class="delete-bg"><span>Hapus</span></div>' +
                '<div class="series-card" data-index="' + i + '">' +
                '<img src="' + (series.thumbnail || '../assets/default-thumb.jpg') + '" ' +
                'alt="' + (series.title || 'Cerita') + '" ' +
                'onerror="this.src=\'../assets/default-thumb.jpg\'">' +
                '<div class="info">' +
                '<h3>' + (series.title || 'Tanpa Judul') + '</h3>' +
                '<small>' + (series.id || '?') + ' • ' + (series.total_chapters || 0) + ' bab</small>' +
                '</div></div>';
            
            var card = wrapper.querySelector('.series-card');
            setupSwipe(card, i);
            
            card.addEventListener('click', function(e) {
                var idx = parseInt(this.dataset.index);
                if (this.classList.contains('swiped')) {
                    resetCard(this);
                    return;
                }
                window.location.href = 'editor.html?id=' + stories[idx].id;
            });
            
            seriesContainer.appendChild(wrapper);
        }
    }

    // ========== SWIPE ==========
    function setupSwipe(card, index) {
        var startX = 0;
        var moveX = 0;
        var isDragging = false;
        var threshold = -70;

        function onStart(x) {
            startX = x;
            moveX = x;
            isDragging = true;
            card.style.transition = 'none';
        }

        function onMove(x) {
            if (!isDragging) return;
            moveX = x;
            var diff = moveX - startX;
            if (diff < 0) {
                card.style.transform = 'translateX(' + Math.max(diff, -90) + 'px)';
                if (diff <= threshold) card.classList.add('swiped');
                else card.classList.remove('swiped');
            }
        }

        function onEnd() {
            if (!isDragging) return;
            isDragging = false;
            card.style.transition = 'transform 0.25s cubic-bezier(0.25, 0.8, 0.25, 1.2)';
            var diff = moveX - startX;
            
            if (diff <= threshold) {
                card.classList.add('swiped');
                card.style.transform = 'translateX(-90px)';
                setTimeout(function() { showConfirm(index); }, 350);
            } else {
                resetCard(card);
            }
        }

        card.addEventListener('touchstart', function(e) { onStart(e.touches[0].clientX); }, { passive: true });
        card.addEventListener('touchmove', function(e) { onMove(e.touches[0].clientX); }, { passive: true });
        card.addEventListener('touchend', onEnd);
        card.addEventListener('mousedown', function(e) { onStart(e.clientX); });
        
        document.addEventListener('mousemove', function(e) {
            if (isDragging) onMove(e.clientX);
        });
        document.addEventListener('mouseup', function() {
            if (isDragging) onEnd();
        });
    }

    function resetCard(card) {
        card.classList.remove('swiped');
        card.style.transform = 'translateX(0)';
    }

    function resetAllCards() {
        var cards = document.querySelectorAll('.series-card.swiped');
        for (var i = 0; i < cards.length; i++) {
            resetCard(cards[i]);
        }
    }

    // ========== KONFIRMASI DELETE ==========
    function showConfirm(index) {
        deleteIndex = index;
        deleteStoryName.textContent = '"' + stories[index].title + '" (' + stories[index].id + ')';
        confirmOverlay.style.display = 'flex';
    }

    function hideConfirm() {
        confirmOverlay.style.display = 'none';
        deleteIndex = null;
        resetAllCards();
    }

    cancelDeleteBtn.addEventListener('click', hideConfirm);
    confirmOverlay.addEventListener('click', function(e) {
        if (e.target === confirmOverlay) hideConfirm();
    });

    confirmDeleteBtn.addEventListener('click', async function() {
        if (deleteIndex === null) return;
        
        var story = stories[deleteIndex];
        var card = document.querySelector('.series-card[data-index="' + deleteIndex + '"]');
        if (card) card.classList.add('removing');
        
        await API.deleteStory(story.id);
        
        stories.splice(deleteIndex, 1);
        localStorage.removeItem('draft_' + story.id);
        hideConfirm();
        
        setTimeout(function() {
            renderSeries();
            showToast('🗑️ "' + story.title + '" dihapus');
        }, 300);
    });

    // ========== POPUP CERITA BARU ==========
    function openNewModal() {
        popupId.value = '';
        popupChapter.value = '01';
        popupTitle.value = '';
        newStoryModal.style.display = 'flex';
        setTimeout(function() { popupId.focus(); }, 150);
    }

    function closeNewModal() {
        newStoryModal.style.display = 'none';
    }

    newStoryBtn.addEventListener('click', function(e) { e.preventDefault(); openNewModal(); });
    closeModalBtn.addEventListener('click', function(e) { e.preventDefault(); closeNewModal(); });
    newStoryModal.addEventListener('click', function(e) { if (e.target === newStoryModal) closeNewModal(); });

    newStoryForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var id = popupId.value.trim().toUpperCase();
        var chapter = popupChapter.value.trim();
        var title = popupTitle.value.trim();
        
        if (!id) { alert('⚠️ ID wajib diisi!'); return; }
        if (!chapter) { alert('⚠️ Chapter wajib diisi!'); return; }
        if (!title) { alert('⚠️ Judul wajib diisi!'); return; }
        
        sessionStorage.setItem('newStoryInfo', JSON.stringify({ id: id, chapter: chapter, title: title }));
        window.location.href = 'editor.html?new=true&id=' + id + '&chapter=' + chapter;
    });

    // ========== SYNC ==========
    syncBtn.addEventListener('click', async function() {
        syncBtn.disabled = true;
        syncBtn.textContent = '⏳...';
        await loadStories();
        syncBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> Sync';
        syncBtn.disabled = false;
        showToast('✅ Data disinkronisasi');
    });

    // ========== EXPORT ==========
    exportBtn.addEventListener('click', function() {
        if (!stories || stories.length === 0) {
            alert('⚠️ Tidak ada data untuk diexport.');
            return;
        }
        var blob = new Blob([JSON.stringify(stories, null, 2)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'kisahtabu_backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast('📤 Data diexport');
    });

    // ========== TOAST ==========
    function showToast(msg) {
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(function() { toast.classList.remove('show'); }, 2500);
    }

    // ========== ESCAPE ==========
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (confirmOverlay.style.display === 'flex') hideConfirm();
            if (newStoryModal.style.display === 'flex') closeNewModal();
        }
    });

    // ========== INIT ==========
    loadStories();
    console.log('✅ Dashboard siap!');
});