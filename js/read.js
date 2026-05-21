document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const seriesId = urlParams.get('id');
    const chapterParam = urlParams.get('chapter');
    
    let currentSeries = null;
    let chapters = [];
    let currentChapterIndex = 0;
    let bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
    let history = JSON.parse(localStorage.getItem('history') || '[]');
    const scrollMemory = JSON.parse(localStorage.getItem('scrollMemory') || '{}');

    const readHeader = document.getElementById('readHeader');
    const readFooter = document.getElementById('readFooter');
    const headerTitle = document.getElementById('headerTitle');
    const readContent = document.getElementById('readContent');
    const chapterIndicator = document.getElementById('chapterIndicator');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const backBtn = document.getElementById('backBtn');
    const chapterListBtn = document.getElementById('chapterListBtn');
    const readBookmarkBtn = document.getElementById('readBookmarkBtn');
    const chapterOverlay = document.getElementById('chapterOverlay');
    const overlayChapterList = document.getElementById('overlayChapterList');
    const closeOverlay = document.getElementById('closeOverlay');

    if (!seriesId) {
        readContent.innerHTML = '<p style="text-align:center;margin-top:3rem;">Cerita tidak ditemukan.</p>';
        return;
    }

    // Load dari API
    currentSeries = await API.getStory(seriesId);
    if (!currentSeries) {
        readContent.innerHTML = '<p style="text-align:center;margin-top:3rem;">Cerita tidak ditemukan.</p>';
        return;
    }

    chapters = await API.getChapterList(seriesId);
    if (chapters.length === 0) {
        readContent.innerHTML = '<p style="text-align:center;margin-top:3rem;">Belum ada chapter.</p>';
        return;
    }

    if (!history.includes(seriesId)) {
        history.push(seriesId);
        localStorage.setItem('history', JSON.stringify(history));
    }

    if (chapterParam) {
        currentChapterIndex = chapters.findIndex(c => c.chapter === chapterParam);
        if (currentChapterIndex < 0) currentChapterIndex = 0;
    } else {
        const savedChap = scrollMemory[seriesId];
        if (savedChap !== undefined && savedChap < chapters.length) {
            currentChapterIndex = savedChap;
        }
    }

    updateBookmarkUI();
    await loadChapter();
    updateUI();

    const savedScroll = scrollMemory[`${seriesId}_${currentChapterIndex}`];
    if (savedScroll) {
        setTimeout(() => window.scrollTo(0, savedScroll), 100);
    }

    function updateBookmarkUI() {
        readBookmarkBtn.classList.toggle('bookmarked', bookmarks.includes(seriesId));
    }

    readBookmarkBtn.addEventListener('click', () => {
        const index = bookmarks.indexOf(seriesId);
        if (index > -1) bookmarks.splice(index, 1);
        else bookmarks.push(seriesId);
        localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
        updateBookmarkUI();
    });

    async function loadChapter() {
        if (currentChapterIndex >= chapters.length) return;
        const chapMeta = chapters[currentChapterIndex];
        const chapData = await API.getChapter(seriesId, chapMeta.chapter);
        
        if (chapData) {
            headerTitle.textContent = currentSeries.title;
            readContent.innerHTML = `
                <h1>${chapData.title}</h1>
                <p class="chapter-meta">${currentSeries.title} — Bab ${chapData.chapter}</p>
                <div>${chapData.content}</div>
            `;
            chapterIndicator.textContent = `Bab ${chapData.chapter}`;
        }
    }

    function updateUI() {
        prevBtn.disabled = currentChapterIndex === 0;
        nextBtn.disabled = currentChapterIndex >= chapters.length - 1;
    }

    function saveScrollPosition() {
        scrollMemory[`${seriesId}_${currentChapterIndex}`] = window.scrollY;
        scrollMemory[seriesId] = currentChapterIndex;
        localStorage.setItem('scrollMemory', JSON.stringify(scrollMemory));
    }

    async function goToChapter(index) {
        if (index < 0 || index >= chapters.length) return;
        saveScrollPosition();
        currentChapterIndex = index;
        await loadChapter();
        updateUI();
        const chap = chapters[currentChapterIndex];
        window.history.replaceState({}, '', `read.html?id=${seriesId}&chapter=${chap.chapter}`);
        window.scrollTo(0, 0);
    }

    prevBtn.addEventListener('click', () => goToChapter(currentChapterIndex - 1));
    nextBtn.addEventListener('click', () => goToChapter(currentChapterIndex + 1));
    backBtn.addEventListener('click', () => {
        saveScrollPosition();
        window.location.href = 'index.html';
    });

    chapterListBtn.addEventListener('click', () => {
        overlayChapterList.innerHTML = chapters.map((chap, idx) => `
            <div class="chapter-item ${idx === currentChapterIndex ? 'active' : ''}" data-index="${idx}">
                <strong>Bab ${chap.chapter}</strong>: ${chap.title}
            </div>
        `).join('');
        overlayChapterList.querySelectorAll('.chapter-item').forEach(item => {
            item.addEventListener('click', () => {
                chapterOverlay.classList.remove('show');
                goToChapter(parseInt(item.dataset.index));
            });
        });
        chapterOverlay.classList.add('show');
    });

    closeOverlay.addEventListener('click', () => chapterOverlay.classList.remove('show'));
    chapterOverlay.addEventListener('click', (e) => {
        if (e.target === chapterOverlay) chapterOverlay.classList.remove('show');
    });

    let lastScrollY = window.scrollY;
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        const currentScroll = window.scrollY;
        if (currentScroll > lastScrollY && currentScroll > 100) {
            readHeader.classList.add('hidden');
            readFooter.classList.add('hidden');
        } else if (currentScroll < lastScrollY) {
            readHeader.classList.remove('hidden');
            readFooter.classList.remove('hidden');
        }
        lastScrollY = currentScroll;
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => saveScrollPosition(), 500);
    });

    window.addEventListener('beforeunload', () => saveScrollPosition());

    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); goToChapter(currentChapterIndex - 1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); goToChapter(currentChapterIndex + 1); }
    });
});