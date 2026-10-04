const fs = require('fs');

const files = [
  'index.html',
  '信託業務人員重點教材/index.html'
];

files.forEach(fp => {
  let content = fs.readFileSync(fp, 'utf8');

  // 1. 修正 CSS: 同時支援 .lightbox-modal.active 與 .lightbox-modal.open
  content = content.replace(
    '.lightbox-modal.active {',
    '.lightbox-modal.active,\n    .lightbox-modal.open {'
  );
  content = content.replace(
    '.sidebar-overlay.active {',
    '.sidebar-overlay.active,\n    .sidebar-overlay.open {'
  );

  // 2. 替換整套燈箱 JS 函式 (包含 openImageLightbox, closeImageLightbox, zoomLightboxImage, resetLightboxImage, openImageInNewTab)
  const lightboxJsPattern = /\/\/ ==================== 圖片燈箱 \(Lightbox\) ====================[\s\S]*?\/\/ ==================== 章節載入與切換/;
  
  const newLightboxJs = `// ==================== 圖片燈箱 (Lightbox 健全完整版) ====================
    let currentScale = 1.0;
    let currentImgSrc = '';

    function openImageLightbox(src, caption) {
      currentImgSrc = src;
      const modal = document.getElementById('imageLightboxModal');
      const img = document.getElementById('lightboxImg');
      const titleEl = document.getElementById('lightboxTitle');
      if (!modal || !img) return;

      img.src = src;
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = caption || '檢視大圖';
      const cleanCaption = tempDiv.textContent || tempDiv.innerText || '';
      if (titleEl) {
        titleEl.innerHTML = \`<span>🔍 \${cleanCaption}</span>\`;
      }
      currentScale = 1.0;
      img.style.transform = 'scale(1.0)';
      modal.classList.add('active', 'open');
    }

    function closeImageLightbox() {
      const modal = document.getElementById('imageLightboxModal');
      const img = document.getElementById('lightboxImg');
      if (modal) modal.classList.remove('active', 'open');
      if (img) img.src = '';
    }

    function zoomLightboxImage(factor) {
      const img = document.getElementById('lightboxImg');
      if (!img) return;
      currentScale = Math.max(0.4, Math.min(4.0, currentScale * factor));
      img.style.transform = \`scale(\${currentScale})\`;
    }

    function resetLightboxImage() {
      const img = document.getElementById('lightboxImg');
      if (!img) return;
      currentScale = 1.0;
      img.style.transform = 'scale(1.0)';
    }

    function openImageInNewTab() {
      if (currentImgSrc) window.open(currentImgSrc, '_blank');
    }

    const zoomImage = zoomLightboxImage;

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeImageLightbox();
    });

    const lightboxModal = document.getElementById('imageLightboxModal');
    if (lightboxModal) {
      lightboxModal.addEventListener('click', (e) => {
        if (e.target === lightboxModal || e.target.id === 'lightboxBody') {
          closeImageLightbox();
        }
      });
    }

    // ==================== 章節載入與切換`;

  if (lightboxJsPattern.test(content)) {
    content = content.replace(lightboxJsPattern, newLightboxJs);
    console.log(`[${fp}] Replaced lightbox JS functions successfully!`);
  } else {
    console.warn(`[${fp}] Lightbox JS pattern not matched!`);
  }

  // 3. 在全域函式掛載處確保掛載 zoomLightboxImage 與 resetLightboxImage
  if (!content.includes('window.zoomLightboxImage = zoomLightboxImage;')) {
    content = content.replace(
      'window.openImageInNewTab = openImageInNewTab;',
      'window.openImageInNewTab = openImageInNewTab;\n    window.zoomLightboxImage = zoomLightboxImage;\n    window.resetLightboxImage = resetLightboxImage;'
    );
    console.log(`[${fp}] Added global exports for zoomLightboxImage and resetLightboxImage!`);
  }

  fs.writeFileSync(fp, content, 'utf8');
});

console.log('All lightbox fixes applied.');
