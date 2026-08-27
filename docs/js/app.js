// Hallmark · theme: Cobalt · genre: modern-minimal
// Script Engine for Scopus Academic Workbench

(function() {
  const data = window.__VIZ_DATA__ || {};
  if (!data.nodes || !data.nodes.length) {
    console.error("No dataset available");
    return;
  }

  // Cobalt Academic Palette
  const clusterColors = [
    '#2563eb', // AI / LLMs (Cobalt)
    '#059669', // Networks / Security (Emerald)
    '#7c3aed', // Vision / Multimedia (Violet)
    '#d97706', // HCI / UI/UX (Amber)
    '#db2777'  // Software / Architecture (Rose)
  ];

  const clusterNames = data.cluster_names || [
    "AI, Large Language Models & Deep Learning",
    "Networks, Cloud & Cybersecurity",
    "Computer Vision & Multimedia",
    "HCI, UI/UX & Interactive Systems",
    "Software Systems & Architecture"
  ];

  // Active instances
  let chartNetwork = null;
  let chartWordCloud = null;
  let chartHeatmap = null;
  let chartQuadrant = null;
  let chartSubjectBar = null;
  let chartYearTrend = null;

  // Tab switching
  const navTabs = document.querySelectorAll('.nav-tab');
  const viewPanels = document.querySelectorAll('.view-panel');

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      navTabs.forEach(t => t.classList.remove('active'));
      viewPanels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const targetId = tab.getAttribute('data-tab');
      const el = document.getElementById(targetId);
      if (el) el.classList.add('active');

      setTimeout(() => {
        if (targetId === 'tab-network') renderNetwork();
        else if (targetId === 'tab-wordcloud') renderWordCloud();
        else if (targetId === 'tab-heatmap') renderHeatmap();
        else if (targetId === 'tab-quadrant') renderQuadrant();
        else if (targetId === 'tab-eda') renderEda();
        else if (targetId === 'tab-explorer') renderExplorer();
      }, 50);
    });
  });

  // Modal handler
  const modal = document.getElementById('doc-modal');
  const modalClose = document.getElementById('modal-close');
  function openModal(doc) {
    document.getElementById('modal-title').textContent = doc.title;
    document.getElementById('modal-authors').textContent = doc.authors;
    document.getElementById('modal-subject').textContent = doc.subject;
    document.getElementById('modal-year').textContent = doc.year;
    document.getElementById('modal-journal').textContent = doc.journal;
    document.getElementById('modal-citations').textContent = doc.cited_by;
    const doiEl = document.getElementById('modal-doi');
    doiEl.href = "https://doi.org/" + doc.doi;
    doiEl.textContent = doc.doi;
    document.getElementById('modal-abstract').textContent = doc.abstract;

    const kwWrap = document.getElementById('modal-keywords');
    kwWrap.replaceChildren();
    if (doc.keywords && doc.keywords.length) {
      doc.keywords.forEach(k => {
        if (k.trim()) {
          const span = document.createElement('span');
          span.className = 'doc-tag';
          span.style = 'margin-right: 4px; margin-bottom: 4px; display: inline-block;';
          span.textContent = k.trim();
          kwWrap.appendChild(span);
        }
      });
    }
    modal.classList.add('active');
  }
  modalClose.onclick = () => modal.classList.remove('active');
  modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };

  // =========================================================================
  // 1. KNOWLEDGE NETWORK (Force-directed Physics & Collision Prevention)
  // =========================================================================
  function renderNetwork() {
    const dom = document.getElementById('echarts-network');
    if (!chartNetwork) chartNetwork = echarts.init(dom);

    const minDocs = parseInt(document.getElementById('net-min-docs').value) || 12;
    const searchVal = (document.getElementById('net-search').value || '').toLowerCase().trim();

    const categories = clusterNames.map((name, i) => ({
      name: name,
      itemStyle: { color: clusterColors[i] }
    }));

    const validNodes = data.nodes.filter(n => n.df >= minDocs && (!searchVal || n.name.toLowerCase().includes(searchVal)));
    const validSet = new Set(validNodes.map(n => n.id));

    const gNodes = validNodes.map(n => {
      const size = Math.max(12, Math.min(42, Math.sqrt(n.df) * 3.4));
      return {
        id: String(n.id),
        name: n.name,
        symbolSize: size,
        value: n.df,
        category: n.group - 1,
        avgYear: n.avg_year,
        label: {
          show: n.df >= 50 || (searchVal && n.name.toLowerCase().includes(searchVal)),
          fontSize: n.df >= 90 ? 11 : 9.5,
          fontFamily: 'Inter, sans-serif'
        }
      };
    });

    const gLinks = [];
    data.links.forEach(l => {
      if (validSet.has(l.s) && validSet.has(l.t)) {
        gLinks.push({
          source: String(l.s),
          target: String(l.t),
          value: l.w,
          lineStyle: {
            width: Math.max(1, Math.min(5, Math.log1p(l.w) * 1.1)),
            opacity: 0.35,
            curveness: 0.08
          }
        });
      }
    });

    const option = {
      tooltip: {
        trigger: 'item',
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        textStyle: { color: '#0f172a', fontFamily: 'Inter, sans-serif' },
        formatter: function(p) {
          if (p.dataType === 'node') {
            return `<strong>${p.data.name}</strong><br>` +
                   `Cluster: ${clusterNames[p.data.category]}<br>` +
                   `Document Count: <strong>${p.data.value.toLocaleString()}</strong> papers<br>` +
                   `Average Year: <strong>${p.data.avgYear}</strong><br>` +
                   `<span style="font-size:0.75rem; color:#2563eb;">Click node to inspect publications</span>`;
          } else {
            return `Co-occurrence: <strong>${p.data.value}</strong> publications`;
          }
        }
      },
      legend: {
        data: clusterNames,
        top: 6,
        textStyle: { fontSize: 10.5, fontFamily: 'Space Grotesk, sans-serif', color: '#475569' }
      },
      series: [{
        type: 'graph',
        layout: 'force',
        data: gNodes,
        links: gLinks,
        categories: categories,
        roam: true,
        label: {
          position: 'right',
          formatter: '{b}'
        },
        force: {
          repulsion: 360,
          gravity: 0.08,
          edgeLength: [70, 180],
          friction: 0.65
        },
        emphasis: {
          focus: 'adjacency',
          lineStyle: { width: 3.5, opacity: 0.85 }
        }
      }]
    };

    chartNetwork.setOption(option, true);
    chartNetwork.resize();

    chartNetwork.off('click');
    chartNetwork.on('click', function(p) {
      if (p.dataType === 'node') {
        const nodeId = parseInt(p.data.id);
        const nodeName = p.data.name;

        document.getElementById('side-kw-title').textContent = nodeName;
        document.getElementById('side-kw-sub').textContent = `${clusterNames[p.data.category]} · ${p.data.value} papers`;

        const relList = document.getElementById('side-related-list');
        relList.replaceChildren();

        const related = [];
        data.links.forEach(l => {
          if (l.s === nodeId && validSet.has(l.t)) related.push({ name: data.nodes[l.t].name, w: l.w });
          else if (l.t === nodeId && validSet.has(l.s)) related.push({ name: data.nodes[l.s].name, w: l.w });
        });
        related.sort((a, b) => b.w - a.w);

        related.slice(0, 7).forEach(r => {
          const d = document.createElement('div');
          d.style = 'display:flex; justify-content:space-between; font-family:var(--font-mono); font-size:0.75rem; padding:3px 0; border-bottom:1px solid #f1f5f9;';
          d.innerHTML = `<span>${r.name}</span><strong style="color:var(--color-accent);">${r.w}</strong>`;
          relList.appendChild(d);
        });

        const paperList = document.getElementById('side-paper-list');
        paperList.replaceChildren();
        const matches = data.sample_documents.filter(d =>
          d.title.toLowerCase().includes(nodeName.toLowerCase()) ||
          (d.keywords && d.keywords.some(k => k.toLowerCase().includes(nodeName.toLowerCase())))
        );

        matches.slice(0, 4).forEach(doc => {
          const div = document.createElement('div');
          div.className = 'doc-tile';
          div.style = 'margin-bottom:6px; padding:8px; cursor:pointer;';
          div.innerHTML = `<div style="font-weight:600; font-size:0.8rem; color:#0f172a; line-height:1.3;">${doc.title}</div>
            <div style="font-family:var(--font-mono); font-size:0.68rem; color:#64748b; margin-top:2px;">${doc.authors} (${doc.year}) · Cited: ${doc.cited_by}</div>`;
          div.onclick = () => openModal(doc);
          paperList.appendChild(div);
        });

        document.getElementById('side-default-msg').style.display = 'none';
        document.getElementById('side-selected-msg').style.display = 'block';
      }
    });
  }

  document.getElementById('net-apply').onclick = renderNetwork;
  document.getElementById('net-search').oninput = renderNetwork;

  // =========================================================================
  // 2. DYNAMIC WORD CLOUD (Collision-free)
  // =========================================================================
  function renderWordCloud() {
    const dom = document.getElementById('echarts-wordcloud');
    if (!chartWordCloud) chartWordCloud = echarts.init(dom);

    const yearVal = document.getElementById('wc-year').value;
    const maxWords = parseInt(document.getElementById('wc-max').value) || 50;

    let filtered = [...data.nodes];
    if (yearVal !== 'all') {
      const yr = parseInt(yearVal);
      filtered = filtered.filter(n => Math.abs(n.avg_year - yr) <= 1.5);
    }
    filtered.sort((a, b) => b.df - a.df);
    const words = filtered.slice(0, maxWords);

    const wcData = words.map(w => ({
      name: w.name,
      value: w.df,
      category: w.group - 1,
      itemStyle: {
        color: clusterColors[(w.group - 1) % 5]
      }
    }));

    const option = {
      tooltip: {
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        textStyle: { color: '#0f172a', fontFamily: 'Inter, sans-serif' },
        formatter: function(p) {
          return `<strong>${p.data.name}</strong><br>` +
                 `Cluster: ${clusterNames[p.data.category]}<br>` +
                 `Document Frequency: <strong>${p.data.value}</strong><br>` +
                 `<span style="font-size:0.75rem; color:#2563eb;">Click to view papers in Explorer</span>`;
        }
      },
      series: [{
        type: 'wordCloud',
        shape: 'circle',
        left: 'center',
        top: 'center',
        width: '92%',
        height: '92%',
        sizeRange: [13, 50],
        rotationRange: [-20, 20],
        rotationStep: 10,
        gridSize: 10,
        drawOutOfBound: false,
        layoutAnimation: true,
        textStyle: {
          fontFamily: 'Space Grotesk, sans-serif',
          fontWeight: 600
        },
        emphasis: {
          textStyle: {
            shadowBlur: 8,
            shadowColor: 'rgba(0,0,0,0.25)'
          }
        },
        data: wcData
      }]
    };

    chartWordCloud.setOption(option, true);
    chartWordCloud.resize();
    chartWordCloud.off('click');
    chartWordCloud.on('click', function(p) {
      navTabs[5].click();
      document.getElementById('doc-search').value = p.name;
      renderExplorer();
    });
  }

  document.getElementById('wc-year').onchange = renderWordCloud;
  document.getElementById('wc-apply').onclick = renderWordCloud;

  // =========================================================================
  // 3. CROSS-DISCIPLINARY HEATMAP (Continuous Gradient + Split Workbench Inspector)
  // =========================================================================
  function renderHeatmap() {
    const dom = document.getElementById('echarts-heatmap');
    if (!chartHeatmap) chartHeatmap = echarts.init(dom);

    const xKeywords = data.cross_keywords || [];
    const ySubjects = data.subject_matrix.map(r => r.subject);

    const heatData = [];
    let maxVal = 0;
    let minVal = 9999;
    data.subject_matrix.forEach((row, sIdx) => {
      row.counts.forEach((val, kIdx) => {
        heatData.push([kIdx, sIdx, val]);
        if (val > maxVal) maxVal = val;
        if (val < minVal) minVal = val;
      });
    });

    const option = {
      tooltip: {
        position: 'top',
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        textStyle: { color: '#0f172a', fontFamily: 'Inter, sans-serif' },
        formatter: function(p) {
          return `<strong>${ySubjects[p.value[1]]}</strong><br>` +
                 `Technology: <em>${xKeywords[p.value[0]]}</em><br>` +
                 `Volume: <strong>${p.value[2]}</strong> documents<br>` +
                 `<span style="font-size:0.75rem; color:#2563eb;">Click cell to inspect papers</span>`;
        }
      },
      grid: {
        top: 25,
        bottom: 90,
        left: 230,
        right: 30
      },
      xAxis: {
        type: 'category',
        data: xKeywords,
        splitArea: { show: true },
        axisLabel: {
          interval: 0,
          rotate: 35,
          color: '#1e293b',
          fontFamily: 'Space Grotesk, sans-serif',
          fontWeight: 600,
          fontSize: 10.5
        }
      },
      yAxis: {
        type: 'category',
        data: ySubjects,
        splitArea: { show: true },
        axisLabel: {
          color: '#1e293b',
          fontFamily: 'Space Grotesk, sans-serif',
          fontWeight: 600,
          fontSize: 11
        }
      },
      visualMap: {
        min: minVal,
        max: maxVal,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 8,
        inRange: {
          color: ['#eff6ff', '#bfdbfe', '#60a5fa', '#2563eb', '#1e3a8a']
        },
        textStyle: { fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }
      },
      series: [{
        type: 'heatmap',
        data: heatData,
        label: {
          show: true,
          formatter: function(p) { return p.value[2]; },
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
          color: '#0f172a'
        }
      }]
    };

    chartHeatmap.setOption(option, true);
    chartHeatmap.resize();

    // Heatmap cell click interaction
    chartHeatmap.off('click');
    chartHeatmap.on('click', function(p) {
      const kIdx = p.value[0];
      const sIdx = p.value[1];
      const val = p.value[2];
      const kw = xKeywords[kIdx];
      const subj = ySubjects[sIdx];

      document.getElementById('hm-cell-tech').textContent = kw;
      document.getElementById('hm-cell-subj').textContent = subj;
      document.getElementById('hm-cell-stat').innerHTML = `
        Volume: <strong style="color:var(--color-accent);">${val} papers</strong><br>
        Discipline Share: <strong>${((val / 700) * 100).toFixed(1)}%</strong> of ${subj}
      `;

      const paperList = document.getElementById('hm-paper-list');
      paperList.replaceChildren();

      const matches = data.sample_documents.filter(d =>
        d.subject === subj && (
          d.title.toLowerCase().includes(kw.toLowerCase()) ||
          (d.keywords && d.keywords.some(k => k.toLowerCase().includes(kw.toLowerCase())))
        )
      );

      if (!matches.length) {
        paperList.innerHTML = '<div style="font-size:0.75rem; color:#64748b; font-family:var(--font-mono); padding:8px 0;">No direct title hits in sample set, view via Explorer.</div>';
      } else {
        matches.slice(0, 4).forEach(doc => {
          const div = document.createElement('div');
          div.className = 'doc-tile';
          div.style = 'margin-bottom:6px; padding:8px; cursor:pointer;';
          div.innerHTML = `<div style="font-weight:600; font-size:0.8rem; color:#0f172a; line-height:1.3;">${doc.title}</div>
            <div style="font-family:var(--font-mono); font-size:0.68rem; color:#64748b; margin-top:2px;">${doc.authors} (${doc.year}) · Cited: ${doc.cited_by}</div>`;
          div.onclick = () => openModal(doc);
          paperList.appendChild(div);
        });
      }

      document.getElementById('hm-default-msg').style.display = 'none';
      document.getElementById('hm-selected-msg').style.display = 'block';
    });
  }

  // =========================================================================
  // 4. STRATEGIC TOPIC GROWTH QUADRANT (Balanced 4 Zones)
  // =========================================================================
  function renderQuadrant() {
    const dom = document.getElementById('echarts-quadrant');
    if (!chartQuadrant) chartQuadrant = echarts.init(dom);

    const pts = data.quadrant || [];
    const seriesData = pts.map(p => ({
      name: p.name,
      value: [p.growth, p.recent, p.df],
      category: p.category,
      group: p.group - 1,
      itemStyle: { color: clusterColors[(p.group - 1) % 5] }
    }));

    const medianY = 90;

    const option = {
      tooltip: {
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        textStyle: { color: '#0f172a', fontFamily: 'Inter, sans-serif' },
        formatter: function(p) {
          const d = p.data;
          return `<strong>${d.name}</strong><br>` +
                 `Zone: <strong>${d.category}</strong><br>` +
                 `Growth Score (log₂): <strong>${d.value[0].toFixed(3)}</strong><br>` +
                 `Recent Volume (2024-2026): <strong>${d.value[1]}</strong> papers<br>` +
                 `Total Document Frequency: <strong>${d.value[2]}</strong>`;
        }
      },
      grid: { left: 75, right: 50, top: 50, bottom: 65 },
      xAxis: {
        name: 'Normalized Topic Growth Score: log₂(Recent / Prior)',
        nameLocation: 'center',
        nameGap: 35,
        type: 'value',
        nameTextStyle: { fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600 },
        splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
        axisLabel: { fontFamily: 'JetBrains Mono, monospace' }
      },
      yAxis: {
        name: 'Recent Document Volume (2024–2026)',
        nameLocation: 'center',
        nameGap: 40,
        type: 'value',
        nameTextStyle: { fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600 },
        splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
        axisLabel: { fontFamily: 'JetBrains Mono, monospace' }
      },
      series: [{
        type: 'scatter',
        symbolSize: function(val) {
          return Math.max(12, Math.min(36, Math.sqrt(val[2]) * 1.5));
        },
        data: seriesData,
        label: {
          show: true,
          formatter: function(p) {
            if (p.data.value[1] >= 90 || Math.abs(p.data.value[0]) >= 0.6) return p.data.name;
            return '';
          },
          position: 'top',
          fontSize: 10,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 600,
          color: '#1e293b'
        },
        markLine: {
          silent: true,
          lineStyle: { color: '#64748b', type: 'dashed', width: 1.2 },
          data: [
            { xAxis: 0, label: { formatter: 'Zero Growth', position: 'end' } },
            { yAxis: medianY, label: { formatter: 'Median Volume', position: 'end' } }
          ]
        },
        markArea: {
          silent: true,
          itemStyle: { opacity: 0.04 },
          data: [
            [{ name: 'High-Volume Emerging', xAxis: 0, yAxis: medianY, itemStyle: { color: '#10b981' } }, { xAxis: 5, yAxis: 300 }],
            [{ name: 'Core Established', xAxis: -5, yAxis: medianY, itemStyle: { color: '#3b82f6' } }, { xAxis: 0, yAxis: 300 }],
            [{ name: 'Emerging Niche', xAxis: 0, yAxis: 0, itemStyle: { color: '#f59e0b' } }, { xAxis: 5, yAxis: medianY }],
            [{ name: 'Specialized / Stable', xAxis: -5, yAxis: 0, itemStyle: { color: '#94a3b8' } }, { xAxis: 0, yAxis: medianY }]
          ]
        }
      }]
    };

    chartQuadrant.setOption(option, true);
    chartQuadrant.resize();
  }

  // =========================================================================
  // 5. EDA METRICS CHARTS
  // =========================================================================
  function renderEda() {
    const domSubj = document.getElementById('echarts-subject-bar');
    const domYear = document.getElementById('echarts-year-area');
    if (!chartSubjectBar) chartSubjectBar = echarts.init(domSubj);
    if (!chartYearTrend) chartYearTrend = echarts.init(domYear);

    const subjects = Object.keys(data.subject_counts_raw);
    const rawVals = subjects.map(s => data.subject_counts_raw[s]);
    const cleanVals = subjects.map(s => data.subject_counts_cleaned[s]);

    chartSubjectBar.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: ['Raw Records', 'Cleaned Records (>=600)'], top: 6 },
      grid: { left: 240, right: 25, top: 40, bottom: 25 },
      xAxis: { type: 'value', axisLabel: { fontFamily: 'JetBrains Mono' } },
      yAxis: { type: 'category', data: subjects, axisLabel: { fontSize: 10.5, fontFamily: 'Space Grotesk', fontWeight: 600 } },
      series: [
        { name: 'Raw Records', type: 'bar', data: rawVals, itemStyle: { color: '#cbd5e1' } },
        { name: 'Cleaned Records (>=600)', type: 'bar', data: cleanVals, itemStyle: { color: '#2563eb' }, markLine: { data: [{ xAxis: 600, label: { formatter: 'Min 600' } }], lineStyle: { color: '#ef4444' } } }
      ]
    }, true);
    chartSubjectBar.resize();

    const years = Object.keys(data.year_distribution);
    const yearCounts = Object.values(data.year_distribution);

    chartYearTrend.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 55, right: 25, top: 35, bottom: 35 },
      xAxis: { type: 'category', data: years, boundaryGap: false, axisLabel: { fontFamily: 'JetBrains Mono' } },
      yAxis: { type: 'value', axisLabel: { fontFamily: 'JetBrains Mono' } },
      series: [{
        name: 'Publications',
        type: 'line',
        smooth: true,
        data: yearCounts,
        symbolSize: 7,
        itemStyle: { color: '#2563eb' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(37, 99, 235, 0.4)' },
            { offset: 1, color: 'rgba(37, 99, 235, 0.02)' }
          ])
        }
      }]
    }, true);
    chartYearTrend.resize();
  }

  // =========================================================================
  // 6. SCOPUS LITERATURE EXPLORER
  // =========================================================================
  function renderExplorer() {
    const searchVal = (document.getElementById('doc-search').value || '').toLowerCase().trim();
    const subjVal = document.getElementById('doc-filter-subj').value;
    const sortVal = document.getElementById('doc-sort').value;
    const grid = document.getElementById('explorer-grid');

    let filtered = data.sample_documents.filter(doc => {
      if (subjVal && doc.subject !== subjVal) return false;
      if (searchVal) {
        const titleHit = doc.title.toLowerCase().includes(searchVal);
        const authHit = doc.authors.toLowerCase().includes(searchVal);
        const kwHit = doc.keywords && doc.keywords.some(k => k.toLowerCase().includes(searchVal));
        if (!titleHit && !authHit && !kwHit) return false;
      }
      return true;
    });

    if (sortVal === 'citations') filtered.sort((a, b) => b.cited_by - a.cited_by);
    else if (sortVal === 'year-desc') filtered.sort((a, b) => b.year - a.year);
    else if (sortVal === 'year-asc') filtered.sort((a, b) => a.year - b.year);

    document.getElementById('explorer-status').textContent = `Showing ${filtered.length} matched publications (Sample set)`;
    grid.replaceChildren();

    if (!filtered.length) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 2rem; color: #64748b; font-family:var(--font-mono);">No publications matched query parameters.</div>';
      return;
    }

    filtered.slice(0, 32).forEach(doc => {
      const tile = document.createElement('div');
      tile.className = 'doc-tile';
      tile.innerHTML = `
        <div class="doc-tile-head">
          <span class="doc-tag">${doc.subject}</span>
          <span class="doc-year">${doc.year}</span>
        </div>
        <div class="doc-heading">${doc.title}</div>
        <div class="doc-auth">${doc.authors}</div>
        <div class="doc-snip">${doc.abstract}</div>
        <div class="doc-foot">
          <span>${doc.journal.length > 32 ? doc.journal.substring(0, 32) + '...' : doc.journal}</span>
          <strong style="color:var(--color-ink); font-family:var(--font-mono);">Cited: ${doc.cited_by}</strong>
        </div>
      `;
      tile.querySelector('.doc-heading').onclick = () => openModal(doc);
      grid.appendChild(tile);
    });
  }

  document.getElementById('doc-search').oninput = renderExplorer;
  document.getElementById('doc-filter-subj').onchange = renderExplorer;
  document.getElementById('doc-sort').onchange = renderExplorer;

  // =========================================================================
  // WORKING ⌘K COMMAND PALETTE (Hallmark Cobalt Signature)
  // =========================================================================
  const cmdBackdrop = document.getElementById('cmd-palette');
  const cmdTrigger = document.getElementById('cmd-trigger');
  const cmdInput = document.getElementById('cmd-input');
  const cmdResults = document.getElementById('cmd-results');

  function openCmdPalette() {
    cmdBackdrop.classList.add('active');
    cmdInput.value = '';
    renderCmdResults('');
    setTimeout(() => cmdInput.focus(), 50);
  }

  function closeCmdPalette() {
    cmdBackdrop.classList.remove('active');
  }

  cmdTrigger.onclick = openCmdPalette;
  cmdBackdrop.onclick = (e) => { if (e.target === cmdBackdrop) closeCmdPalette(); };

  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (cmdBackdrop.classList.contains('active')) closeCmdPalette();
      else openCmdPalette();
    } else if (e.key === 'Escape') {
      closeCmdPalette();
      modal.classList.remove('active');
    }
  });

  function renderCmdResults(q) {
    cmdResults.replaceChildren();
    const query = q.toLowerCase().trim();

    // 1. Navigation items
    const navItems = [
      { name: "View Knowledge Network", tabIdx: 0, type: "View" },
      { name: "View Semantic Word Cloud", tabIdx: 1, type: "View" },
      { name: "View Cross-Disciplinary Heatmap", tabIdx: 2, type: "View" },
      { name: "View Strategic Growth Quadrant", tabIdx: 3, type: "View" },
      { name: "View EDA Descriptive Metrics", tabIdx: 4, type: "View" },
      { name: "Search Literature Explorer", tabIdx: 5, type: "View" }
    ];

    navItems.forEach(item => {
      if (!query || item.name.toLowerCase().includes(query)) {
        const d = document.createElement('div');
        d.className = 'cmd-item';
        d.innerHTML = `<span class="cmd-item-title">${item.name}</span><span class="cmd-item-meta">${item.type}</span>`;
        d.onclick = () => {
          closeCmdPalette();
          navTabs[item.tabIdx].click();
        };
        cmdResults.appendChild(d);
      }
    });

    // 2. Keyword hits
    if (query) {
      const kwHits = data.nodes.filter(n => n.name.toLowerCase().includes(query)).slice(0, 5);
      kwHits.forEach(kw => {
        const d = document.createElement('div');
        d.className = 'cmd-item';
        d.innerHTML = `<span class="cmd-item-title">${kw.name} (${kw.df} papers)</span><span class="cmd-item-meta">Keyword</span>`;
        d.onclick = () => {
          closeCmdPalette();
          navTabs[5].click();
          document.getElementById('doc-search').value = kw.name;
          renderExplorer();
        };
        cmdResults.appendChild(d);
      });
    }
  }

  cmdInput.oninput = (e) => renderCmdResults(e.target.value);

  // Resize handler
  window.addEventListener('resize', () => {
    if (chartNetwork) chartNetwork.resize();
    if (chartWordCloud) chartWordCloud.resize();
    if (chartHeatmap) chartHeatmap.resize();
    if (chartQuadrant) chartQuadrant.resize();
    if (chartSubjectBar) chartSubjectBar.resize();
    if (chartYearTrend) chartYearTrend.resize();
  });

  // Init
  renderNetwork();
})();
