# Hanafuda Bot

Repositori ini berisi beberapa bot otomatisasi untuk Hanafuda (deposit, draw, grow). Anda dapat menjalankan bot secara manual, menggunakan Docker, atau Docker Compose.

---

## Daftar Isi
- [Prasyarat](#prasyarat)
- [Konfigurasi Akun (`config.json`)](#konfigurasi-akun-configjson)
- [Menjalankan Secara Manual](#menjalankan-secara-manual)
- [Menjalankan dengan Docker](#menjalankan-dengan-docker)
- [Menjalankan dengan Docker Compose](#menjalankan-dengan-docker-compose)
- [Struktur Project](#struktur-project)

---

## Prasyarat
- Node.js (disarankan versi 16.x atau lebih baru)
- npm
- Docker & Docker Compose (jika ingin menggunakan Docker)

---

## Konfigurasi Akun (`config.json`)
Sebelum menjalankan bot, pastikan Anda sudah memiliki file `config.json` di root folder. File ini berisi array akun dengan format seperti berikut:

```json
[
  {
    "refreshToken": "...",
    "authToken": "...",
    "privateKey": "...",
    "userName": "...",
    "proxy": "http://user:pass@host:port",
    "proxy2": "http://user:pass@host:port",
    "isActive": true,
    "isActiveDeposit": true,
    "userAgent": "..."
  }
]
```

- **refreshToken** dan **authToken**: Token autentikasi akun.
- **privateKey**: Private key wallet (hanya untuk deposit).
- **proxy** dan **proxy2**: (Opsional) Proxy utama dan cadangan.
- **isActive**: Status aktif akun.
- **isActiveDeposit**: Status aktif untuk fitur deposit.
- **userAgent**: User agent yang digunakan.

> **Catatan:** Anda bisa mengisi beberapa akun sekaligus dalam array.

---

## Menjalankan Secara Manual

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Jalankan salah satu bot:**
   ```bash
   node deposit.js
   # atau
   node draw.js
   # atau
   node grow_all.js
   ```

---

## Menjalankan dengan Docker

### Build Docker image:
```bash
docker build -t hanafuda:latest .
```

### Jalankan container (default: draw.js):
```bash
docker run --rm -it -v $(pwd)/config.json:/app/config.json hanafuda:latest
```

### Jalankan file tertentu:
```bash
docker run --rm -it -v $(pwd)/config.json:/app/config.json hanafuda:latest node deposit.js
# atau
# docker run --rm -it -v $(pwd)/config.json:/app/config.json hanafuda:latest node grow_all.js
```

---

## Menjalankan dengan Docker Compose

Terdapat 3 service di `docker-compose.yml`:
- **draw** (menjalankan `draw.js`)
- **grow** (menjalankan `grow_all.js`)
- **deposit** (menjalankan `deposit.js`)

### Jalankan semua service:
```bash
docker-compose up
```

### Jalankan service tertentu saja:
```bash
docker-compose up -d draw
# atau
docker-compose up -d grow
# atau
docker-compose up -d deposit
```

### Jalankan di background (detached mode):
```bash
docker-compose up -d
```

### Hentikan semua service:
```bash
docker-compose down
```

> **Pastikan file `config.json` sudah ada di root folder sebelum menjalankan Docker Compose.**

---

## Struktur Project
- `deposit.js`, `draw.js`, `grow_all.js`: Script utama bot.
- `Dockerfile`: Konfigurasi Docker.
- `docker-compose.yml`: Konfigurasi multi-container.
- `config.json`: Konfigurasi akun-akun bot.
- `user_status/`: Folder status user.
- `package.json`: Daftar dependencies.

---

## Catatan
- Pastikan environment variable/token yang dibutuhkan sudah diisi di `config.json`.
- Untuk pengaturan lebih lanjut, cek masing-masing file script. 