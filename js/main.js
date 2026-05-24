document.addEventListener('DOMContentLoaded', function() {
    var stories = [];
    var displayedCount = 0;
    var loadMoreBtn = null;
    var bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
    var history = JSON.parse(localStorage.getItem('history') || '[]');
    var container = document.getElementById('contentContainer');
    var searchInput = document.getElementById('searchInput');
    var footerBtns = document.querySelectorAll('.footer-btn');

    var svgIcons = {
        spinner: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
        xCircle: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        bookOpen: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    };

    // ========== PULL TO REFRESH ==========
    var pullIndicator = document.createElement('div');
    pullIndicator.className = 'pull-indicator';
    pullIndicator.innerHTML = svgIcons.spinner + '<span class="pull-text">Tarik untuk refresh</span>';
    container.parentNode.insertBefore(pullIndicator, container);

    var touchStartY = 0;
    var touchEndY = 0;
    var isPulling = false;
    var pullThreshold = 80;
    var pullDistance = 0;

    document.addEventListener('touchstart', function(e) {
        if (window.scrollY <= 5) {
            touchStartY = e.touches[0].clientY;
            isPulling = true;
            pullDistance = 0;
        }
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
        if (!isPulling) return;
        touchEndY = e.touches[0].clientY;
        pullDistance = touchEndY - touchStartY;
        if (pullDistance > 15 && window.scrollY <= 5) {
            pullIndicator.classList.add('show');
            if (pullDistance > pullThreshold) {
                pullIndicator.querySelector('.pull-text').textContent = 'Lepaskan untuk refresh';
            } else {
                pullIndicator.querySelector('.pull-text').textContent = 'Tarik untuk refresh...';
            }
        }
    }, { passive: true });

    document.addEventListener('touchend', function() {
        if (!isPulling) return;
        isPulling = false;
        if (pullDistance > pullThreshold && window.scrollY <= 5) {
            refreshData();
        }
        pullIndicator.classList.remove('show');
        touchStartY = 0;
        touchEndY = 0;
        pullDistance = 0;
    });

    // ========== REFRESH (FORCE) ==========
    async function refreshData() {
        localStorage.removeItem('stories_cache');
        localStorage.removeItem('stories_cache_time');
        API._cache = null;
        API._cacheTime = 0;

        container.innerHTML = '<div class="loading-state">' + svgIcons.spinner + '<p>Memperbarui cerita...</p></div>';

        try {
            stories = await API.getAllStories(true);
            displayedCount = 0;
            renderStories(stories.slice(0, 10));
        } catch (err) {
            container.innerHTML = '<div class="loading-state">' + svgIcons.xCircle + '<p>Gagal memuat</p><button onclick="refreshData()" style="margin-top:10px;padding:8px 16px;background:#333;color:#fff;border:none;border-radius:6px;cursor:pointer;">Coba Lagi</button></div>';
        }
    }

    // ========== LOAD STORIES (PAKAI CACHE) ==========
    async function loadStories() {
        var cached = localStorage.getItem('stories_cache');

        if (cached) {
            try {
                stories = JSON.parse(cached);
                displayedCount = 0;
                renderStories(stories.slice(0, 10));
            } catch (e) {
                container.innerHTML = '<div class="loading-state">' + svgIcons.spinner + '<p>Memuat cerita...</p></div>';
            }
        } else {
            container.innerHTML = '<div class="loading-state">' + svgIcons.spinner + '<p>Memuat cerita...</p></div>';
        }

        try {
            stories = await API.getAllStories();
            displayedCount = 0;
            renderStories(stories.slice(0, 10));
        } catch (err) {
            if (!cached) {
                container.innerHTML = '<div class="loading-state">' + svgIcons.xCircle + '<p>Gagal memuat cerita</p><button onclick="refreshData()" style="margin-top:10px;padding:8px 16px;background:#333;color:#fff;border:none;border-radius:6px;cursor:pointer;">Coba Lagi</button></div>';
            }
        }
    }

    // ========== RENDER STORIES (10 FIRST) ==========
    function renderStories(data) {
        container.innerHTML = '';

        if (!data || !data.length) {
            container.innerHTML = '<div class="empty-state">' + svgIcons.bookOpen + '<p>Belum ada cerita.</p></div>';
            return;
        }

        data.forEach(function(item) {
            var isBookmarked = bookmarks.includes(item.id);
            var card = document.createElement('div');
            card.className = 'story-card';
            card.innerHTML =
                '<img class="thumbnail" src="' + (item.thumbnail || 'assets/default-thumb.jpg') + '" ' +
                'alt="' + item.title + '" onerror="this.src=\'assets/default-thumb.jpg\'">' +
                '<div class="info">' +
                '<h3>' + item.title + '</h3>' +
                '<small>' + item.id + '</small>' +
                '</div>' +
                '<button class="bookmark-btn ' + (isBookmarked ? 'bookmarked' : '') + '" data-id="' + item.id + '">' +
                '<svg class="bookmark-outline" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#bbb" stroke-width="2">' +
                '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>' +
                '</svg>' +
                '<svg class="bookmark-filled" width="18" height="18" viewBox="0 0 24 24" fill="#e74c3c" stroke="#e74c3c" stroke-width="2">' +
                '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>' +
                '</svg>' +
                '</button>';

            card.addEventListener('click', function(e) {
                if (e.target.closest('.bookmark-btn')) return;
                if (!history.includes(item.id)) {
                    history.push(item.id);
                    localStorage.setItem('history', JSON.stringify(history));
                }
                window.location.href = 'read.html?id=' + item.id;
            });

            container.appendChild(card);
        });

        // Load More Button
        var totalDisplayed = document.querySelectorAll('.story-card').length;
        if (totalDisplayed < stories.length) {
            loadMoreBtn = document.createElement('button');
            loadMoreBtn.className = 'load-more-btn';
            loadMoreBtn.textContent = 'Muat Lebih Banyak (' + (stories.length - totalDisplayed) + ' cerita)';
            loadMoreBtn.addEventListener('click', function() {
                var currentCount = document.querySelectorAll('.story-card').length;
                var nextBatch = stories.slice(currentCount, currentCount + 10);
                var oldBtn = container.querySelector('.load-more-btn');
                if (oldBtn) oldBtn.remove();
                renderMoreStories(nextBatch);
            });
            container.appendChild(loadMoreBtn);
        }

        setupBookmarks();
    }

    // ========== RENDER MORE STORIES ==========
    function renderMoreStories(data) {
        data.forEach(function(item) {
            var isBookmarked = bookmarks.includes(item.id);
            var card = document.createElement('div');
            card.className = 'story-card';
            card.innerHTML =
                '<img class="thumbnail" src="' + (item.thumbnail || 'assets/default-thumb.jpg') + '" ' +
                'alt="' + item.title + '" onerror="this.src=\'assets/default-thumb.jpg\'">' +
                '<div class="info">' +
                '<h3>' + item.title + '</h3>' +
                '<small>' + item.id + '</small>' +
                '</div>' +
                '<button class="bookmark-btn ' + (isBookmarked ? 'bookmarked' : '') + '" data-id="' + item.id + '">' +
                '<svg class="bookmark-outline" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#bbb" stroke-width="2">' +
                '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>' +
                '</svg>' +
                '<svg class="bookmark-filled" width="18" height="18" viewBox="0 0 24 24" fill="#e74c3c" stroke="#e74c3c" stroke-width="2">' +
                '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>' +
                '</svg>' +
                '</button>';

            card.addEventListener('click', function(e) {
                if (e.target.closest('.bookmark-btn')) return;
                if (!history.includes(item.id)) {
                    history.push(item.id);
                    localStorage.setItem('history', JSON.stringify(history));
                }
                window.location.href = 'read.html?id=' + item.id;
            });

            container.insertBefore(card, loadMoreBtn);
        });

        var totalDisplayed = document.querySelectorAll('.story-card').length;
        if (totalDisplayed < stories.length) {
            loadMoreBtn.textContent = 'Muat Lebih Banyak (' + (stories.length - totalDisplayed) + ' cerita)';
        } else {
            if (loadMoreBtn) loadMoreBtn.remove();
        }

        setupBookmarks();
    }

    // ========== SETUP BOOKMARKS ==========
    function setupBookmarks() {
        document.querySelectorAll('.bookmark-btn').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var id = this.dataset.id;
                var index = bookmarks.indexOf(id);
                if (index > -1) {
                    bookmarks.splice(index, 1);
                    this.classList.remove('bookmarked');
                } else {
                    bookmarks.push(id);
                    this.classList.add('bookmarked');
                }
                localStorage.setItem('bookmarks', JSON.stringify(bookmarks));

                var activeTab = document.querySelector('.footer-btn.active');
                if (activeTab && activeTab.dataset.view === 'bookmark') {
                    renderStories(stories.filter(function(s) { return bookmarks.includes(s.id); }));
                }
            });
        });
    }

    // ========== SEARCH ==========
    searchInput.addEventListener('input', function(e) {
        var term = e.target.value.toLowerCase();
        if (!term) {
            renderStories(stories.slice(0, 10));
            return;
        }
        var filtered = stories.filter(function(s) {
            return s.title.toLowerCase().includes(term) || s.id.toLowerCase().includes(term);
        });
        renderStories(filtered);
    });

    // ========== FOOTER TABS ==========
    footerBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            footerBtns.forEach(function(b) { b.classList.remove('active'); });
            this.classList.add('active');
            var view = this.dataset.view;

            if (view === 'home') {
                searchInput.value = '';
                renderStories(stories.slice(0, 10));
            } else if (view === 'bookmark') {
                var filtered = stories.filter(function(s) { return bookmarks.includes(s.id); });
                renderStories(filtered);
            } else if (view === 'history') {
                var filtered = stories.filter(function(s) { return history.includes(s.id); });
                renderStories(filtered);
            }
        });
    });

    // ========== INIT ==========
    loadStories();
});