// Cross-platform APK build: expo prebuild + gradle assembleRelease.
// Works on Windows (gradlew.bat) and macOS/Linux (./gradlew).
const { execSync } = require('child_process');
const path = require('path');

const mobileDir = path.join(__dirname, '..');
const androidDir = path.join(mobileDir, 'android');

execSync('npx expo prebuild -p android', { stdio: 'inherit', cwd: mobileDir });

const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
execSync(`${gradlew} assembleRelease`, { stdio: 'inherit', cwd: androidDir });

console.log('\n✅ APK gerado em: ' + path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk'));
