    // 教材圖解的文字取自校訂後的 SVG，頁面以 HTML/CSS 呈現，不依賴圖檔縮放。
    const escapeDiagramText = value => String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);

    function diagramLines(lines) {
      if (!lines.length) return '';
      return `<ul class="study-diagram-lines">${lines.map(line => {
        const value = line.text.replace(/^\s*•\s*/, '').trim();
        return `<li${line.emphasis ? ' class="study-diagram-emphasis"' : ''}>${escapeDiagramText(value)}</li>`;
      }).join('')}</ul>`;
    }

    function diagramNode(block) {
      return `<section class="study-diagram-node">
        <h4>${escapeDiagramText(block.title)}</h4>
        ${diagramLines(block.lines)}
        ${block.relation ? `<p class="study-diagram-relation">${escapeDiagramText(block.relation)}</p>` : ''}
      </section>`;
    }

    function classificationDiagram(blocks) {
      const items = [...blocks];
      const root = items[0] && !items[0].lines.length ? items.shift() : null;
      const groups = [];
      let current;
      for (const block of items) {
        if (!block.lines.length) {
          current = { title: block.title, children: [] };
          groups.push(current);
        } else {
          if (!current) {
            current = { title: '', children: [] };
            groups.push(current);
          }
          current.children.push(block);
        }
      }
      return `${root ? `<p class="study-diagram-root">${escapeDiagramText(root.title)}</p>` : ''}
        <div class="study-diagram-groups">${groups.map(group => `<section class="study-diagram-group">
          ${group.title ? `<h3>${escapeDiagramText(group.title)}</h3>` : ''}
          <div class="study-diagram-children">${group.children.map(diagramNode).join('')}</div>
        </section>`).join('')}</div>`;
    }

    function comparisonDiagram(blocks) {
      const items = [...blocks];
      const root = items[0] && !items[0].lines.length ? items.shift() : null;
      return `${root ? `<p class="study-diagram-root">${escapeDiagramText(root.title)}</p>` : ''}
        <div class="study-diagram-panels">${items.map(diagramNode).join('')}</div>`;
    }

    function numberedComparison(blocks) {
      // REITs / REATs 原圖逐項對照，手機依比較項目排列，避免來回找兩欄。
      const sides = blocks.map(block => {
        const entries = [];
        for (let i = 0; i < block.lines.length; i += 2) {
          entries.push({ label: block.lines[i]?.text || '', value: block.lines[i + 1]?.text || '' });
        }
        return entries;
      });
      return `<div class="study-diagram-criteria">${sides[0].map((entry, index) => `<section class="study-diagram-criterion">
        <h4>${escapeDiagramText(entry.label)}</h4>
        <dl>
          <div><dt>${escapeDiagramText(blocks[0].title)}</dt><dd>${escapeDiagramText(entry.value)}</dd></div>
          <div><dt>${escapeDiagramText(blocks[1].title)}</dt><dd>${escapeDiagramText(sides[1][index]?.value || '')}</dd></div>
        </dl>
      </section>`).join('')}</div>`;
    }

    function renderStudyDiagram(href, caption) {
      const filename = decodeURI(href).split('/').pop();
      const diagram = mobileDiagramData[filename];
      if (!diagram) return '';
      const { blocks, kind } = diagram;
      let content;
      if (kind === 'classification') content = classificationDiagram(blocks);
      else if (filename === 'chart_06_03.svg') content = numberedComparison(blocks);
      else if (kind === 'compare') content = comparisonDiagram(blocks);
      else if (kind === 'decision') {
        content = `<div class="study-diagram-question">${diagramNode(blocks[0])}</div>
          <div class="study-diagram-branches">${blocks.slice(1).map(diagramNode).join('')}</div>`;
      } else {
        const items = [...blocks];
        const root = items[0] && !items[0].lines.length ? items.shift() : null;
        content = `${root ? `<p class="study-diagram-root">${escapeDiagramText(root.title)}</p>` : ''}
          <ol class="study-diagram-sequence">${items.map(block => `<li>${diagramNode(block)}</li>`).join('')}</ol>`;
      }
      return `<figure class="study-diagram study-diagram--${kind}" aria-label="${escapeDiagramText(caption)}">
        <figcaption><span class="study-diagram-icon">◆</span>${escapeDiagramText(caption)}</figcaption>
        ${content}
      </figure>`;
    }
