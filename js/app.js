const databaseCerita = JSON.parse(localStorage.getItem('database_cerita')) || [];
const appContent = document.getElementById('app-content');

// Fungsi menampilkan daftar cerita (Bisa disaring berdasarkan kode seri tertentu)
function tampilkanDaftarCerita(filterSeries = null) {
    appContent.innerHTML = '';

    // Filter data jika pembaca meminta daftar seri spesifik
    let ceritaDitampilkan = databaseCerita;
    if (filterSeries) {
        ceritaDitampilkan = databaseCerita.filter(s => s.series === filterSeries);
    }

    if (ceritaDitampilkan.length === 0) {
        appContent.innerHTML = `
            <div class="story-card" style="text-align: center; color: #6c757d; padding: 40px 20px;">
                <h2>Belum Ada Cerita</h2>
                <p>Silakan isi cerita di halaman admin terlebih dahulu.</p>
            </div>
        `;
        return;
    }

    // Urutkan cerita berdasarkan seri dan bab sebelum dicetak ke layar
    ceritaDitampilkan.sort((a, b) => a.series.localeCompare(b.series) || a.chapter - b.chapter);

    // Jika sedang dalam mode filter seri, tambahkan tombol lepas filter di atas
    if (filterSeries) {
        const backHeader = document.createElement('div');
        backHeader.style = 'margin-bottom: 15px; font-weight: bold; color: #4f46e5; cursor:pointer;';
        backHeader.innerHTML = `⬅ Menampilkan Seri ${filterSeries} (Klik untuk lihat semua cerita)`;
        backHeader.onclick = () => tampilkanDaftarCerita();
        appContent.appendChild(backHeader);
    }

    ceritaDitampilkan.forEach(story => {
        const card = document.createElement('article');
        card.className = 'story-card';
        card.style = 'display: flex; gap: 15px; align-items: flex-start;'; // Layout menyamping ala aplikasi berita
        
        // Cek apakah ada gambar cover, jika tidak ada pakai gambar abu-abu standar
        const gambarCover = story.cover ? story.cover : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="110" style="background:%23ccc"></svg>';

        card.innerHTML = `
            <img src="${gambarCover}" style="width: 85px; height: 120px; object-fit: cover; border-radius: 6px; box-shadow: 0 2px 5px rgba(0,0,0,0.15);">
            <div style="flex: 1;">
                <span style="font-size: 0.75rem; background: #e0e7ff; color: #4f46e5; padding: 3px 8px; border-radius: 20px; font-weight: bold;">[${story.series}] Bab ${story.chapter}</span>
                <h2 style="font-size: 1.15rem; margin-top: 6px; line-height: 1.3;">${story.title}</h2>
                <p style="color: #6c757d; font-size: 0.85rem; margin-top: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${story.excerpt}</p>
                <button onclick="bukaHalamanBaca('${story.id}')" style="background:#4f46e5; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; margin-top:10px; font-size:0.85rem; font-weight:bold;">Baca</button>
            </div>
        `;
        appContent.appendChild(card);
    });
}

// Fungsi Mode Membaca Cerita dengan Navigasi Chapter bersambung
window.bukaHalamanBaca = function(storyId) {
    const ceritaSkarang = databaseCerita.find(s => s.id === storyId);
    if (!ceritaSkarang) return;

    // Cari saudara-saudara bab dari seri yang sama, lalu urutkan sesuai nomor bab
    const satuSeri = databaseCerita.filter(s => s.series === ceritaSkarang.series)
                                   .sort((a, b) => a.chapter - b.chapter);

    // Cari posisi index bab saat ini di dalam seri tersebut
    const indexSkarang = satuSeri.findIndex(s => s.id === storyId);

    // Tentukan tombol navigasi apakah ada bab sebelum atau sesudahnya
    const babSebelumnya = satuSeri[indexSkarang - 1];
    const babSelanjutnya = satuSeri[indexSkarang + 1];

    const gambarCover = ceritaSkarang.cover ? `<center><img src="${ceritaSkarang.cover}" style="width: 150px; height: 210px; object-fit: cover; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);"></center>` : '';

    appContent.innerHTML = `
        <article class="reading-mode" style="max-width: 600px; margin: 0 auto; padding: 5px 5px 40px 5px;">
            <button onclick="tampilkanDaftarCerita()" style="background:none; border:none; color:#4f46e5; cursor:pointer; margin-bottom:25px; font-weight:bold; font-size:1rem;">⬅ Utama</button>
            
            ${gambarCover}
            
            <center><span style="font-size: 0.85rem; background: #e0e7ff; color: #4f46e5; padding: 4px 12px; border-radius: 20px; font-weight: bold;">[${ceritaSkarang.series}] Bab ${ceritaSkarang.chapter}</span></center>
            <h1 style="font-size: 2rem; text-align:center; margin: 15px 0 25px 0; color:#212529; font-family: serif; line-height:1.3;">${ceritaSkarang.title}</h1>
            
            <hr style="border: 0; border-top: 1px solid #e9ecef; margin-bottom: 25px;">
            <div style="font-family: 'Georgia', serif; font-size: 1.25rem; line-height: 1.9; color: #2d3748; white-space: pre-wrap; letter-spacing: 0.01em; padding: 0 10px;">${ceritaSkarang.content}</div>
            
            <!-- Sistem Navigasi Pintar di Bawah Cerita -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 50px; gap: 10px; padding: 0 10px;">
                
                <button ${babSebelumnya ? `onclick="bukaHalamanBaca('${babSebelumnya.id}')"` : 'disabled'} 
                        style="flex:1; padding:12px; border-radius:8px; border:1px solid #ddd; background:${babSebelumnya ? '#fff' : '#f3f4f6'}; color:${babSebelumnya ? '#212529' : '#9ca3af'}; font-weight:bold; cursor:pointer;">
                    ⏮️ Prev
                </button>

                <button onclick="tampilkanDaftarCerita('${ceritaSkarang.series}')" 
                        style="flex:1; padding:12px; border-radius:8px; border:1px solid #4f46e5; background:#e0e7ff; color:#4f46e5; font-weight:bold; cursor:pointer;">
                    📋 List Seri
                </button>

                <button ${babSelanjutnya ? `onclick="bukaHalamanBaca('${babSelanjutnya.id}')"` : 'disabled'} 
                        style="flex:1; padding:12px; border-radius:8px; border:none; background:${babSelanjutnya ? '#4f46e5' : '#e5e7eb'}; color:${babSelanjutnya ? '#fff' : '#9ca3af'}; font-weight:bold; cursor:pointer;">
                    Next ⏭️
                </button>

            </div>
        </article>
    `;

    window.scrollTo(0, 0);

    // Aktifkan fitur ingatan scroll otomatis untuk bab ini
    if (typeof MemoryScroll !== 'undefined') {
        MemoryScroll.simpanPosisi(storyId);
        setTimeout(() => {
            MemoryScroll.kembalikanPosisi(storyId);
        }, 400);
    }
};

document.addEventListener('DOMContentLoaded', () => tampilkanDaftarCerita());
