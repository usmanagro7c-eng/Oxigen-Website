const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();

  const html = `
  <!DOCTYPE html>
  <html>
  <body>
    <script>
      function extractBottleBFS(imgSrc) {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const d = imgData.data;
            const w = canvas.width;
            const h = canvas.height;

            const visited = new Uint8Array(w * h);
            const queue = [];

            // Add all perimeter pixels that are near white or light grey
            function isBg(idx) {
              const r = d[idx * 4];
              const g = d[idx * 4 + 1];
              const b = d[idx * 4 + 2];
              // Background is white / near white (>238)
              return r > 238 && g > 238 && b > 238;
            }

            for (let x = 0; x < w; x++) {
              if (isBg(x)) { queue.push(x); visited[x] = 1; }
              const bottomIdx = (h - 1) * w + x;
              if (isBg(bottomIdx)) { queue.push(bottomIdx); visited[bottomIdx] = 1; }
            }
            for (let y = 0; y < h; y++) {
              const leftIdx = y * w;
              if (isBg(leftIdx)) { queue.push(leftIdx); visited[leftIdx] = 1; }
              const rightIdx = y * w + (w - 1);
              if (isBg(rightIdx)) { queue.push(rightIdx); visited[rightIdx] = 1; }
            }

            // BFS Flood Fill from outside
            let head = 0;
            while (head < queue.length) {
              const curr = queue[head++];
              const cx = curr % w;
              const cy = Math.floor(curr / w);

              const neighbors = [
                cx > 0 ? curr - 1 : -1,
                cx < w - 1 ? curr + 1 : -1,
                cy > 0 ? curr - w : -1,
                cy < h - 1 ? curr + w : -1
              ];

              for (const n of neighbors) {
                if (n !== -1 && !visited[n] && isBg(n)) {
                  visited[n] = 1;
                  queue.push(n);
                }
              }
            }

            // Make all visited outside pixels transparent
            for (let i = 0; i < w * h; i++) {
              if (visited[i]) {
                const r = d[i * 4];
                const g = d[i * 4 + 1];
                const b = d[i * 4 + 2];
                if (r > 248 && g > 248 && b > 248) {
                  d[i * 4 + 3] = 0;
                } else {
                  // Soft edge anti-aliasing
                  const avg = (r + g + b) / 3;
                  const alpha = Math.max(0, Math.min(255, (248 - avg) * 20));
                  d[i * 4 + 3] = alpha;
                }
              }
            }

            ctx.putImageData(imgData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          };
          img.src = imgSrc;
        });
      }
    </script>
  </body>
  </html>
  `;

  await page.setContent(html);

  const nutriceptRaw = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, 'public/products/nutricept-new-packaging.jpeg')).toString('base64');
  const oxidopRaw = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, 'public/products/oxidop-new-packaging.jpeg')).toString('base64');

  const nutriceptPng = await page.evaluate((src) => extractBottleBFS(src), nutriceptRaw);
  const oxidopPng = await page.evaluate((src) => extractBottleBFS(src), oxidopRaw);

  fs.writeFileSync(path.join(__dirname, 'public/products/nutricept-transparent.png'), Buffer.from(nutriceptPng.split(',')[1], 'base64'));
  fs.writeFileSync(path.join(__dirname, 'public/products/oxidop-transparent.png'), Buffer.from(oxidopPng.split(',')[1], 'base64'));

  console.log('Saved perfect BFS-extracted transparent bottle PNGs!');
  await browser.close();
})();
