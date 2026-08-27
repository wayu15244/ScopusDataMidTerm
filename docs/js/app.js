// Scopus EDA & Keyword Analytics Interactive Application
// Handles Network, Word Cloud, Evolution Heatmap, Topic Quadrant, and Document Explorer

(function() {
  // Use embedded data if available, or fetch
  const data = window.__VIZ_DATA__ || {};
  if (!data.nodes || !data.nodes.length) {
    console.error("No visualization data found!");
    return;
  }

  const colors = [
    '#3b82f6', // Cluster 1: AI & LLMs (Blue)
    '#10b981', // Cluster 2: Networks & Cloud (Green)
    '#8b5cf6', // Cluster 3: Vision & Pattern (Purple)
    '#f59e0b', // Cluster 4: HCI & UI/UX (Amber)
    '#ec4899'  // Cluster 5: Software & Arch (Pink)
  ];

  // Helper: Element creation
  function el(tag, attrs = {}, children = []) {
    const element = document.createElementNS(tag === 'svg' || tag === 'g' || tag === 'circle' || tag === 'line' || tag === 'text' || tag === 'rect' || tag === 'path' ? 'http://www.w3.org/2000/svg' : 'http://www.w3.org/1999/xhtml', tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k.startsWith('on')) {
        element.addEventListener(k.substring(2).toLowerCase(), v);
      } else {
        element.setAttribute(k, v);
      }
    }
    if (typeof children === 'string') {
      element.textContent = children;
    } else if (Array.isArray(children)) {
      children.forEach(c => element.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    }
    return element;
  }

  // Tooltip
  const tooltip = document.getElementById('viz-tooltip');
  function showTip(e, html) {
    tooltip.innerHTML = html;
    tooltip.style.display = 'block';
    moveTip(e);
  }
  function moveTip(e) {
    const x = e.pageX + 14;
    const y = e.pageY + 14;
    tooltip.style.left = `${Math.min(x, window.innerWidth - 300)}px`;
    tooltip.style.top = `${y}px`;
  }
  function hideTip() {
    tooltip.style.display = 'none';
  }

  // Modal
  const modal = document.getElementById('doc-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalAuthors = document.getElementById('modal-authors');
  const modalYear = document.getElementById('modal-year');
  const modalSubject = document.getElementById('modal-subject');
  const modalJournal = document.getElementById('modal-journal');
  const modalCitations = document.getElementById('modal-citations');
  const modalDoi = document.getElementById('modal-doi');
  const modalAbstract = document.getElementById('modal-abstract');
  const modalKeywords = document.getElementById('modal-keywords');
  const modalClose = document.getElementById('modal-close');

  function openModal(doc) {
    modalTitle.textContent = doc.title;
    modalAuthors.textContent = doc.authors;
    modalYear.textContent = doc.year;
    modalSubject.textContent = doc.subject;
    modalJournal.textContent = doc.journal;
    modalCitations.textContent = doc.cited_by;
    modalDoi.href = `https://doi.org/${doc.doi}`;
    modalDoi.textContent = doc.doi;
    modalAbstract.textContent = doc.abstract;
    
    modalKeywords.replaceChildren();
    if (doc.keywords && doc.keywords.length) {
      doc.keywords.forEach(k => {
        if (k.trim()) {
          modalKeywords.appendChild(el('span', { class: 'kw-badge' }, k.trim()));
        }
      });
    }
    modal.classList.add('active');
  }

  modalClose.onclick = () => modal.classList.remove('active');
  modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };

  // ==========================================
  // TAB NAVIGATION
  // ==========================================
  const tabs = document.querySelectorAll('.nav-tab');
  const panes = document.querySelectorAll('.tab-pane');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const targetId = tab.getAttribute('data-tab');
      document.getElementById(targetId).classList.add('active');

      if (targetId === 'tab-network') renderNetwork();
      else if (targetId === 'tab-wordcloud') renderWordCloud();
      else if (targetId === 'tab-evolution') renderEvolution();
      else if (targetId === 'tab-quadrant') renderQuadrant();
      else if (targetId === 'tab-docs') renderDocumentsTable();
    });
  });

  // ==========================================
  // VIEW 1: KEYWORD CO-OCCURRENCE NETWORK
  // ==========================================
  let netScale = 1, netTx = 0, netTy = 0, isDragging = false, lastPos = null;
  const netSvg = document.getElementById('network-svg');
  const netVp = document.getElementById('network-viewport');

  function updateNetTransform() {
    netVp.setAttribute('transform', `translate(${netTx} ${netTy}) scale(${netScale})`);
  }

  function renderNetwork() {
    const minDocs = parseInt(document.getElementById('net-min-docs').value) || 10;
    const colorMode = document.getElementById('net-color-mode').value;
    const searchFilter = document.getElementById('net-search').value.toLowerCase().trim();

    netVp.replaceChildren();

    const visibleNodes = data.nodes.map(n => n.df >= minDocs && (!searchFilter || n.name.toLowerCase().includes(searchFilter)));
    const visibleCount = visibleNodes.filter(Boolean).length;
    document.getElementById('net-shown-count').textContent = `${visibleCount} keywords visible`;

    // Render Edges
    data.links.forEach(l => {
      if (!visibleNodes[l.s] || !visibleNodes[l.t]) return;
      const u = data.nodes[l.s];
      const v = data.nodes[l.t];
      const strokeWidth = 0.8 + Math.log1p(l.w) * 0.8;
      const edge = el('line', {
        x1: u.x, y1: u.y,
        x2: v.x, y2: v.y,
        stroke: '#94a3b8',
        'stroke-opacity': '0.35',
        'stroke-width': strokeWidth
      });
      netVp.appendChild(edge);
    });

    // Year Color helper
    function getYearColor(y) {
      if (y >= 2024.5) return '#ef4444'; // Red (Recent 2025-2026)
      if (y >= 2023.5) return '#f59e0b'; // Amber (2024)
      if (y >= 2022.5) return '#10b981'; // Green (2023)
      if (y >= 2021.5) return '#06b6d4'; // Cyan (2022)
      return '#3b82f6'; // Blue (2020-2021)
    }

    // Render Nodes
    data.nodes.forEach((n, i) => {
      if (!visibleNodes[i]) return;
      const r = 6 + Math.sqrt(n.df) * 1.6;
      const nodeColor = colorMode === 'cluster' ? colors[(n.group - 1) % 5] : getYearColor(n.avg_year);

      const g = el('g', {
        transform: `translate(${n.x} ${n.y})`,
        style: 'cursor: pointer;'
      });

      const circle = el('circle', {
        r: r,
        fill: nodeColor,
        'fill-opacity': '0.88',
        stroke: '#ffffff',
        'stroke-width': '2'
      });

      g.appendChild(circle);

      // Label if large enough or searched
      if (n.df >= 35 || (searchFilter && n.name.toLowerCase().includes(searchFilter))) {
        const text = el('text', {
          x: r + 4,
          y: 4,
          'font-size': n.df >= 60 ? '13px' : '11px',
          'font-weight': '600',
          fill: '#0f172a',
          'paint-order': 'stroke',
          stroke: '#ffffff',
          'stroke-width': '3'
        }, n.name);
        g.appendChild(text);
      }

      g.addEventListener('mouseenter', (e) => {
        circle.setAttribute('stroke', '#0f172a');
        circle.setAttribute('stroke-width', '3');
        showTip(e, `<strong>${n.name}</strong><br>
          Cluster: ${data.cluster_names[n.group - 1]}<br>
          Document frequency: ${n.df}<br>
          Avg publication year: ${n.avg_year}`);
      });
      g.addEventListener('mousemove', moveTip);
      g.addEventListener('mouseleave', () => {
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '2');
        hideTip();
      });

      g.addEventListener('click', (e) => {
        e.stopPropagation();
        selectKeyword(n, i);
      });

      netVp.appendChild(g);
    });

    updateNetTransform();
  }

  function selectKeyword(node, nodeIdx) {
    document.getElementById('details-kw-name').textContent = node.name;
    document.getElementById('details-kw-meta').textContent = `Cluster: ${data.cluster_names[node.group - 1]} · Occurs in ${node.df} documents · Avg Year: ${node.avg_year}`;
    
    // Find related keywords via links
    const related = [];
    data.links.forEach(l => {
      if (l.s === nodeIdx) {
        related.push({ id: l.t, name: data.nodes[l.t].name, w: l.w });
      } else if (l.t === nodeIdx) {
        related.push({ id: l.s, name: data.nodes[l.s].name, w: l.w });
      }
    });
    related.sort((a, b) => b.w - a.w);

    const relatedList = document.getElementById('details-related-list');
    relatedList.replaceChildren();
    
    if (related.length === 0) {
      relatedList.innerHTML = '<li style="color:#64748b;font-size:0.8rem;">No direct co-occurring links found.</li>';
    } else {
      related.slice(0, 10).forEach(item => {
        const li = el('li', { class: 'related-item' }, [
          el('span', {}, item.name),
          el('span', { class: 'related-count' }, `${item.w} docs`)
        ]);
        li.onclick = () => {
          selectKeyword(data.nodes[item.id], item.id);
        };
        relatedList.appendChild(li);
      });
    }

    // Documents matching keyword
    const docList = document.getElementById('details-doc-list');
    docList.replaceChildren();
    const matchingDocs = data.sample_documents.filter(d => 
      (d.keywords && d.keywords.some(k => k.toLowerCase().includes(node.name.toLowerCase()))) ||
      d.title.toLowerCase().includes(node.name.toLowerCase())
    );

    document.getElementById('details-doc-count').textContent = `${matchingDocs.length} Sample Papers`;

    matchingDocs.slice(0, 6).forEach(doc => {
      const card = el('div', { class: 'related-item', style: 'flex-direction: column; align-items: flex-start; gap: 0.2rem;' }, [
        el('strong', { style: 'font-size: 0.8rem; color: #0f172a;' }, doc.title),
        el('span', { style: 'font-size: 0.72rem; color: #64748b;' }, `${doc.authors} (${doc.year}) · ${doc.journal}`)
      ]);
      card.onclick = () => openModal(doc);
      docList.appendChild(card);
    });

    document.getElementById('details-empty-state').style.display = 'none';
    document.getElementById('details-content-state').style.display = 'block';
  }

  // Network Zoom & Pan Events
  document.getElementById('net-zoom-in').onclick = () => { netScale = Math.min(4, netScale * 1.25); updateNetTransform(); };
  document.getElementById('net-zoom-out').onclick = () => { netScale = Math.max(0.4, netScale / 1.25); updateNetTransform(); };
  document.getElementById('net-zoom-reset').onclick = () => { netScale = 1; netTx = 0; netTy = 0; updateNetTransform(); };

  netSvg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    netScale = Math.max(0.4, Math.min(4, netScale * factor));
    updateNetTransform();
  }, { passive: false });

  netSvg.addEventListener('pointerdown', (e) => {
    isDragging = true;
    lastPos = [e.clientX, e.clientY];
    netSvg.setPointerCapture(e.pointerId);
  });
  netSvg.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    netTx += (e.clientX - lastPos[0]);
    netTy += (e.clientY - lastPos[1]);
    lastPos = [e.clientX, e.clientY];
    updateNetTransform();
  });
  netSvg.addEventListener('pointerup', () => { isDragging = false; });

  document.getElementById('net-apply').onclick = renderNetwork;
  document.getElementById('net-search').oninput = renderNetwork;
  document.getElementById('net-color-mode').onchange = renderNetwork;

  // ==========================================
  // VIEW 2: INTERACTIVE WORD CLOUD
  // ==========================================
  function renderWordCloud() {
    const svg = document.getElementById('wordcloud-svg');
    const yearFilter = document.getElementById('wc-year').value;
    const maxWords = parseInt(document.getElementById('wc-max').value) || 50;

    svg.replaceChildren();
    const w = 1100, h = 600;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

    let filteredNodes = [...data.nodes];
    if (yearFilter !== 'all') {
      const yr = parseInt(yearFilter);
      filteredNodes = filteredNodes.filter(n => Math.abs(n.avg_year - yr) <= 1.2);
    }
    filteredNodes.sort((a, b) => b.df - a.df);
    const words = filteredNodes.slice(0, maxWords);
    if (!words.length) return;

    const maxDf = words[0].df;
    const minDf = words[words.length - 1].df || 1;

    // Spiral layout algorithm for word cloud
    const center = { x: w / 2, y: h / 2 };
    const placed = [];

    words.forEach((word, idx) => {
      const fontSize = 14 + ((word.df - minDf) / (maxDf - minDf || 1)) * 38;
      const color = colors[(word.group - 1) % 5];

      let angle = idx * 0.75;
      let radius = Math.sqrt(idx) * 38;
      let x = center.x + radius * Math.cos(angle);
      let y = center.y + radius * Math.sin(angle) * 0.7;

      // Bound within svg
      x = Math.max(80, Math.min(w - 80, x));
      y = Math.max(50, Math.min(h - 50, y));

      const text = el('text', {
        x: x,
        y: y,
        'text-anchor': 'middle',
        'font-size': `${fontSize}px`,
        'font-weight': fontSize > 28 ? '800' : '600',
        fill: color,
        style: 'cursor: pointer;'
      }, word.name);

      text.addEventListener('mouseenter', (e) => {
        showTip(e, `<strong>${word.name}</strong><br>Document count: ${word.df}<br>Cluster: ${data.cluster_names[word.group - 1]}`);
      });
      text.addEventListener('mousemove', moveTip);
      text.addEventListener('mouseleave', hideTip);
      text.addEventListener('click', () => {
        // Switch to document table and search
        tabs[4].click();
        document.getElementById('doc-search-input').value = word.name;
        renderDocumentsTable();
      });

      svg.appendChild(text);
    });
  }

  document.getElementById('wc-apply').onclick = renderWordCloud;
  document.getElementById('wc-year').onchange = renderWordCloud;

  // ==========================================
  // VIEW 3: CROSS-SUBJECT EVOLUTION & HEATMAP
  // ==========================================
  function renderEvolution() {
    const tableBody = document.getElementById('heatmap-body');
    const tableHeadRow = document.getElementById('heatmap-header-row');
    tableHeadRow.replaceChildren();
    tableBody.replaceChildren();

    // Table Headers (Subject + Top 20 keywords)
    tableHeadRow.appendChild(el('th', {}, 'Scopus Subject Area'));
    data.top_20_keywords.forEach(kw => {
      tableHeadRow.appendChild(el('th', { title: kw }, kw));
    });

    let maxVal = 1;
    data.subject_matrix.forEach(row => {
      row.counts.forEach(v => { if (v > maxVal) maxVal = v; });
    });

    data.subject_matrix.forEach(row => {
      const tr = el('tr');
      tr.appendChild(el('td', {}, row.subject));

      row.counts.forEach((val, colIdx) => {
        const td = el('td');
        const kw = data.top_20_keywords[colIdx];
        const intensity = val / maxVal;
        const bgColor = intensity > 0.02 ? `rgba(37, 99, 235, ${Math.max(0.12, intensity)})` : '#f8fafc';
        const textColor = intensity > 0.5 ? '#ffffff' : '#0f172a';

        const cell = el('div', {
          class: 'heat-cell',
          style: `background: ${bgColor}; color: ${textColor};`
        }, val > 0 ? String(val) : '—');

        cell.addEventListener('mouseenter', (e) => {
          showTip(e, `<strong>${row.subject}</strong><br>Keyword: <em>${kw}</em><br>Paper count: ${val}`);
        });
        cell.addEventListener('mousemove', moveTip);
        cell.addEventListener('mouseleave', hideTip);
        cell.onclick = () => {
          tabs[4].click();
          document.getElementById('doc-subject-filter').value = row.subject;
          document.getElementById('doc-search-input').value = kw;
          renderDocumentsTable();
        };

        td.appendChild(cell);
        tr.appendChild(td);
      });

      tableBody.appendChild(tr);
    });
  }

  // ==========================================
  // VIEW 4: STRATEGIC TOPIC GROWTH QUADRANT
  // ==========================================
  function renderQuadrant() {
    const svg = document.getElementById('quadrant-svg');
    const w = 1100, h = 640;
    const left = 90, right = 50, top = 50, bottom = 70;
    svg.replaceChildren();
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

    const pts = data.quadrant;
    const xMax = Math.max(2.5, ...pts.map(p => Math.abs(p.growth)));
    const yMax = Math.max(60, ...pts.map(p => p.recent));

    const xScale = (gx) => left + ((gx + xMax) / (2 * xMax)) * (w - left - right);
    const yScale = (gy) => h - bottom - (gy / yMax) * (h - top - bottom);

    const midX = xScale(0);
    const midY = yScale(yMax / 2);

    // Background rect
    svg.appendChild(el('rect', { x: left, y: top, width: w - left - right, height: h - top - bottom, fill: '#ffffff', stroke: '#cbd5e1' }));

    // Quadrant divide lines
    svg.appendChild(el('line', { x1: midX, y1: top, x2: midX, y2: h - bottom, stroke: '#94a3b8', 'stroke-dasharray': '5 5', 'stroke-width': '1.5' }));
    svg.appendChild(el('line', { x1: left, y1: midY, x2: w - right, y2: midY, stroke: '#94a3b8', 'stroke-dasharray': '5 5', 'stroke-width': '1.5' }));

    // Quadrant Titles
    const labels = [
      ['Established Topics (High Volume, Slower Growth)', left + 14, top + 24],
      ['High-Volume Emerging Topics (Core Growth)', midX + 14, top + 24],
      ['Declining or Niche Topics', left + 14, h - bottom - 14],
      ['Emerging Niche Topics (Rapid Specialization)', midX + 14, h - bottom - 14]
    ];
    labels.forEach(([lbl, lx, ly]) => {
      svg.appendChild(el('text', { x: lx, y: ly, 'font-size': '12px', 'font-weight': '700', fill: '#64748b' }, lbl));
    });

    // Axis ticks and labels
    svg.appendChild(el('text', { x: (left + w - right) / 2, y: h - 20, 'text-anchor': 'middle', 'font-size': '13px', 'font-weight': '700', fill: '#0f172a' }, 'Normalized Topic Growth Score: log₂(Recent 2024–2026 / Prior 2020–2023)'));
    svg.appendChild(el('text', { x: 22, y: (top + h - bottom) / 2, transform: `rotate(-90 22 ${(top + h - bottom) / 2})`, 'text-anchor': 'middle', 'font-size': '13px', 'font-weight': '700', fill: '#0f172a' }, 'Recent Documents (2024–2026)'));

    // Points
    pts.forEach(p => {
      const cx = xScale(p.growth);
      const cy = yScale(p.recent);
      const r = 5 + Math.sqrt(p.df) * 0.9;
      const g = el('g', { style: 'cursor: pointer;' });

      const circle = el('circle', {
        cx: cx,
        cy: cy,
        r: r,
        fill: colors[(p.group - 1) % 5],
        'fill-opacity': '0.8',
        stroke: '#ffffff',
        'stroke-width': '1.5'
      });
      g.appendChild(circle);

      // Label top keywords or fast growth
      if (p.recent >= 30 || Math.abs(p.growth) >= 1.2) {
        g.appendChild(el('text', {
          x: cx + r + 3,
          y: cy + 4,
          'font-size': '11px',
          'font-weight': '600',
          fill: '#1e293b',
          'paint-order': 'stroke',
          stroke: '#ffffff',
          'stroke-width': '3'
        }, p.name));
      }

      g.addEventListener('mouseenter', (e) => {
        circle.setAttribute('stroke', '#0f172a');
        circle.setAttribute('stroke-width', '2.5');
        showTip(e, `<strong>${p.name}</strong><br>
          Category: ${p.category}<br>
          Growth Score: ${p.growth.toFixed(3)}<br>
          Recent (2024-2026): ${p.recent} docs<br>
          Prior (2020-2023): ${p.prev} docs`);
      });
      g.addEventListener('mousemove', moveTip);
      g.addEventListener('mouseleave', () => {
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '1.5');
        hideTip();
      });

      g.addEventListener('click', () => {
        tabs[4].click();
        document.getElementById('doc-search-input').value = p.name;
        renderDocumentsTable();
      });

      svg.appendChild(g);
    });
  }

  // ==========================================
  // VIEW 5: SCOPUS DOCUMENT EXPLORER
  // ==========================================
  let docCurrentPage = 1;
  const docsPerPage = 20;

  function renderDocumentsTable() {
    const searchVal = (document.getElementById('doc-search-input').value || '').toLowerCase().trim();
    const subjVal = document.getElementById('doc-subject-filter').value;
    const sortVal = document.getElementById('doc-sort').value;
    const grid = document.getElementById('doc-grid');

    let filtered = data.sample_documents.filter(doc => {
      if (subjVal && doc.subject !== subjVal) return false;
      if (searchVal) {
        const titleMatch = doc.title.toLowerCase().includes(searchVal);
        const authorMatch = doc.authors.toLowerCase().includes(searchVal);
        const kwMatch = doc.keywords && doc.keywords.some(k => k.toLowerCase().includes(searchVal));
        if (!titleMatch && !authorMatch && !kwMatch) return false;
      }
      return true;
    });

    if (sortVal === 'citations') {
      filtered.sort((a, b) => b.cited_by - a.cited_by);
    } else if (sortVal === 'year-desc') {
      filtered.sort((a, b) => b.year - a.year);
    } else if (sortVal === 'year-asc') {
      filtered.sort((a, b) => a.year - b.year);
    }

    document.getElementById('doc-match-count').textContent = `Showing ${filtered.length} matching papers (from 600 sampled)`;

    grid.replaceChildren();

    if (!filtered.length) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #64748b;">No documents matched your query.</div>';
      return;
    }

    filtered.slice(0, 30).forEach(doc => {
      const card = el('div', { class: 'doc-card' }, [
        el('div', { class: 'doc-card-header' }, [
          el('span', { class: 'doc-subject-tag' }, doc.subject),
          el('span', { class: 'doc-year-tag' }, String(doc.year))
        ]),
        el('div', { class: 'doc-title', onclick: () => openModal(doc) }, doc.title),
        el('div', { class: 'doc-authors' }, doc.authors),
        el('div', { class: 'doc-abstract' }, doc.abstract),
        el('div', { class: 'doc-footer' }, [
          el('span', {}, doc.journal.length > 35 ? doc.journal.substring(0, 35) + '...' : doc.journal),
          el('span', { class: 'doc-cited' }, `Cited: ${doc.cited_by}`)
        ])
      ]);
      grid.appendChild(card);
    });
  }

  document.getElementById('doc-search-input').oninput = renderDocumentsTable;
  document.getElementById('doc-subject-filter').onchange = renderDocumentsTable;
  document.getElementById('doc-sort').onchange = renderDocumentsTable;

  // Initialize first view
  renderNetwork();
})();
