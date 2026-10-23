# Flappy Bird 2D Arcade + Leaderboard (Firestore + Firebase Hosting)

Game klon Flappy Bird yang berjalan di browser dengan leaderboard global disimpan di Firestore.

## Struktur

```
index.html
css/style.css
js/config.js       # Firebase config + konstanta game
js/firebase.js     # Inisialisasi Firebase (app, auth, db)
js/auth.js         # Anonymous auth + username (localStorage)
js/game.js         # Game loop, bird, pipes, fisika, kolisi, skor
js/ui.js           # Layar menu, input username, game over, leaderboard
js/leaderboard.js  # Ambil dan render skor dari Firestore
firebase.json      # Konfigurasi Firebase Hosting
firestore.rules    # Aturan keamanan Firestore
.gitignore
README.md
```

## Tech Stack

- Frontend: HTML5 + Vanilla JS + Canvas API
- Firebase JS SDK v9 (modular): Firestore + Anonymous Auth + Hosting
- Firebase Hosting untuk deployment statis

## Setup

1. Buat project Firebase di [Firebase Console](https://console.firebase.google.com) (akun `fkhr2nd@gmail.com`).
2. Aktifkan:
   - Firestore (Native Mode)
   - Firebase Hosting
   - Authentication > Anonymous
3. Salin `firebaseConfig` dari Project Settings > Your apps > Config ke `js/config.js` (ganti placeholder).
4. Install Firebase CLI:
   ```
   npm install -g firebase-tools
   firebase login
   firebase init   # pilih Hosting + Firestore, gunakan direktori ini sebagai public
   firebase deploy
   ```
5. Deploy aturan Firestore:
   ```
   firebase deploy --only firestore:rules
   ```

## Aturan Firestore

Lihat `firestore.rules`. Koleksi `scores` dan `players` dilindungi agar hanya user terautentikasi (Anonymous Auth) yang boleh menulis, dengan `request.auth.uid` yang cocok.

## Alur permainan

1. Pertama kali: layar input username -> simpan ke `localStorage`.
2. Kembali: langsung ke MENU tanpa input ulang.
3. Main -> GAME_OVER saat tabrak pipe, lantai, atau langit.
4. Skor > highscore tersimpan ke Firestore (best effort; tidak crash jika gagal).
5. Leaderboard Top 10 ditampilkan di MENU dan GAME_OVER, diurutkan skor menurun.

## Catatan

- Semua grafis digambar secara prosedural pada Canvas (tidak ada aset eksternal).
- Jika Firestore gagal (jaringan/rule), game tetap bisa dimainkan secara lokal.
- GitHub repo publik milik `fakhri24` perlu dibuat secara manual karena izin `git`/`gh` terbatas di lingkungan ini.
