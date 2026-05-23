document.addEventListener('DOMContentLoaded', async function() {
    var urlParams = new URLSearchParams(window.location.search);
    var currentId = urlParams.get('id');
    
    if (!currentId) {
        document.getElementById('readContent').innerHTML = '<p style="text-align:center;margin-top:3rem;">Cerita tidak ditemukan.</p>';
        return;
    }

    var stories = [];
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

    // ========== PULL TO REFRESH SETUP ==========
    var pullIndicator = document.createElement('div');
    pullIndicator.className = 'pull-indicator';
    pullIndicator.innerHTML = spinnerSVG + '<span class="pull-text">Tarik untuk refresh</span>';
    readContent.parentNode.insertBefore(pullIndicator, readContent);

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
            refreshCurrentChapter();
        }
        
        pullIndicator.classList.remove('show');
        touchStartY = 0;
        touchEndY = 0;
        pullDistance = 0;
    });

    // ========== REFRESH CHAPTER ==========
    async function refreshCurrentChapter() {
        localStorage.removeItem('stories_cache');
        localStorage.removeItem('stories_cache_time');
        API._cache = null;
        API._cacheTime = 0;
        
        readContent.innerHTML = '<div style="text-align:center;padding:3rem 1rem;color:#aaa;">' + spinnerSVG + '<p>Memperbarui...</p></div>';
        
        try {
            stories = await API.getAllStories(true);
            
            var updatedStory = stories.find(function(s) { return s.id === currentId; });
            if (updatedStory) {
                var prefix = currentId.split('-')[0];
                seriesChapters = stories.filter(function(s) {
                    return s.id.startsWith(prefix + '-');
                }).sort(function(a, b) {
                    return (parseInt(a.id.split('-')[1]) || 0) - (parseInt(b.id.split('-')[1]) || 0);
                });
                
                currentIndex = seriesChapters.findIndex(function(s) { return s.id === currentId; });
                if (currentIndex < 0) currentIndex = 0;
                
                renderChapterContent(updatedStory);
            }
        } catch (err) {
            readContent.innerHTML = '<p style="text-align:center;margin-top:3rem;">Gagal refresh.</p>';
        }
    }

    // ========== LOADING ==========
    function showSpinner() {
        readContent.innerHTML = '<div style="text-align:center;padding:3rem 1rem;color:#aaa;">' + spinnerSVG + '<p>Memuat cerita...</p></div>';
    }

    function showSkeleton() {
        readContent.innerHTML = 
            '<div style="padding:1rem;">' +
            '<div style="height:2rem;background:#eee;border-radius:4px;margin-bottom:1rem;width:60%;animation:pulse 1.5s infinite;"></div>' +
            '<div style="height:1rem;background:#eee;border-radius:4px;margin-bottom:0.5rem;animation:pulse 1.5s infinite;"></div>' +
            '<div style="height:1rem;background:#eee;border-radius:4px;margin-bottom:0.5rem;width:80%;animation:pulse 1.5s infinite;"></div>' +
            '<div style="height:1rem;background:#eee;border-radius:4px;margin-bottom:0.5rem;width:70%;animation:pulse 1.5s infinite;"></div>' +
            '<div style="height:1rem;background:#eee;border-radius:4px;margin-bottom:0.5rem;animation:pulse 1.5s infinite;"></div>' +
            '</div>';
    }

    // ========== LOAD DATA ==========
    showSpinner();
    
    try {
        stories = await API.getAllStories();
    } catch (err) {
        readContent.innerHTML = '<p style="text-align:center;margin-top:3rem;">Gagal memuat data.</p>';
        return;
    }

    var currentStory = stories.find(function(s) { return s.id === currentId; });
    if (!currentStory) {
        readContent.innerHTML = '<p style="text-align:center;margin-top:3rem;">Cerita tidak ditemukan.</p>';
        return;
    }

    var prefix = currentId.split('-')[0];
    seriesChapters = stories.filter(function(s) {
        return s.id.startsWith(prefix + '-');
    }).sort(function(a, b) {
        return (parseInt(a.id.split('-')[1]) || 0) - (parseInt(b.id.split('-')[1]) || 0);
    });

    currentIndex = seriesChapters.findIndex(function(s) { return s.id === currentId; });
    if (currentIndex < 0) currentIndex = 0;

    if (!history.includes(currentId)) {
        history.push(currentId);
        localStorage.setItem('history', JSON.stringify(history));
    }

    // ========== BOOKMARK ==========
    function updateBookmarkUI() {
        if (readBookmarkBtn) {
            readBookmarkBtn.classList.toggle('bookmarked', bookmarks.includes(currentId));
        }
    }

    if (readBookmarkBtn) {
        readBookmarkBtn.addEventListener('click', function() {
            var idx = bookmarks.indexOf(currentId);
            if (idx > -1) {
                bookmarks.splice(idx, 1);
            } else {
                bookmarks.push(currentId);
            }
            localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
            updateBookmarkUI();
        });
    }

    // ========== RENDER CHAPTER (LAZY PER PART) ==========
    function renderChapterContent(story) {
        headerTitle.textContent = story.title || 'Kisah Tabu';
        chapterIndicator.textContent = story.id || '';
        
        var html = story.content || '<p>Konten kosong.</p>';
        var parts = html.split(/<hr[^>]*>/);
        var currentPart = 0;
        
        readContent.innerHTML = '';
        var wrapper = document.createElement('div');
        readContent.appendChild(wrapper);
        
        function renderNextPart() {
            if (currentPart >= parts.length) {
                var savedScroll = scrollMemory[currentId];
                if (savedScroll) {
                    setTimeout(function() { window.scrollTo(0, savedScroll); }, 100);
                }
                return;
            }
            
            var partHTML = parts[currentPart].trim();
            if (!partHTML) {
                currentPart++;
                renderNextPart();
                return;
            }
            
            var partDiv = document.createElement('div');
            partDiv.className = 'content-part';
            partDiv.style.animation = 'fadeIn 0.4s ease forwards';
            partDiv.innerHTML = partHTML;
            
            wrapper.appendChild(partDiv);
            
            // Kembalikan <hr> asli setelah part (kecuali part terakhir)
            if (currentPart < parts.length - 1) {
                var nextPart = parts[currentPart + 1];
                if (nextPart && nextPart.trim()) {
                    var hr = document.createElement('hr');
                    wrapper.appendChild(hr);
                }
            }
            
            currentPart++;
            
            if (currentPart < parts.length) {
                setTimeout(renderNextPart, 30);
            }
        }
        
        renderNextPart();
        
        if (prevBtn) prevBtn.disabled = currentIndex <= 0;
        if (nextBtn) nextBtn.disabled = currentIndex >= seriesChapters.length - 1;
        updateBookmarkUI();
    }

    // ========== NAVIGASI ==========
    function goToChapter(index) {
        if (index < 0 || index >= seriesChapters.length) return;
        
        scrollMemory[currentId] = window.scrollY;
        localStorage.setItem('scrollMemory', JSON.stringify(scrollMemory));
        
        currentIndex = index;
        var story = seriesChapters[currentIndex];
        currentId = story.id;
        
        window.history.replaceState({}, '', 'read.html?id=' + currentId);
        
        showSkeleton();
        
        setTimeout(function() {
            renderChapterContent(story);
            window.scrollTo(0, 0);
        }, 150);
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            if (currentIndex > 0) goToChapter(currentIndex - 1);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            if (currentIndex < seriesChapters.length - 1) goToChapter(currentIndex + 1);
        });
    }

    if (backBtn) {
        backBtn.addEventListener('click', function() {
            scrollMemory[currentId] = window.scrollY;
            localStorage.setItem('scrollMemory', JSON.stringify(scrollMemory));
            window.location.href = 'index.html';
        });
    }

    // ========== OVERLAY DAFTAR BAB ==========
    if (chapterListBtn && chapterOverlay && overlayChapterList && closeOverlay) {
        chapterListBtn.addEventListener('click', function() {
            overlayChapterList.innerHTML = seriesChapters.map(function(s, i) {
                return '<div class="chapter-item' + (i === currentIndex ? ' active' : '') + '" data-id="' + s.id + '">' +
                    '<strong>' + s.id + '</strong>: ' + s.title + '</div>';
            }).join('');
            
            overlayChapterList.querySelectorAll('.chapter-item').forEach(function(item) {
                item.addEventListener('click', function() {
                    chapterOverlay.classList.remove('show');
                    var idx = seriesChapters.findIndex(function(s) { return s.id === item.dataset.id; });
                    if (idx >= 0) goToChapter(idx);
                });
            });
            
            chapterOverlay.classList.add('show');
        });

        closeOverlay.addEventListener('click', function() {
            chapterOverlay.classList.remove('show');
        });

        chapterOverlay.addEventListener('click', function(e) {
            if (e.target === chapterOverlay) chapterOverlay.classList.remove('show');
        });
    }

    // ========== AUTO HIDE HEADER/FOOTER ==========
    var lastScrollY = window.scrollY;
    var scrollTimeout;
    
    window.addEventListener('scroll', function() {
        var currentScroll = window.scrollY;
        
        if (currentScroll > lastScrollY && currentScroll > 100) {
            if (readHeader) readHeader.classList.add('hidden');
            if (readFooter) readFooter.classList.add('hidden');
        } else if (currentScroll < lastScrollY) {
            if (readHeader) readHeader.classList.remove('hidden');
            if (readFooter) readFooter.classList.remove('hidden');
        }
        
        lastScrollY = currentScroll;
        
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(function() {
            scrollMemory[currentId] = window.scrollY;
            localStorage.setItem('scrollMemory', JSON.stringify(scrollMemory));
        }, 500);
    });

    window.addEventListener('beforeunload', function() {
        scrollMemory[currentId] = window.scrollY;
        localStorage.setItem('scrollMemory', JSON.stringify(scrollMemory));
    });

    // ========== KEYBOARD ==========
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            if (currentIndex > 0) goToChapter(currentIndex - 1);
        }
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            if (currentIndex < seriesChapters.length - 1) goToChapter(currentIndex + 1);
        }
    });

    // ========== INIT ==========
    renderChapterContent(currentStory);
    updateBookmarkUI();
    console.log('Read siap! Series: ' + prefix + ', Chapter: ' + currentIndex);
});