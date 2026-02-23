#!/usr/bin/env node

/**
 * Tesseract 언어 데이터 파일 자동 다운로드 스크립트
 * npm install 시 자동으로 실행됩니다.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const TESSDATA_DIR = path.join(__dirname, '..', 'public', 'tessdata');
const FILES = [
  {
    name: 'kor.traineddata',
    url: 'https://github.com/tesseract-ocr/tessdata/raw/main/kor.traineddata',
  },
  {
    name: 'eng.traineddata',
    url: 'https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata',
  },
];

// 디렉토리 생성
if (!fs.existsSync(TESSDATA_DIR)) {
  fs.mkdirSync(TESSDATA_DIR, { recursive: true });
  console.log('✓ Created tessdata directory');
}

// 파일 다운로드 함수
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);

    https.get(url, (response) => {
      // 리다이렉트 처리
      if (response.statusCode === 302 || response.statusCode === 301) {
        downloadFile(response.headers.location, destPath)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;

      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        const percent = ((downloadedSize / totalSize) * 100).toFixed(1);
        process.stdout.write(`\r  Downloading ${path.basename(destPath)}: ${percent}%`);
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(''); // 새 줄
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

// 메인 실행
async function main() {
  console.log('🔍 Checking Tesseract language data files...\n');

  for (const fileInfo of FILES) {
    const filePath = path.join(TESSDATA_DIR, fileInfo.name);

    if (fs.existsSync(filePath)) {
      console.log(`✓ ${fileInfo.name} already exists`);
      continue;
    }

    console.log(`⬇️  Downloading ${fileInfo.name}...`);
    try {
      await downloadFile(fileInfo.url, filePath);
      console.log(`✓ ${fileInfo.name} downloaded successfully`);
    } catch (error) {
      console.error(`✗ Failed to download ${fileInfo.name}:`, error.message);
      process.exit(1);
    }
  }

  console.log('\n✅ All Tesseract language data files are ready!\n');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
