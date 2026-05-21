// =============================================
// KONFIGURASI API
// =============================================
var API_CONFIG = {
  URL: 'https://script.google.com/macros/s/AKfycbwy_uZWnQVfOj_-UxjDUQsoduoc_rYzpKnc776J0nJZCgSaVqTnIY2WR0MzLjLW3DcW/exec',
  KEY: 'kisahtabu2026',
};

// =============================================
// API FUNCTIONS
// =============================================
var API = {
  // GET semua cerita
  getAllStories: async function() {
    try {
      console.log('Fetching stories...');
      var res = await fetch(API_CONFIG.URL + '?action=list');
      var text = await res.text();
      console.log('Raw response:', text);
      var data = JSON.parse(text);
      console.log('Parsed:', data);
      return data.data || [];
    } catch (err) {
      console.error('Gagal fetch:', err.message);
      return [];
    }
  },

  // GET satu cerita
  getStory: async function(id) {
    try {
      var res = await fetch(API_CONFIG.URL + '?action=get&id=' + encodeURIComponent(id));
      var data = JSON.parse(await res.text());
      return data.data || null;
    } catch (err) {
      console.error('Gagal fetch story:', err.message);
      return null;
    }
  },

  // GET daftar chapter
  getChapterList: async function(storyId) {
    try {
      var res = await fetch(API_CONFIG.URL + '?action=chapterList&id=' + encodeURIComponent(storyId));
      var data = JSON.parse(await res.text());
      return data.data || [];
    } catch (err) {
      console.error('Gagal fetch chapter list:', err.message);
      return [];
    }
  },

  // GET konten chapter
  getChapter: async function(storyId, chapterNum) {
    try {
      var res = await fetch(API_CONFIG.URL + '?action=chapter&id=' + encodeURIComponent(storyId) + '&chapter=' + chapterNum);
      var data = JSON.parse(await res.text());
      return data.data || null;
    } catch (err) {
      console.error('Gagal fetch chapter:', err.message);
      return null;
    }
  },

  // POST simpan cerita
  saveStory: async function(storyData) {
    try {
      console.log('Saving story:', storyData.id);
      var res = await fetch(API_CONFIG.URL + '?action=save&key=' + API_CONFIG.KEY, {
        method: 'POST',
        body: JSON.stringify(storyData),
      });
      var data = JSON.parse(await res.text());
      console.log('Save result:', data);
      return data;
    } catch (err) {
      console.error('Gagal simpan:', err.message);
      return { success: false, error: err.message };
    }
  },

  // POST hapus cerita
  deleteStory: async function(id) {
    try {
      var res = await fetch(API_CONFIG.URL + '?action=delete&key=' + API_CONFIG.KEY, {
        method: 'POST',
        body: JSON.stringify({ id: id }),
      });
      var data = JSON.parse(await res.text());
      return data;
    } catch (err) {
      console.error('Gagal hapus:', err.message);
      return { success: false, error: err.message };
    }
  },

  // POST upload gambar
  uploadImage: async function(file) {
    return new Promise(function(resolve) {
      var reader = new FileReader();
      reader.onload = async function() {
        try {
          var base64 = reader.result.split(',')[1];
          var res = await fetch(API_CONFIG.URL + '?action=uploadImage&key=' + API_CONFIG.KEY, {
            method: 'POST',
            body: JSON.stringify({
              image: base64,
              fileName: 'kisahtabu_' + Date.now() + '.jpg',
            }),
          });
          var data = JSON.parse(await res.text());
          if (data.success) {
            resolve({ success: true, url: data.url });
          } else {
            resolve({ success: false, error: data.error });
          }
        } catch (err) {
          resolve({ success: false, error: err.message });
        }
      };
      reader.readAsDataURL(file);
    });
  },
};