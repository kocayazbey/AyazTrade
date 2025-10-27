# ⛔ NPM YASAK

## BU PROJEYE npm/pnpm KURMAYIN!

**Sebep:** 
- Proje Docker ile çalışır
- Sadece postgres ve redis Docker'da çalışır
- Backend'i ayrıca kurmaya gerek yok

**YAPMA:**
- `npm install` ❌
- `pnpm install` ❌
- `yarn install` ❌
- node_modules klasörü oluşturmak ❌

**YAP:**
- Docker container'ları çalıştır: `docker-compose up -d postgres redis` ✅
- Kodları push et ✅

**Not:** Backend başlatmak için Codespaces veya başka bir online platform kullan!

