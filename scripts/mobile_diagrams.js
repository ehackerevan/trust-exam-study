    function renderMobileDiagram(href, caption) {
      const filename = decodeURI(href).split('/').pop();
      const blocks = mobileDiagramData[filename];
      if (!blocks) return '';
      const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      })[char]);
      return `<div class="mobile-diagram" role="group" aria-label="${escapeHtml(caption)}：手機閱讀版">
        ${blocks.map(block => `<section class="mobile-diagram-card">
          <h4>${escapeHtml(block.title)}</h4>
          ${block.lines.map(line => `<p${line.emphasis ? ' class="mobile-diagram-emphasis"' : ''}>${escapeHtml(line.text)}</p>`).join('')}
          ${block.relation ? `<p class="mobile-diagram-relation">${escapeHtml(block.relation)}</p>` : ''}
        </section>`).join('')}
      </div>`;
    }
