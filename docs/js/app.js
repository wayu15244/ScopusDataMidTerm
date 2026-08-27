// Scopus EDA & Keyword Analytics Platform
// Built with Apache ECharts & Vanilla JS

(function() {
  const data = window.__VIZ_DATA__ || {};
  if (!data.nodes || !data.nodes.length) {
    console.error("No dataset found!");
    return;
  }

  // Category palette
  const clusterColors = ['#2563eb', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'];
  const clusterNames = data.cluster_names || [
    "AI, Large Models & Deep Learning",
    "Networks, Cloud & Cybersecurity",
    "Computer Vision & Multimedia",
    "HCI, UI/UX & Interactive Systems",
    "Software Systems & Architecture"
  ];

  // Chart instances cache
  let chartNetwork = null;
  let chartWordCloud = null;
  let chartHeatmap = null;
  let chartQuadrant = null;
  let chartSubjectBar = null;
  let chartYearTrend = null;

  // Tab switching
  const tabBtns = document.querySelectorAll('.tab-btn');
  const viewPanes = document.querySelectorAll('.view-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      viewPanes.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      document.getElementById(targetId).classList.add('active');

      setTimeout(() => {
        if (targetId === 'tab-network') renderNetworkChart();
        else if (targetId === 'tab-wordcloud') renderWordCloudChart();
        else if (targetId === 'tab-heatmap') renderHeatmapChart();
        else if (targetId === 'tab-quadrant') renderQuadrantChart();
        else if (targetId === 'tab-eda') renderEdaCharts();
        else if (targetId === 'tab-explorer') renderExplorer();
      }, 50);
    });
  });

  // Modal
  const modal = document.getElementById('doc-modal');
  const modalClose = document.getElementById('modal-close');
  function openDocModal(doc) {
    document.getElementById('modal-title').textContent = doc.title;
    document.getElementById('modal-authors').textContent = doc.authors;
    document.getElementById('modal-subject').textContent = doc.subject;
    document.getElementById('modal-year').textContent = doc.year;
    document.getElementById('modal-journal').textContent = doc.journal;
    document.getElementById('modal-citations').textContent = doc.cited_by;
    const doiEl = document.getElementById('modal-doi');
    doiEl.href = `https://doi.org/${doc.doi}`;
    doiEl.textContent = doc.doi;
    document.getElementById('modal-abstract').textContent = doc.abstract;

    const kwContainer = document.getElementById('modal-keywords');
    kwContainer.replaceChildren();
    if (doc.keywords && doc.keywords.length) {
      doc.keywords.forEach(k => {
        if (k.trim()) {
          const span = document.createElement('span');
          span.className = 'kw-pill';
          span.textContent = k.trim();
          kwContainer.appendChild(span);
        }
      });
    }
    modal.classList.add('active');
  }
  modalClose.onclick = () => modal.classList.remove('active');
  modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };

  // =========================================================================
  // VIEW 1: KNOWLEDGE NETWORK (Force-Directed Graph with Collision Avoidance)
  // =========================================================================
  function renderNetworkChart() {
    const dom = document.getElementById('echarts-network');
    if (!chartNetwork) {
      chartNetwork = echarts.init(dom);
    }

    const minDocs = parseInt(document.getElementById('net-min-docs').value) || 10;
    const searchVal = (document.getElementById('net-search').value || '').toLowerCase().trim();
    const colorMode = document.getElementById('net-color-mode').value;

    const categories = clusterNames.map((name, i) => ({
      name: name,
      itemStyle: { color: clusterColors[i] }
    }));

    const validNodes = data.nodes.filter(n => n.df >= minDocs && (!searchVal || n.name.toLowerCase().includes(searchVal)));
    const validIdSet = new Set(validNodes.map(n => n.id));

    const graphNodes = validNodes.map(n => {
      // Scale node size smoothly
      const symbolSize = Math.max(12, Math.min(48, Math.sqrt(n.df) * 3.6));
      return {
        id: String(n.id),
        name: n.name,
        symbolSize: symbolSize,
        value: n.df,
        category: n.group - 1,
        avgYear: n.avg_year,
        label: {
          show: n.df >= 60 || (searchVal && n.name.toLowerCase().includes(searchVal)),
          fontSize: n.df >= 100 ? 12 : 10,
          fontWeight: n.df >= 100 ? 'bold' : 'normal'
        }
      };
    });

    const graphLinks = [];
    data.links.forEach(l => {
      if (validIdSet.has(l.s) && validIdSet.has(l.t)) {
        graphLinks.push({
          source: String(l.s),
          target: String(l.t),
          value: l.w,
          lineStyle: {
            width: Math.max(1, Math.min(6, Math.log1p(l.w) * 1.2)),
            opacity: 0.38
          }
        });
      }
    });

    const option = {
      tooltip: {
        trigger: 'item',
        formatter: function(params) {
          if (params.dataType === 'node') {
            return `<strong>${params.data.name}</strong><br>
              Category: ${clusterNames[params.data.category]}<br>
              Document Frequency: <strong>${params.data.value:,}</strong><br>
              Avg Publication Year: <strong>${params.data.avgYear}</strong><br>
              <em>Click to inspect related documents</em>`;
          } else {
            return `Co-occurrence: <strong>${params.data.value}</strong> documents`;
          }
        }
      },
      legend: {
        data: clusterNames,
        orient: 'horizontal',
        top: 10,
        textStyle: { fontSize: 11, color: '#334155' }
      },
      series: [{
        type: 'graph',
        layout: 'force',
        data: graphNodes,
        links: graphLinks,
        categories: categories,
        roam: true,
        label: {
          position: 'right',
          formatter: '{b}'
        },
        force: {
          repulsion: 380,
          gravity: 0.08,
          edgeLength: [60, 180],
          friction: 0.6
        },
        emphasis: {
          focus: 'adjacency',
          lineStyle: {
            width: 4,
            opacity: 0.8
          }
        }
      }]
    };

    chartNetwork.setOption(option, true);

    // Node click event: populate details sidebar
    chartNetwork.off('click');
    chartNetwork.on('click', function(params) {
      if (params.dataType === 'node') {
        const nodeId = parseInt(params.data.id);
        const nodeName = params.data.name;
        
        document.getElementById('side-kw-title').textContent = nodeName;
        document.getElementById('side-kw-sub').textContent = `Category: ${clusterNames[params.data.category]} · ${params.data.value} docs`;
        
        // Co-occurring keywords
        const related = [];
        data.links.forEach(l => {
          if (l.s === nodeId && validIdSet.has(l.t)) related.push({ name: data.nodes[l.t].name, w: l.w });
          else if (l.t === nodeId && validIdSet.has(l.s)) related.push({ name: data.nodes[l.s].name, w: l.w });
        });
        related.sort((a, b) => b.w - a.w);

        const relList = document.getElementById('side-related-list');
        relList.replaceChildren();
        related.slice(0, 8).forEach(item => {
          const div = document.createElement('div');
          div.style = 'display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:0.35rem;';
          div.innerHTML = `<span>${item.name}</span><strong style="color:#2563eb;">${item.w}</strong>`;
          relList.appendChild(div);
        });

        // Sample papers
        const paperList = document.getElementById('side-paper-list');
        paperList.replaceChildren();
        const matches = data.sample_documents.filter(d => 
          d.title.toLowerCase().includes(nodeName.toLowerCase()) || 
          (d.keywords && d.keywords.some(k => k.toLowerCase().includes(nodeName.toLowerCase())))
        );

        matches.slice(0, 5).forEach(doc => {
          const pDiv = document.createElement('div');
          pDiv.className = 'paper-item';
          pDiv.innerHTML = `<strong>${doc.title}</strong><div style="font-size:0.72rem; color:#64748b; margin-top:2px;">${doc.authors} (${doc.year}) · Cited: ${doc.cited_by}</div>`;
          pDiv.onclick = () => openDocModal(doc);
          paperList.appendChild(pDiv);
        });

        document.getElementById('side-default-msg').style.display = 'none';
        document.getElementById('side-selected-msg').style.display = 'block';
      }
    });
  }

  document.getElementById('net-apply').onclick = renderNetworkChart;
  document.getElementById('net-search').oninput = renderNetworkChart;

  // =========================================================================
  // VIEW 2: SEMANTIC WORD CLOUD
  // =========================================================================
  function renderWordCloudChart() {
    const dom = document.getElementById('echarts-wordcloud');
    if (!chartWordCloud) {
      chartWordCloud = echarts.init(dom);
    }

    const yearFilter = document.getElementById('wc-year').value;
    const maxWords = parseInt(document.getElementById('wc-max').value) || 50;

    let filtered = [...data.nodes];
    if (yearFilter !== 'all') {
      const yr = parseInt(yearFilter);
      filtered = filtered.filter(n => Math.abs(n.avg_year - yr) <= 1.4);
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
        formatter: function(params) {
          return `<strong>${params.data.name}</strong><br>
            Category: ${clusterNames[params.data.category]}<br>
            Document Count: <strong>${params.data.value}</strong><br>
            <em>Click to search in Document Explorer</em>`;
        }
      },
      series: [{
        type: 'wordCloud',
        shape: 'circle',
        left: 'center',
        top: 'center',
        width: '90%',
        height: '90%',
        sizeRange: [14, 54],
        rotationRange: [-30, 30],
        rotationStep: 15,
        gridSize: 12,
        drawOutOfBound: false,
        layoutAnimation: true,
        textStyle: {
          fontWeight: 'bold'
        },
        emphasis: {
          textStyle: {
            shadowBlur: 10,
            shadowColor: '#333'
          }
        },
        data: wcData
      }]
    };

    chartWordCloud.setOption(option, true);
    chartWordCloud.off('click');
    chartWordCloud.on('click', function(params) {
      tabBtns[5].click();
      document.getElementById('doc-search').value = params.name;
      renderExplorer();
    });
  }

  document.getElementById('wc-year').onchange = renderWordCloudChart;
  document.getElementById('wc-apply').onclick = renderWordCloudChart;

  // =========================================================================
  // VIEW 3: CROSS-DISCIPLINARY HEATMAP
  // =========================================================================
  function renderHeatmapChart() {
    const dom = document.getElementById('echarts-heatmap');
    if (!chartHeatmap) {
      chartHeatmap = echarts.init(dom);
    }

    const xKeywords = data.cross_keywords || [];
    const ySubjects = data.subject_matrix.map(r => r.subject);

    const heatData = [];
    let maxHeat = 0;
    data.subject_matrix.forEach((row, sIdx) => {
      row.counts.forEach((val, kIdx) => {
        heatData.push([kIdx, sIdx, val]);
        if (val > maxHeat) maxHeat = val;
      });
    });

    const option = {
      tooltip: {
        position: 'top',
        formatter: function(params) {
          return `<strong>${ySubjects[params.value[1]]}</strong><br>
            Topic: <em>${xKeywords[params.value[0]]}</em><br>
            Articles: <strong>${params.value[2]}</strong> papers`;
        }
      },
      grid: {
        top: 30,
        bottom: 90,
        left: 280,
        right: 60
      },
      xAxis: {
        type: 'category',
        data: xKeywords,
        splitArea: { show: true },
        axisLabel: {
          interval: 0,
          rotate: 35,
          color: '#1e293b',
          fontWeight: 600,
          fontSize: 11
        }
      },
      yAxis: {
        type: 'category',
        data: ySubjects,
        splitArea: { show: true },
        axisLabel: {
          color: '#1e293b',
          fontWeight: 600,
          fontSize: 12
        }
      },
      visualMap: {
        min: 0,
        max: maxHeat,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 10,
        inRange: {
          color: ['#f8fafc', '#93c5fd', '#2563eb', '#1e3a8a']
        }
      },
      series: [{
        type: 'heatmap',
        data: heatData,
        label: {
          show: true,
          formatter: function(p) {
            return p.value[2] > 0 ? p.value[2] : '';
          },
          fontSize: 11,
          color: '#0f172a'
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 8,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
          }
        }
      }]
    };

    chartHeatmap.setOption(option, true);
  }

  // =========================================================================
  // VIEW 4: STRATEGIC TOPIC GROWTH QUADRANT
  // =========================================================================
  function renderQuadrantChart() {
    const dom = document.getElementById('echarts-quadrant');
    if (!chartQuadrant) {
      chartQuadrant = echarts.init(dom);
    }

    const pts = data.quadrant || [];
    const seriesData = pts.map(p => ({
      name: p.name,
      value: [p.growth, p.recent, p.df],
      category: p.category,
      group: p.group - 1,
      itemStyle: {
        color: clusterColors[(p.group - 1) % 5]
      }
    }));

    const medianY = 90;

    const option = {
      tooltip: {
        formatter: function(params) {
          const d = params.data;
          return `<strong>${d.name}</strong><br>
            Strategic Category: <strong>${d.category}</strong><br>
            Normalized Growth Score (X): <strong>${d.value[0].toFixed(3)}</strong><br>
            Recent Volume (2024-2026) (Y): <strong>${d.value[1]} docs</strong><br>
            Total Document Frequency: <strong>${d.value[2]} docs</strong>`;
        }
      },
      grid: {
        left: 80,
        right: 60,
        top: 60,
        bottom: 70
      },
      xAxis: {
        name: 'Normalized Topic Growth Score: log₂(Recent / Prior)',
        nameLocation: 'center',
        nameGap: 35,
        type: 'value',
        splitLine: {
          lineStyle: { type: 'dashed', color: '#cbd5e1' }
        },
        axisLabel: { fontWeight: 600 }
      },
      yAxis: {
        name: 'Recent Document Volume (2024–2026)',
        nameLocation: 'center',
        nameGap: 45,
        type: 'value',
        splitLine: {
          lineStyle: { type: 'dashed', color: '#cbd5e1' }
        },
        axisLabel: { fontWeight: 600 }
      },
      series: [
        {
          type: 'scatter',
          symbolSize: function(val) {
            return Math.max(12, Math.min(38, Math.sqrt(val[2]) * 1.6));
          },
          data: seriesData,
          label: {
            show: true,
            formatter: function(p) {
              // Show label for prominent topics
              if (p.data.value[1] >= 90 || Math.abs(p.data.value[0]) >= 0.6) {
                return p.data.name;
              }
              return '';
            },
            position: 'top',
            fontSize: 10.5,
            color: '#1e293b',
            fontWeight: 'bold'
          },
          markLine: {
            silent: true,
            lineStyle: { color: '#64748b', type: 'dashed', width: 1.5 },
            data: [
              { xAxis: 0, label: { formatter: 'Zero Growth Threshold', position: 'end' } },
              { yAxis: medianY, label: { formatter: 'Median Volume Threshold', position: 'end' } }
            ]
          },
          markArea: {
            silent: true,
            itemStyle: { opacity: 0.04 },
            data: [
              [
                { name: 'High-Volume Emerging Topics', xAxis: 0, yAxis: medianY, itemStyle: { color: '#10b981' } },
                { xAxis: 5, yAxis: 300 }
              ],
              [
                { name: 'Core Established Topics', xAxis: -5, yAxis: medianY, itemStyle: { color: '#3b82f6' } },
                { xAxis: 0, yAxis: 300 }
              ],
              [
                { name: 'Emerging Niche Topics', xAxis: 0, yAxis: 0, itemStyle: { color: '#f59e0b' } },
                { xAxis: 5, yAxis: medianY }
              ],
              [
                { name: 'Specialized / Stable Topics', xAxis: -5, yAxis: 0, itemStyle: { color: '#94a3b8' } },
                { xAxis: 0, yAxis: medianY }
              ]
            ]
          }
        }
      ]
    };

    chartQuadrant.setOption(option, true);
  }

  // =========================================================================
  // VIEW 5: EXPLORATORY DATA METRICS (EDA Charts)
  // =========================================================================
  function renderEdaCharts() {
    const domSubject = document.getElementById('echarts-subject-bar');
    const domYear = document.getElementById('echarts-year-area');

    if (!chartSubjectBar) chartSubjectBar = echarts.init(domSubject);
    if (!chartYearTrend) chartYearTrend = echarts.init(domYear);

    // 1. Subject Bar Chart (Raw vs Cleaned)
    const subjects = Object.keys(data.subject_counts_raw);
    const rawVals = subjects.map(s => data.subject_counts_raw[s]);
    const cleanVals = subjects.map(s => data.subject_counts_cleaned[s]);

    chartSubjectBar.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: ['Raw Records', 'Cleaned Records (>=600)'], top: 10 },
      grid: { left: 240, right: 30, top: 45, bottom: 30 },
      xAxis: { type: 'value' },
      yAxis: { type: 'category', data: subjects, axisLabel: { fontSize: 11, fontWeight: 600 } },
      series: [
        { name: 'Raw Records', type: 'bar', data: rawVals, itemStyle: { color: '#cbd5e1' } },
        { name: 'Cleaned Records (>=600)', type: 'bar', data: cleanVals, itemStyle: { color: '#2563eb' }, markLine: { data: [{ xAxis: 600, label: { formatter: 'Req >= 600' } }], lineStyle: { color: '#ef4444' } } }
      ]
    }, true);

    // 2. Publication Year Area Trend
    const years = Object.keys(data.year_distribution);
    const yearCounts = Object.values(data.year_distribution);

    chartYearTrend.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 60, right: 30, top: 40, bottom: 40 },
      xAxis: { type: 'category', data: years, boundaryGap: false, axisLabel: { fontWeight: 600 } },
      yAxis: { type: 'value' },
      series: [{
        name: 'Publications',
        type: 'line',
        smooth: true,
        data: yearCounts,
        symbolSize: 8,
        itemStyle: { color: '#0284c7' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(2, 132, 199, 0.45)' },
            { offset: 1, color: 'rgba(2, 132, 199, 0.02)' }
          ])
        }
      }]
    }, true);
  }

  // =========================================================================
  // VIEW 6: SCOPUS DOCUMENT EXPLORER
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

    if (sortVal === 'citations') {
      filtered.sort((a, b) => b.cited_by - a.cited_by);
    } else if (sortVal === 'year-desc') {
      filtered.sort((a, b) => b.year - a.year);
    } else if (sortVal === 'year-asc') {
      filtered.sort((a, b) => a.year - b.year);
    }

    document.getElementById('explorer-status').textContent = `Showing ${filtered.length} publications matching query`;
    grid.replaceChildren();

    if (!filtered.length) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 2rem; color: #64748b;">No documents found matching your filter criteria.</div>';
      return;
    }

    filtered.slice(0, 30).forEach(doc => {
      const card = document.createElement('div');
      card.className = 'doc-card';
      card.innerHTML = `
        <div class="doc-header">
          <span class="doc-subj">${doc.subject}</span>
          <span class="doc-year">${doc.year}</span>
        </div>
        <div class="doc-title">${doc.title}</div>
        <div class="doc-authors">${doc.authors}</div>
        <div class="doc-abstract">${doc.abstract}</div>
        <div class="doc-footer">
          <span>${doc.journal.length > 35 ? doc.journal.substring(0, 35) + '...' : doc.journal}</span>
          <span class="doc-cited">Citations: ${doc.cited_by}</span>
        </div>
      `;
      card.querySelector('.doc-title').onclick = () => openDocModal(doc);
      grid.appendChild(card);
    });
  }

  document.getElementById('doc-search').oninput = renderExplorer;
  document.getElementById('doc-filter-subj').onchange = renderExplorer;
  document.getElementById('doc-sort').onchange = renderExplorer;

  // Window resize handler for all charts
  window.addEventListener('resize', () => {
    if (chartNetwork) chartNetwork.resize();
    if (chartWordCloud) chartWordCloud.resize();
    if (chartHeatmap) chartHeatmap.resize();
    if (chartQuadrant) chartQuadrant.resize();
    if (chartSubjectBar) chartSubjectBar.resize();
    if (chartYearTrend) chartYearTrend.resize();
  });

  // Init initial view
  renderNetworkChart();
})();
