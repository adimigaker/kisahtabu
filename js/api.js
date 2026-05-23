var API_CONFIG = {
  URL: 'https://script.google.com/macros/s/AKfycbwy_uZWnQVfOj_-UxjDUQsoduoc_rYzpKnc776J0nJZCgSaVqTnIY2WR0MzLjLW3DcW/exec',
  KEY: 'kisahtabu2026',
};

var API = {
  // Cache di localStorage
  _cache: null,
  _cacheTime: 0,
  _cacheDuration: 5 * 60 * 1000, // 5 menit

  async getAllStories(forceRefresh) {
    // Cek cache
    if (!forceRefresh && this._cache && (Date.now() - this._cacheTime < this._cacheDuration)) {
      console.log('📦 Pakai cache lokal');
      return this._cache;
    }

    // Cek localStorage
    var localCache = localStorage.getItem('stories_cache');
    var localTime = localStorage.getItem('stories_cache_time');
    
    if (!forceRefresh && localCache && localTime) {
      var age = Date.now() - parseInt(localTime);
      if (age < this._cacheDuration) {
        console.log('💾 Pakai localStorage cache (' + Math.round(age/1000) + 's lalu)');
        var data = JSON.parse(localCache);
        this._cache = data;
        this._cacheTime = parseInt(localTime);
        return data;
      }
    }

    // Fetch dari API
    try {
      console.log('🌐 Fetch dari API...');
      var res = await fetch(API_CONFIG.URL + '?action=list');
      var data = await res.json();
      var stories = data.data || [];
      
      // Simpan cache
      this._cache = stories;
      this._cacheTime = Date.now();
      localStorage.setItem('stories_cache', JSON.stringify(stories));
      localStorage.setItem('stories_cache_time', Date.now());
      
      console.log('✅ Data fetched: ' + stories.length + ' cerita');
      return stories;
    } catch (err) {
      console.error('❌ Fetch gagal, pakai cache lama');
      // Fallback ke cache localStorage
      if (localCache) return JSON.parse(localCache);
      // Fallback ke data.json
      try {
        var fallback = await fetch('data.json');
        return await fallback.json();
      } catch (e) {
        return [];
      }
    }
  },

  async saveStory(storyData) {
    try {
      var res = await fetch(API_CONFIG.URL + '?action=save&key=' + API_CONFIG.KEY, {
        method: 'POST',
        body: JSON.stringify(storyData),
      });
      var result = await res.json();
      
      // Invalidate cache setelah save
      if (result.success) {
        this._cache = null;
        localStorage.removeItem('stories_cache');
        localStorage.removeItem('stories_cache_time');
      }
      
      return result;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async deleteStory(id) {
    try {
      var res = await fetch(API_CONFIG.URL + '?action=delete&key=' + API_CONFIG.KEY, {
        method: 'POST',
        body: JSON.stringify({ id: id }),
      });
      var result = await res.json();
      
      // Invalidate cache
      if (result.success) {
        this._cache = null;
        localStorage.removeItem('stories_cache');
        localStorage.removeItem('stories_cache_time');
      }
      
      return result;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async uploadImage(file) {
    return new Promise(function(resolve) {
      var reader = new FileReader();
      reader.onload = async function() {
        try {
          var base64 = reader.result.split(',')[1];
          var res = await fetch(API_CONFIG.URL + '?action=uploadImage&key=' + API_CONFIG.KEY, {
            method: 'POST',
            body: JSON.stringify({ image: base64, fileName: 'img_' + Date.now() + '.jpg' }),
          });
          resolve(await res.json());
        } catch (err) {
          resolve({ success: false, error: err.message });
        }
      };
      reader.readAsDataURL(file);
    });
  },
};