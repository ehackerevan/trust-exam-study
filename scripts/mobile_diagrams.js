    const escapeDiagramText = value => String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);

    function diagramDetail(block) {
      return `<h4>${escapeDiagramText(block.title)}</h4>
        ${block.lines.map(line => `<p${line.emphasis ? ' class="mobile-diagram-emphasis"' : ''}>${escapeDiagramText(line.text)}</p>`).join('')}
        ${block.relation ? `<p class="mobile-diagram-relation">${escapeDiagramText(block.relation)}</p>` : ''}`;
    }

    function diagramFocusStyle(diagram, block) {
      const [width, height] = diagram.size;
      const [x, y, w, h] = block.bounds;
      return `left:${x / width * 100}%;top:${y / height * 100}%;width:${w / width * 100}%;height:${h / height * 100}%`;
    }

    function renderMobileDiagram(href, caption) {
      const filename = decodeURI(href).split('/').pop();
      const diagram = mobileDiagramData[filename];
      if (!diagram) return '';
      const selected = 0;
      return `<div class="mobile-diagram" data-filename="${escapeDiagramText(filename)}" data-selected="${selected}" role="group" aria-label="${escapeDiagramText(caption)}：圖解導覽">
        <p class="mobile-diagram-hint">點圖中區塊查看重點，也可從選單直接選擇。</p>
        <div class="mobile-diagram-overview" onclick="selectMobileDiagramPoint(this, event)">
          <img src="${href}" alt="${escapeDiagramText(caption)}：完整架構圖" loading="lazy" />
          <span class="mobile-diagram-focus" style="${diagramFocusStyle(diagram, diagram.blocks[selected])}" aria-hidden="true"></span>
        </div>
        <div class="mobile-diagram-controls">
          <button type="button" onclick="stepMobileDiagram(this, -1)" aria-label="上一個區塊">‹</button>
          <select aria-label="選擇圖中區塊" onchange="setMobileDiagramSelection(this.closest('.mobile-diagram'), Number(this.value))">
            ${diagram.blocks.map((block, index) => `<option value="${index}">${escapeDiagramText(block.title)}</option>`).join('')}
          </select>
          <button type="button" onclick="stepMobileDiagram(this, 1)" aria-label="下一個區塊">›</button>
        </div>
        <div class="mobile-diagram-detail" aria-live="polite">${diagramDetail(diagram.blocks[selected])}</div>
      </div>`;
    }

    function setMobileDiagramSelection(container, index) {
      const diagram = mobileDiagramData[container.dataset.filename];
      const selected = Math.max(0, Math.min(diagram.blocks.length - 1, index));
      container.dataset.selected = selected;
      container.querySelector('select').value = selected;
      container.querySelector('.mobile-diagram-focus').style.cssText = diagramFocusStyle(diagram, diagram.blocks[selected]);
      container.querySelector('.mobile-diagram-detail').innerHTML = diagramDetail(diagram.blocks[selected]);
    }

    function stepMobileDiagram(button, delta) {
      const container = button.closest('.mobile-diagram');
      const diagram = mobileDiagramData[container.dataset.filename];
      const next = (Number(container.dataset.selected) + delta + diagram.blocks.length) % diagram.blocks.length;
      setMobileDiagramSelection(container, next);
    }

    function selectMobileDiagramPoint(overview, event) {
      const container = overview.closest('.mobile-diagram');
      const diagram = mobileDiagramData[container.dataset.filename];
      const rect = overview.querySelector('img').getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width * diagram.size[0];
      const y = (event.clientY - rect.top) / rect.height * diagram.size[1];
      let best = 0;
      let distance = Infinity;
      diagram.blocks.forEach((block, index) => {
        const [bx, by, bw, bh] = block.bounds;
        const dx = Math.max(bx - x, 0, x - bx - bw);
        const dy = Math.max(by - y, 0, y - by - bh);
        const score = dx * dx + dy * dy;
        if (score < distance) {
          distance = score;
          best = index;
        }
      });
      setMobileDiagramSelection(container, best);
    }
