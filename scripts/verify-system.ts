import * as dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SystemVerificationService } from '../src/core/verification/system-verification.service';

dotenv.config();

async function verifySystem() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🔍 AyazTrade Sistem Doğrulama 🔍                           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);

  try {
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    const verificationService = app.get(SystemVerificationService);

    console.log('Sistem doğrulaması başlatılıyor...\n');

    const args = process.argv.slice(2);
    const parsedArgs = parseCliArgs(args);

    const deepCheck = getBooleanFlag(parsedArgs, 'deepCheck', true);
    const skipReports = getBooleanFlag(parsedArgs, 'skipReports', false);
    const confirmModules = getBooleanFlag(parsedArgs, 'confirmModules', true);
    const testRealConnections = getBooleanFlag(parsedArgs, 'testRealConnections', true);

    const report = await verificationService.verify({
      deepCheck,
      skipReports,
      confirmModules,
      testRealConnections,
    });

    // Sonuçları göster
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 DOĞRULAMA RAPORU');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`Sistem: ${report.system}`);
    console.log(`Zaman: ${report.timestamp}`);
    console.log(`Genel Durum: ${getStatusEmoji(report.overallStatus)} ${report.overallStatus.toUpperCase()}\n`);

    console.log('📈 ÖZET:');
    console.log(`   Toplam Kontrol: ${report.summary.total}`);
    console.log(`   ✅ Başarılı: ${report.summary.passed}`);
    console.log(`   ❌ Başarısız: ${report.summary.failed}`);
    console.log(`   ⚠️  Uyarılar: ${report.summary.warnings}\n`);

    // Modül Durumları
    if (report.modules.length > 0) {
      console.log('📦 MODÜLLER:');
      report.modules.forEach((module) => {
        const emoji = module.status === 'pass' ? '✅' : module.status === 'fail' ? '❌' : '⚠️';
        console.log(`   ${emoji} ${module.module}: ${module.message}`);
        if (module.responseTime) {
          console.log(`      ⏱️  Yanıt Süresi: ${module.responseTime}ms`);
        }
      });
      console.log('');
    }

    // Bağlantı Durumları
    if (report.connections.length > 0) {
      console.log('🔌 BAĞLANTILAR:');
      report.connections.forEach((conn) => {
        const emoji = conn.status === 'pass' ? '✅' : conn.status === 'fail' ? '❌' : '⚠️';
        console.log(`   ${emoji} ${conn.module}: ${conn.message}`);
        if (conn.responseTime) {
          console.log(`      ⏱️  Yanıt Süresi: ${conn.responseTime}ms`);
        }
        if (conn.details) {
          Object.entries(conn.details).forEach(([key, value]) => {
            if (key !== 'error') {
              console.log(`      📋 ${key}: ${value}`);
            }
          });
        }
      });
      console.log('');
    }

    // Konfigürasyon Durumları
    if (report.configuration.length > 0) {
      console.log('⚙️  KONFİGÜRASYON:');
      const failedConfigs = report.configuration.filter(c => c.status === 'fail');
      const passedConfigs = report.configuration.filter(c => c.status === 'pass');
      
      if (failedConfigs.length > 0) {
        console.log('   ❌ Eksik/Başarısız Konfigürasyonlar:');
        failedConfigs.forEach((config) => {
          console.log(`      - ${config.module}: ${config.message}`);
        });
      }
      
      if (passedConfigs.length > 0) {
        console.log(`   ✅ Doğrulanmış Konfigürasyonlar: ${passedConfigs.length}`);
      }
      console.log('');
    }

    // Hata Detayları
    const failures = [
      ...report.modules.filter(m => m.status === 'fail'),
      ...report.connections.filter(c => c.status === 'fail'),
      ...report.configuration.filter(c => c.status === 'fail'),
    ];

    if (failures.length > 0) {
      console.log('🚨 BAŞARISIZ KONTROLLER:');
      failures.forEach((failure) => {
        console.log(`   ❌ ${failure.module}: ${failure.message}`);
        if (failure.details?.error) {
          console.log(`      Hata: ${failure.details.error}`);
        }
      });
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════\n');

    await app.close();

    // Çıkış kodu
    process.exit(report.overallStatus === 'healthy' ? 0 : 1);
  } catch (error) {
    console.error('❌ Sistem doğrulaması sırasında hata oluştu:', error);
    process.exit(1);
  }
}

function parseCliArgs(argv: string[]) {
  const result: Record<string, string | boolean> = {};
  for (const rawArg of argv) {
    if (!rawArg.startsWith('--')) continue;

    // --no-flag formu
    if (rawArg.startsWith('--no-')) {
      const key = rawArg.slice(5);
      if (key) result[key] = 'false';
      continue;
    }

    const withoutPrefix = rawArg.slice(2);
    const eqIndex = withoutPrefix.indexOf('=');
    if (eqIndex === -1) {
      // --flag (varsayılan true)
      result[withoutPrefix] = 'true';
    } else {
      const key = withoutPrefix.slice(0, eqIndex);
      const value = withoutPrefix.slice(eqIndex + 1);
      if (key) result[key] = value;
    }
  }
  return result;
}

function getBooleanFlag(map: Record<string, string | boolean>, key: string, defaultValue: boolean): boolean {
  const raw = map[key];
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') {
    const normalized = raw.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }
  return defaultValue;
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'healthy':
      return '✅';
    case 'degraded':
      return '⚠️';
    case 'unhealthy':
      return '❌';
    default:
      return '❓';
  }
}

verifySystem();

