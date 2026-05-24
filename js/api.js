var API_CONFIG = {
  URL: 'https://script.google.com/macros/s/AKfycbwy_uZWnQVfOj_-UxjDUQsoduoc_rYzpKnc776J0nJZCgSaVqTnIY2WR0MzLjLW3DcW/exec',
  KEY: 'kisahtabu2026',
};

var API = {
  _cache: null,
  _cacheTime: 0,
  _cacheDuration: 5 * 60 * 1000,

  // GET metadata semua cerita (tanpa konten)
  getAllStories: async function(forceRefresh) {
    if (!forceRefresh && this._cache && (Date.now() - this._cacheTime < this._cacheDuration)) {
      return this._cache;
    }
    
    var localCache = localStorage.getItem('stories_cache');
    var localTime = localStorage.getItem('stories_cache_time');
    
    if (!forceRefresh && localCache && localTime) {
      var age = Date.now() - parseInt(localTime);
      if (age < this._cacheDuration) {
        var data = JSON.parse(localCache);
        this._cache = data;
        this._cacheTime = parseInt(localTime);
        return data;
      }
    }

    try {
      var res = await fetch(API_CONFIG.URL + '?action=list');
      var data = await res.json();
      var stories = data.data || [];
      
      this._cache = stories;
      this._cacheTime = Date.now();
      localStorage.setItem('stories_cache', JSON.stringify(stories));
      localStorage.setItem('stories_cache_time', Date.now());
      
      return stories;
    } catch (err) {
      if (localCache) return JSON.parse(localCache);
      return [];
    }
  },

  // GET konten full 1 cerita
  getStoryFull: async function(id) {
    try {
      var res = await fetch(API_CONFIG.URL + '?action=getFull&id=' + encodeURIComponent(id));
      var data = await res.json();
      return data.data || null;
    } catch (err) {
      return null;
    }
  },

  saveStory: async function(storyData) {
    try {
      var res = await fetch(API_CONFIG.URL + '?action=save&key=' + API_CONFIG.KEY, {
        method: 'POST',
        body: JSON.stringify(storyData),
      });
      var result = await res.json();
      
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

  deleteStory: async function(id) {
    try {
      var res = await fetch(API_CONFIG.URL + '?action=delete&key=' + API_CONFIG.KEY, {
        method: 'POST',
        body: JSON.stringify({ id: id }),
      });
      var result = await res.json();
      
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

  uploadImage: async function(file) {
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