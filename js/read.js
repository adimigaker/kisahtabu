document.addEventListener('DOMContentLoaded', async function() {
    var urlParams = new URLSearchParams(window.location.search);
    var currentId = urlParams.get('id');

    if (!currentId) {
        document.getElementById('readContent').innerHTML = '<p style="text-align:center;margin-top:3rem;">Cerita tidak ditemukan.</p>';
        return;
    }

    var seriesChapters = [];
    var currentIndex = 0;
    var bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
    var history = JSON.parse(localStorage.getItem('history') || '[]');
    var scrollMemory = JSON.parse(localStorage.getItem('scrollMemory') || '{}');

    var readHeader = document.getElementById('readHeader');
    var readFooter = document.getElementById('readFooter');
    var headerTitle = document.getElementById('headerTitle');
    var readContent = document.getElementById('readContent');
    var chapterIndicator = document.getElementById('chapterIndicator');
    var prevBtn = document.getElementById('prevBtn');
    var nextBtn = document.getElementById('nextBtn');
    var backBtn = document.getElementById('backBtn');
    var chapterListBtn = document.getElementById('chapterListBtn');
    var readBookmarkBtn = document.getElementById('readBookmarkBtn');
    var chapterOverlay = document.getElementById('chapterOverlay');
    var overlayChapterList = document.getElementById('overlayChapterList');
    var closeOverlay = document.getElementById('closeOverlay');

    var spinnerSVG = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';

    function showSpinner() {
        readContent.innerHTML = '<div style="text-align:center;padding:3rem 1rem;color:#aaa;">' + spinnerSVG + '<p>Memuat cerita...</p></div>';
    }

    function updateBookmarkUI() {
        if (readBookmarkBtn) readBookmarkBtn.classList.toggle('bookmarked', bookmarks.includes(currentId));
    }

    // ========== LAZY RENDER ==========
    function lazyRenderContent(html, title, id) {
        headerTitle.textContent = title || 'Kisah Tabu';
        chapterIndicator.textContent = id || '';

        var parts = html.split(/<hr[^>]*>/);
        var currentPart = 0;

        readContent.innerHTML = '';
        var wrapper = document.createElement('div');
        readContent.appendChild(wrapper);

        function renderFirstPart() {
            if (currentPart >= parts.length) return;
            var partHTML = parts[currentPart].trim();
            if (!partHTML && currentPart < parts.length) {
                currentPart++;
                renderFirstPart();
                return;
            }
            var partDiv = document.createElement('div');
            partDiv.className = 'content-part';
            partDiv.innerHTML = partHTML;
            wrapper.appendChild(partDiv);
            currentPart++;

            if (prevBtn) prevBtn.disabled = currentIndex <= 0;
            if (nextBtn) nextBtn.disabled = currentIndex >= seriesChapters.length - 1;
            updateBookmarkUI();

            var savedScroll = scrollMemory[currentId];
            if (savedScroll) setTimeout(function() { window.scrollTo(0, savedScroll); }, 50);

            if (currentPart < parts.length) setTimeout(renderNextPart, 20);
        }

        function renderNextPart() {
            if (currentPart >= parts.length) return;
            var partHTML = parts[currentPart].trim();
            if (!partHTML) { currentPart++; renderNextPart(); return; }
            if (currentPart > 0) {
                var hr = document.createElement('hr');
                wrapper.appendChild(hr);
            }
            var partDiv = document.createElement('div');
            partDiv.className = 'content-part';
            partDiv.style.animation = 'fadeIn 0.3s ease forwards';
            partDiv.innerHTML = partHTML;
            wrapper.appendChild(partDiv);
            currentPart++;
            if (currentPart < parts.length) setTimeout(renderNextPart, 20);
        }

        renderFirstPart();
    }

    // ========== NAVIGASI ==========
    function goToChapter(index) {
        if (index < 0 || index >= seriesChapters.length) return;
        scrollMemory[currentId] = window.scrollY;
        localStorage.setItem('scrollMemory', JSON.stringify(scrollMemory));
        currentIndex = index;
        currentId = seriesChapters[currentIndex].id;
        window.history.replaceState({}, '', 'read.html?id=' + currentId);
        showSpinner();
        window.scrollTo(0, 0);
        setTimeout(async function() {
            var story = await API.getStoryFull(currentId);
            if (story) lazyRenderContent(story.content, story.title, story.id);
        }, 100);
    }

    // ========== LOAD ==========
    showSpinner();

    var currentStory = await API.getStoryFull(currentId);
    if (!currentStory) {
        readContent.innerHTML = '<p style="text-align:center;margin-top:3rem;">Cerita tidak ditemukan.</p>';
        return;
    }

    try {
        var allStories = await API.getAllStories();
        var prefix = currentId.split('-')[0];
        seriesChapters = allStories.filter(function(s) { return s.id.startsWith(prefix + '-'); }).sort(function(a, b) {
            return (parseInt(a.id.split('-')[1]) || 0) - (parseInt(b.id.split('-')[1]) || 0);
        });
        currentIndex = seriesChapters.findIndex(function(s) { return s.id === currentId; });
        if (currentIndex < 0) currentIndex = 0;
    } catch (err) {
        seriesChapters = [{ id: currentId, title: currentStory.title }];
    }

    if (!history.includes(currentId)) { history.push(currentId); localStorage.setItem('history', JSON.stringify(history)); }

    // ========== BOOKMARK ==========
    if (readBookmarkBtn) {
        readBookmarkBtn.addEventListener('click', function() {
            var idx = bookmarks.indexOf(currentId);
            if (idx > -1) bookmarks.splice(idx, 1);
            else bookmarks.push(currentId);
            localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
            updateBookmarkUI();
        });
    }

    // ========== EVENT LISTENERS ==========
    if (prevBtn) prevBtn.addEventListener('click', function() { if (currentIndex > 0) goToChapter(currentIndex - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function() { if (currentIndex < seriesChapters.length - 1) goToChapter(currentIndex + 1); });
    if (backBtn) backBtn.addEventListener('click', function() { scrollMemory[currentId] = window.scrollY; localStorage.setItem('scrollMemory', JSON.stringify(scrollMemory)); window.location.href = 'index.html'; });

    if (chapterListBtn && chapterOverlay) {
        chapterListBtn.addEventListener('click', function() {
            overlayChapterList.innerHTML = seriesChapters.map(function(s, i) {
                return '<div class="chapter-item' + (i === currentIndex ? ' active' : '') + '" data-id="' + s.id + '"><strong>' + s.id + '</strong>: ' + s.title + '</div>';
            }).join('');
            overlayChapterList.querySelectorAll('.chapter-item').forEach(function(item) {
                item.addEventListener('click', function() { chapterOverlay.classList.remove('show'); var idx = seriesChapters.findIndex(function(s) { return s.id === item.dataset.id; }); if (idx >= 0) goToChapter(idx); });
            });
            chapterOverlay.classList.add('show');
        });
        closeOverlay.addEventListener('click', function() { chapterOverlay.classList.remove('show'); });
        chapterOverlay.addEventListener('click', function(e) { if (e.target === chapterOverlay) chapterOverlay.classList.remove('show'); });
    }

    // ========== AUTO HIDE ==========
    var lastScrollY = window.scrollY;
    var scrollTimeout;
    window.addEventListener('scroll', function() {
        var cs = window.scrollY;
        if (cs > lastScrollY && cs > 100) { if (readHeader) readHeader.classList.add('hidden'); if (readFooter) readFooter.classList.add('hidden'); }
        else if (cs < lastScrollY) { if (readHeader) readHeader.classList.remove('hidden'); if (readFooter) readFooter.classList.remove('hidden'); }
        lastScrollY = cs;
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(function() { scrollMemory[currentId] = window.scrollY; localStorage.setItem('scrollMemory', JSON.stringify(scrollMemory)); }, 500);
    });
    window.addEventListener('beforeunload', function() { scrollMemory[currentId] = window.scrollY; localStorage.setItem('scrollMemory', JSON.stringify(scrollMemory)); });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); if (currentIndex > 0) goToChapter(currentIndex - 1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); if (currentIndex < seriesChapters.length - 1) goToChapter(currentIndex + 1); }
    });

    // ========== RENDER ==========
    lazyRenderContent(currentStory.content, currentStory.title, currentStory.id);
    updateBookmarkUI();
});