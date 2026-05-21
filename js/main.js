
document.addEventListener('DOMContentLoaded', () => {
    let stories = [];
    let bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
    let history = JSON.parse(localStorage.getItem('history') || '[]');

    const container = document.getElementById('contentContainer');
    const searchInput = document.getElementById('searchInput');
    const footerBtns = document.querySelectorAll('.footer-btn');

    // ========== LOAD DARI API ==========
    async function loadStories() {
        container.innerHTML = '<p class="empty-state">Memuat cerita...</p>';
        stories = await API.getAllStories();
        renderStories(stories);
    }

    function renderStories(data) {
        container.innerHTML = '';
        if (!data || data.length === 0) {
            container.innerHTML = '<p class="empty-state">Tidak ada cerita.</p>';
            return;
        }
        data.forEach(story => {
            const isBookmarked = bookmarks.includes(story.id);
            const card = document.createElement('div');
            card.className = 'story-card';
            card.innerHTML = `
                <img class="thumbnail" src="${story.thumbnail || 'assets/default-thumb.jpg'}" 
                     alt="${story.title}" 
                     onerror="this.src='assets/default-thumb.jpg'">
                <div class="info">
                    <h3>${story.title}</h3>
                    <small>${story.id} • ${story.total_chapters || 0} bab</small>
                </div>
                <button class="bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" data-id="${story.id}">
                    <svg class="bookmark-outline" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#bbb" stroke-width="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                    </svg>
                    <svg class="bookmark-filled" width="18" height="18" viewBox="0 0 24 24" fill="#e74c3c" stroke="#e74c3c" stroke-width="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                    </svg>
                </button>
            `;
            
            card.addEventListener('click', (e) => {
                if (e.target.closest('.bookmark-btn')) return;
                if (!history.includes(story.id)) {
                    history.push(story.id);
                    localStorage.setItem('history', JSON.stringify(history));
                }
                window.location.href = `read.html?id=${story.id}`;
            });
            
            container.appendChild(card);
        });

        document.querySelectorAll('.bookmark-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleBookmark(this.dataset.id, this);
            });
        });
    }

    function toggleBookmark(id, btnElement) {
        const index = bookmarks.indexOf(id);
        if (index > -1) {
            bookmarks.splice(index, 1);
            btnElement.classList.remove('bookmarked');
        } else {
            bookmarks.push(id);
            btnElement.classList.add('bookmarked');
        }
        localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
        
        const activeTab = document.querySelector('.footer-btn.active').dataset.view;
        if (activeTab === 'bookmark') renderFiltered('bookmark');
    }

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = stories.filter(s => 
            s.title.toLowerCase().includes(term) || 
            s.id.toLowerCase().includes(term)
        );
        renderStories(filtered);
    });

    footerBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            footerBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const view = btn.dataset.view;
            if (view === 'home') {
                searchInput.value = '';
                renderStories(stories);
            } else if (view === 'bookmark') {
                renderFiltered('bookmark');
            } else if (view === 'history') {
                renderFiltered('history');
            }
        });
    });

    function renderFiltered(type) {
        if (type === 'bookmark') {
            renderStories(stories.filter(s => bookmarks.includes(s.id)));
        } else if (type === 'history') {
            renderStories(stories.filter(s => history.includes(s.id)));
        }
    }

    // Init
    loadStories();
});