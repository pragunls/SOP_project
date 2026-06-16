/* ============================================================
   SOP Portal — SOP Component Builder (Step 3)
   ============================================================ */

import { AppState } from '../state.js';
import { icons } from './icons.js';

let dragSrcEl = null;

export function renderSopBuilder(container) {
  const draft = AppState.sopDraft;
  container.innerHTML = `
    <div class="builder-layout">
      <!-- Left: Metadata + Section Manager -->
      <div class="builder-sidebar" id="builder-sidebar">
        <div class="meta-form">
          <div class="input-wrapper">
            <label class="input-label" for="sop-title">SOP Title *</label>
            <input type="text" id="sop-title" class="input-field" placeholder="Enter SOP title..."
              value="${escapeHtml(draft.title)}" autocomplete="off" />
          </div>
          <div class="input-wrapper">
            <label class="input-label" for="sop-number">SOP Number (auto-generated)</label>
            <input type="text" id="sop-number" class="input-field meta-sop-number" readonly
              value="${escapeHtml(draft.sop_number)}" tabindex="-1" />
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="input-wrapper">
              <label class="input-label">Version</label>
              <input type="text" class="input-field" value="${draft.version}" readonly tabindex="-1" />
            </div>
            <div class="input-wrapper">
              <label class="input-label" for="effective-date">Effective Date</label>
              <input type="date" id="effective-date" class="input-field"
                value="${draft.effective_date}" />
            </div>
          </div>
          <div class="input-wrapper">
            <label class="input-label">Prepared By</label>
            <input type="text" class="input-field" value="${escapeHtml(draft.prepared_by)}" readonly tabindex="-1" />
          </div>
          <div class="input-wrapper">
            <label class="input-label" for="sop-tags">Tags</label>
            <div class="tag-input-wrap" id="tag-input-wrap" role="group" aria-label="Tags">
              ${draft.tags.map(t => renderTag(t)).join('')}
              <input type="text" class="tag-input-inner" id="sop-tags"
                placeholder="${draft.tags.length === 0 ? 'Type and press Enter…' : ''}"
                aria-label="Add tag" />
            </div>
          </div>
        </div>

        <!-- Section Manager -->
        <div class="sections-manager">
          <div class="sections-manager-title">Sections</div>
          <div id="sections-list">
            ${draft.sections.map(s => renderSectionRow(s)).join('')}
          </div>
          <button class="btn btn-dashed" style="width:100%;margin-top:10px;font-size:13px;padding:8px;"
            id="add-section-btn" type="button" aria-label="Add new section">
            ${icons.plus.replace('width="20"','width="14"').replace('height="20"','height="14"')}
            Add Section
          </button>
        </div>
      </div>

      <!-- Right: Section builder -->
      <div class="builder-main" id="builder-main">
        <div class="builder-tabs tab-bar" id="section-tabs" role="tablist">
          ${draft.sections.map((s, i) => `
            <button class="tab-item ${s.id === draft.activeSectionId ? 'active' : ''}"
              data-section="${s.id}" role="tab"
              aria-selected="${s.id === draft.activeSectionId}"
              tabindex="${s.id === draft.activeSectionId ? '0' : '-1'}">
              ${escapeHtml(s.name)}
            </button>
          `).join('')}
        </div>

        <!-- Component Toolbar -->
        <div class="component-toolbar">
          <button class="toolbar-btn" data-add-component="text" type="button" aria-label="Add text component">
            ${icons['align-left'].replace('width="16"','width="14"').replace('height="16"','height="14"')} Text
          </button>
          <button class="toolbar-btn" data-add-component="chart" type="button" aria-label="Add chart component">
            ${icons['bar-chart'].replace('width="20"','width="14"').replace('height="20"','height="14"')} Chart
          </button>
          <button class="toolbar-btn" data-add-component="image" type="button" aria-label="Add image component">
            ${icons.image.replace('width="20"','width="14"').replace('height="20"','height="14"')} Image
          </button>
          <button class="toolbar-btn" data-add-component="table" type="button" aria-label="Add table component">
            ${icons.table.replace('width="20"','width="14"').replace('height="20"','height="14"')} Table
          </button>
        </div>

        <!-- Section Editors -->
        ${draft.sections.map(s => renderSectionEditor(s)).join('')}

        <div class="section-footer-bar">
          <span id="word-count">0 words</span>
          <span id="component-count">0 components</span>
        </div>
      </div>
    </div>
  `;

  attachBuilderEvents(container);
  switchToSection(draft.activeSectionId);
  updateFooterStats();
}

function renderSectionRow(section) {
  return `
    <div class="section-row" draggable="true" data-section-row="${section.id}">
      <span class="drag-handle" aria-hidden="true">${icons.drag.replace('width="20"','width="14"').replace('height="20"','height="14"')}</span>
      <input type="text" class="section-row-name" value="${escapeHtml(section.name)}"
        data-section-name="${section.id}" aria-label="Section name" />
      <button class="section-delete-btn" data-delete-section="${section.id}"
        aria-label="Delete section ${escapeHtml(section.name)}" type="button">
        ${icons.x.replace('width="20"','width="12"').replace('height="20"','height="12"')}
      </button>
    </div>
  `;
}

function renderSectionEditor(section) {
  return `
    <div class="section-editor" data-section-editor="${section.id}" role="tabpanel">
      <input type="text" class="section-edit-title" value="${escapeHtml(section.name)}"
        data-section-title="${section.id}" aria-label="Section title" />
      <div class="component-list" id="comp-list-${section.id}"
        data-section-comp-list="${section.id}">
        ${section.components.map(c => renderComponentCard(c, section.id)).join('')}
      </div>
    </div>
  `;
}

function renderComponentCard(comp, sectionId) {
  const badgeClass = { text: 'badge-text', chart: 'badge-chart', image: 'badge-image', table: 'badge-table' }[comp.type] || 'badge-text';
  const typeLabel  = comp.type.charAt(0).toUpperCase() + comp.type.slice(1);

  return `
    <div class="component-card" data-comp-id="${comp.id}" data-comp-type="${comp.type}" draggable="true">
      <div class="component-card-header">
        <span class="drag-handle" aria-hidden="true">${icons.drag.replace('width="20"','width="16"').replace('height="20"','height="16"')}</span>
        <span class="component-type-badge ${badgeClass}">${typeLabel}</span>
        <span style="flex:1"></span>
      </div>
      <div class="component-card-body">
        ${renderComponentBody(comp)}
      </div>
      <div class="component-card-footer">
        <div class="weight-input-group">
          <label class="weight-label" for="weight-${comp.id}">Weight (0–9):</label>
          <input type="number" id="weight-${comp.id}" class="weight-input"
            min="0" max="9" value="${comp.weight ?? 0}"
            data-comp-weight="${comp.id}"
            title="Assign a numerical weight to this component (0–9)"
            aria-label="Component weight" />
        </div>
        <button class="btn btn-ghost btn-sm btn-icon" data-delete-comp="${comp.id}"
          aria-label="Delete component" type="button"
          style="color:var(--color-text-secondary);">
          ${icons.trash.replace('width="20"','width="14"').replace('height="20"','height="14"')}
        </button>
      </div>
    </div>
  `;
}

function renderComponentBody(comp) {
  switch (comp.type) {
    case 'text':
      return `
        <div class="rte-toolbar" role="toolbar" aria-label="Text formatting">
          <button class="rte-btn" data-cmd="bold" title="Bold" aria-label="Bold" type="button">${icons.bold}</button>
          <button class="rte-btn" data-cmd="italic" title="Italic" aria-label="Italic" type="button">${icons.italic}</button>
          <button class="rte-btn" data-cmd="underline" title="Underline" aria-label="Underline" type="button">${icons.underline}</button>
          <div class="rte-separator" aria-hidden="true"></div>
          <button class="rte-btn" data-cmd="insertUnorderedList" title="Bullet list" aria-label="Bullet list" type="button">${icons.list}</button>
          <button class="rte-btn" data-cmd="insertOrderedList" title="Numbered list" aria-label="Numbered list" type="button">${icons['list-ordered']}</button>
          <div class="rte-separator" aria-hidden="true"></div>
          <button class="rte-btn" data-cmd="formatBlock" data-val="h3" title="Heading" aria-label="Heading" type="button">${icons.heading}</button>
        </div>
        <div class="rte-content" contenteditable="true" data-rte="${comp.id}"
          aria-label="Text content" aria-multiline="true"
          role="textbox">${comp.content || ''}</div>
      `;

    case 'chart':
      return `
        <div class="upload-area" id="upload-chart-${comp.id}" data-upload-area="${comp.id}" role="button" tabindex="0" aria-label="Upload chart image">
          ${comp.src
            ? `<img src="${escapeHtml(comp.src)}" class="upload-preview" alt="Chart preview" />`
            : `
              <span class="upload-area-icon">${icons['cloud-upload']}</span>
              <span class="upload-area-label">Upload chart image (PNG/JPG/SVG)</span>
              <span class="upload-area-sub">or drag and drop</span>
            `}
          <input type="file" accept="image/*" style="display:none" data-file-input="${comp.id}" aria-hidden="true" />
        </div>
        <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px;">
          <input type="text" class="input-field" placeholder="Chart title..." value="${escapeHtml(comp.chartTitle||'')}" data-chart-title="${comp.id}" aria-label="Chart title" />
          <textarea class="input-field" rows="2" placeholder="Describe what this chart shows..." data-chart-desc="${comp.id}" aria-label="Chart description">${escapeHtml(comp.chartDesc||'')}</textarea>
        </div>
      `;

    case 'image':
      return `
        <div class="upload-area" id="upload-img-${comp.id}" data-upload-area="${comp.id}" role="button" tabindex="0" aria-label="Upload image">
          ${comp.src
            ? `<img src="${escapeHtml(comp.src)}" class="upload-preview" alt="${escapeHtml(comp.altText||'Uploaded image')}" />`
            : `
              <span class="upload-area-icon">${icons['cloud-upload']}</span>
              <span class="upload-area-label">Upload image</span>
              <span class="upload-area-sub">PNG, JPG, GIF, WebP — max 10MB</span>
            `}
          <input type="file" accept="image/*" style="display:none" data-file-input="${comp.id}" aria-hidden="true" />
        </div>
        <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px;">
          <input type="text" class="input-field" placeholder="Alt text..." value="${escapeHtml(comp.altText||'')}" data-img-alt="${comp.id}" aria-label="Alt text" />
          <input type="text" class="input-field" placeholder="Caption (optional)..." value="${escapeHtml(comp.caption||'')}" data-img-caption="${comp.id}" aria-label="Caption" />
        </div>
      `;

    case 'table':
      return `
        <div class="table-editor-controls">
          <label style="font-size:13px;color:var(--color-text-secondary);">
            Rows:
            <input type="number" class="input-field" min="1" max="20" value="${comp.rows?.length || 3}" data-table-rows="${comp.id}" style="width:64px;height:32px;text-align:center;" aria-label="Number of rows" />
          </label>
          <label style="font-size:13px;color:var(--color-text-secondary);">
            Columns:
            <input type="number" class="input-field" min="1" max="10" value="${comp.rows?.[0]?.length || 4}" data-table-cols="${comp.id}" style="width:64px;height:32px;text-align:center;" aria-label="Number of columns" />
          </label>
          <button class="btn btn-outline btn-sm table-add-btn" data-gen-table="${comp.id}" type="button">
            Generate Table
          </button>
        </div>
        <div id="table-editor-${comp.id}" data-table-container="${comp.id}">
          ${comp.rows ? renderEditableTable(comp) : ''}
        </div>
        <div style="margin-top:8px;display:flex;gap:8px;">
          <button class="btn btn-ghost btn-sm" data-add-row="${comp.id}" type="button">+ Add Row</button>
          <button class="btn btn-ghost btn-sm" data-add-col="${comp.id}" type="button">+ Add Column</button>
        </div>
      `;

    default: return '';
  }
}

function renderEditableTable(comp) {
  if (!comp.rows || comp.rows.length === 0) return '';
  return `
    <table class="editable-table">
      <thead>
        <tr>${comp.rows[0].map((cell, ci) => `<th contenteditable="true" data-cell="${comp.id}-0-${ci}">${escapeHtml(cell)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${comp.rows.slice(1).map((row, ri) =>
          `<tr>${row.map((cell, ci) => `<td contenteditable="true" data-cell="${comp.id}-${ri+1}-${ci}">${escapeHtml(cell)}</td>`).join('')}</tr>`
        ).join('')}
      </tbody>
    </table>
  `;
}

// ── Event Delegation ──
function attachBuilderEvents(container) {
  // Title input sync
  container.querySelector('#sop-title')?.addEventListener('input', (e) => {
    AppState.sopDraft.title = e.target.value;
  });

  // Effective date sync
  container.querySelector('#effective-date')?.addEventListener('change', (e) => {
    AppState.sopDraft.effective_date = e.target.value;
  });

  // Tag input
  const tagWrap = container.querySelector('#tag-input-wrap');
  const tagInput = container.querySelector('#sop-tags');
  if (tagInput) {
    tagInput.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ',') && tagInput.value.trim()) {
        e.preventDefault();
        const tag = tagInput.value.trim().replace(',', '');
        if (!AppState.sopDraft.tags.includes(tag)) {
          AppState.sopDraft.tags.push(tag);
          const chip = document.createElement('span');
          chip.className = 'tag-chip';
          chip.innerHTML = `${escapeHtml(tag)}<button class="tag-chip-remove" aria-label="Remove tag ${escapeHtml(tag)}" type="button">×</button>`;
          chip.querySelector('.tag-chip-remove').addEventListener('click', () => {
            AppState.sopDraft.tags = AppState.sopDraft.tags.filter(t => t !== tag);
            chip.remove();
          });
          tagWrap.insertBefore(chip, tagInput);
        }
        tagInput.value = '';
      }
    });
  }

  // Section name sync
  container.addEventListener('input', (e) => {
    if (e.target.dataset.sectionName) {
      const id = Number(e.target.dataset.sectionName);
      const sec = AppState.sopDraft.sections.find(s => s.id === id);
      if (sec) {
        sec.name = e.target.value;
        // Sync tab label
        const tabBtn = container.querySelector(`[data-section="${id}"]`);
        if (tabBtn) tabBtn.textContent = e.target.value || 'Untitled';
        // Sync section editor title
        const titleInput = container.querySelector(`[data-section-title="${id}"]`);
        if (titleInput) titleInput.value = e.target.value;
      }
    }
    if (e.target.dataset.sectionTitle) {
      const id = Number(e.target.dataset.sectionTitle);
      const sec = AppState.sopDraft.sections.find(s => s.id === id);
      if (sec) sec.name = e.target.value;
    }
    // RTE content sync
    if (e.target.dataset.rte) {
      const compId = Number(e.target.dataset.rte);
      updateCompProp(compId, 'content', e.target.innerHTML);
      updateFooterStats();
    }
    // Weight sync
    if (e.target.dataset.compWeight) {
      const compId = Number(e.target.dataset.compWeight);
      const val = Math.min(9, Math.max(0, Number(e.target.value) || 0));
      updateCompProp(compId, 'weight', val);
    }
    // Chart/Image fields
    if (e.target.dataset.chartTitle)  updateCompProp(Number(e.target.dataset.chartTitle), 'chartTitle', e.target.value);
    if (e.target.dataset.chartDesc)   updateCompProp(Number(e.target.dataset.chartDesc), 'chartDesc', e.target.value);
    if (e.target.dataset.imgAlt)      updateCompProp(Number(e.target.dataset.imgAlt), 'altText', e.target.value);
    if (e.target.dataset.imgCaption)  updateCompProp(Number(e.target.dataset.imgCaption), 'caption', e.target.value);
  });

  // Click delegation
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add-component]');
    if (btn) { addComponent(btn.dataset.addComponent, container); return; }

    const deleteComp = e.target.closest('[data-delete-comp]');
    if (deleteComp) { deleteComponent(Number(deleteComp.dataset.deleteComp), container); return; }

    const deleteSection = e.target.closest('[data-delete-section]');
    if (deleteSection) { deleteSection_handler(Number(deleteSection.dataset.deleteSection), container); return; }

    const tab = e.target.closest('[data-section]');
    if (tab && tab.closest('.builder-tabs')) { switchToSection(Number(tab.dataset.section)); return; }

    const addSection = e.target.closest('#add-section-btn');
    if (addSection) { addSection_handler(container); return; }

    const genTable = e.target.closest('[data-gen-table]');
    if (genTable) { generateTable(Number(genTable.dataset.genTable), container); return; }

    const addRow = e.target.closest('[data-add-row]');
    if (addRow) { addTableRow(Number(addRow.dataset.addRow), container); return; }

    const addCol = e.target.closest('[data-add-col]');
    if (addCol) { addTableCol(Number(addCol.dataset.addCol), container); return; }

    // Upload area click
    const uploadArea = e.target.closest('[data-upload-area]');
    if (uploadArea && !e.target.closest('input[type=file]')) {
      uploadArea.querySelector('input[type=file]')?.click();
      return;
    }

    // RTE buttons
    const rteBtn = e.target.closest('[data-cmd]');
    if (rteBtn) {
      const cmd = rteBtn.dataset.cmd;
      const val = rteBtn.dataset.val || null;
      document.execCommand(cmd, false, val);
      rteBtn.classList.toggle('active', document.queryCommandState(cmd));
      return;
    }
  });

  // File input change
  container.addEventListener('change', (e) => {
    if (e.target.dataset.fileInput) {
      const file = e.target.files[0];
      if (!file) return;
      const compId = Number(e.target.dataset.fileInput);
      const reader = new FileReader();
      reader.onload = (ev) => {
        updateCompProp(compId, 'src', ev.target.result);
        const area = container.querySelector(`[data-upload-area="${compId}"]`);
        if (area) {
          let img = area.querySelector('img');
          if (!img) { img = document.createElement('img'); img.className = 'upload-preview'; area.prepend(img); }
          img.src = ev.target.result;
          img.alt = 'Uploaded preview';
          area.querySelectorAll('span').forEach(s => s.style.display = 'none');
        }
      };
      reader.readAsDataURL(file);
    }
  });

  // Drag-and-drop for file upload
  container.querySelectorAll('[data-upload-area]').forEach(area => {
    area.addEventListener('dragover', (e) => { e.preventDefault(); area.classList.add('drag-over'); });
    area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
    area.addEventListener('drop', (e) => {
      e.preventDefault();
      area.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) {
        const fakeEvent = { target: { files: [file], dataset: area.dataset } };
        const fakeInput = area.querySelector('input[type=file]');
        if (fakeInput) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          fakeInput.files = dataTransfer.files;
          fakeInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
  });

  initDragToReorder(container);
}

// ── Component CRUD ──
let compCounter = 100;

function addComponent(type, container) {
  const sectionId = AppState.sopDraft.activeSectionId;
  const section = AppState.sopDraft.sections.find(s => s.id === sectionId);
  if (!section) return;

  compCounter++;
  const comp = {
    id: compCounter,
    type,
    weight: 0,
    content: '',
    src: null,
    rows: type === 'table' ? [['Header 1','Header 2','Header 3'],['','','']] : null,
  };
  section.components.push(comp);

  const list = container.querySelector(`#comp-list-${sectionId}`);
  if (list) {
    const card = document.createElement('div');
    card.innerHTML = renderComponentCard(comp, sectionId);
    list.appendChild(card.firstElementChild);
    initDragToReorder(container);
  }
  updateFooterStats();
}

function deleteComponent(compId, container) {
  for (const section of AppState.sopDraft.sections) {
    const idx = section.components.findIndex(c => c.id === compId);
    if (idx !== -1) {
      section.components.splice(idx, 1);
      container.querySelector(`[data-comp-id="${compId}"]`)?.remove();
      updateFooterStats();
      return;
    }
  }
}

function updateCompProp(compId, prop, value) {
  for (const section of AppState.sopDraft.sections) {
    const comp = section.components.find(c => c.id === compId);
    if (comp) { comp[prop] = value; return; }
  }
}

// ── Section CRUD ──
let sectionCounter = 10;

function addSection_handler(container) {
  sectionCounter++;
  const newSection = { id: sectionCounter, name: 'New Section', components: [] };
  AppState.sopDraft.sections.push(newSection);

  const list = container.querySelector('#sections-list');
  if (list) {
    const row = document.createElement('div');
    row.innerHTML = renderSectionRow(newSection);
    list.appendChild(row.firstElementChild);
  }

  const tabs = container.querySelector('#section-tabs');
  if (tabs) {
    const tabBtn = document.createElement('button');
    tabBtn.className = 'tab-item';
    tabBtn.dataset.section = newSection.id;
    tabBtn.setAttribute('role', 'tab');
    tabBtn.setAttribute('aria-selected', 'false');
    tabBtn.setAttribute('tabindex', '-1');
    tabBtn.textContent = newSection.name;
    tabs.appendChild(tabBtn);
  }

  const main = container.querySelector('#builder-main');
  if (main) {
    const editorDiv = document.createElement('div');
    editorDiv.innerHTML = renderSectionEditor(newSection);
    main.insertBefore(editorDiv.firstElementChild, container.querySelector('.section-footer-bar'));
  }

  switchToSection(newSection.id);
}

function deleteSection_handler(sectionId, container) {
  const idx = AppState.sopDraft.sections.findIndex(s => s.id === sectionId);
  if (idx === -1 || AppState.sopDraft.sections.length <= 1) return;
  AppState.sopDraft.sections.splice(idx, 1);

  container.querySelector(`[data-section-row="${sectionId}"]`)?.remove();
  container.querySelector(`[data-section="${sectionId}"]`)?.remove();
  container.querySelector(`[data-section-editor="${sectionId}"]`)?.remove();

  const fallback = AppState.sopDraft.sections[0]?.id;
  if (fallback) switchToSection(fallback);
}

// ── Tab switching ──
function switchToSection(sectionId) {
  AppState.sopDraft.activeSectionId = sectionId;
  document.querySelectorAll('.section-editor').forEach(el => {
    el.classList.toggle('active', Number(el.dataset.sectionEditor) === sectionId);
  });
  document.querySelectorAll('[data-section]').forEach(btn => {
    const isActive = Number(btn.dataset.section) === sectionId;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive);
    btn.setAttribute('tabindex', isActive ? '0' : '-1');
  });
  updateFooterStats();
}

// ── Table Operations ──
function generateTable(compId, container) {
  const rowsInput = container.querySelector(`[data-table-rows="${compId}"]`);
  const colsInput = container.querySelector(`[data-table-cols="${compId}"]`);
  const rows = Math.max(1, Math.min(20, Number(rowsInput?.value) || 3));
  const cols = Math.max(1, Math.min(10, Number(colsInput?.value) || 4));

  const header = Array(cols).fill('').map((_, i) => `Header ${i+1}`);
  const body   = Array(rows - 1).fill(null).map(() => Array(cols).fill(''));
  const allRows = [header, ...body];

  updateCompProp(compId, 'rows', allRows);
  const comp = findComp(compId);
  if (comp) {
    const tableContainer = container.querySelector(`[data-table-container="${compId}"]`);
    if (tableContainer) tableContainer.innerHTML = renderEditableTable(comp);
  }
}

function addTableRow(compId, container) {
  const comp = findComp(compId);
  if (!comp || !comp.rows) return;
  const cols = comp.rows[0]?.length || 1;
  comp.rows.push(Array(cols).fill(''));
  const tableContainer = container.querySelector(`[data-table-container="${compId}"]`);
  if (tableContainer) tableContainer.innerHTML = renderEditableTable(comp);
}

function addTableCol(compId, container) {
  const comp = findComp(compId);
  if (!comp || !comp.rows) return;
  comp.rows = comp.rows.map((row, i) => [...row, i === 0 ? `Header ${row.length+1}` : '']);
  const tableContainer = container.querySelector(`[data-table-container="${compId}"]`);
  if (tableContainer) tableContainer.innerHTML = renderEditableTable(comp);
}

function findComp(compId) {
  for (const section of AppState.sopDraft.sections) {
    const c = section.components.find(c => c.id === compId);
    if (c) return c;
  }
  return null;
}

// ── Drag to Reorder Components ──
function initDragToReorder(container) {
  container.querySelectorAll('.component-card').forEach(card => {
    card.addEventListener('dragstart', onDragStart);
    card.addEventListener('dragover',  onDragOver);
    card.addEventListener('drop',      onDrop);
    card.addEventListener('dragend',   onDragEnd);
    card.addEventListener('dragleave', onDragLeave);
  });
}

function onDragStart(e) {
  dragSrcEl = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  this.style.borderColor = 'var(--color-primary)';
  this.style.borderStyle = 'dashed';
  return false;
}

function onDragLeave() {
  this.style.borderColor = '';
  this.style.borderStyle = '';
}

function onDrop(e) {
  e.stopPropagation();
  if (dragSrcEl !== this) {
    const parent = this.parentNode;
    const allCards = [...parent.querySelectorAll('.component-card')];
    const srcIdx  = allCards.indexOf(dragSrcEl);
    const dstIdx  = allCards.indexOf(this);
    if (srcIdx < dstIdx) parent.insertBefore(dragSrcEl, this.nextSibling);
    else parent.insertBefore(dragSrcEl, this);

    // Sync state order
    const sectionId = Number(parent.dataset.sectionCompList);
    const section = AppState.sopDraft.sections.find(s => s.id === sectionId);
    if (section) {
      const newOrder = [...parent.querySelectorAll('.component-card')].map(c => Number(c.dataset.compId));
      section.components.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
    }
  }
  this.style.borderColor = '';
  this.style.borderStyle = '';
  return false;
}

function onDragEnd() {
  this.classList.remove('dragging');
  document.querySelectorAll('.component-card').forEach(c => {
    c.style.borderColor = '';
    c.style.borderStyle = '';
  });
}

// ── Footer Stats ──
function updateFooterStats() {
  const sectionId = AppState.sopDraft.activeSectionId;
  const section = AppState.sopDraft.sections.find(s => s.id === sectionId);

  const wordCountEl = document.getElementById('word-count');
  const compCountEl = document.getElementById('component-count');
  if (!wordCountEl || !compCountEl || !section) return;

  let wordCount = 0;
  for (const comp of section.components) {
    if (comp.type === 'text' && comp.content) {
      const text = comp.content.replace(/<[^>]+>/g, ' ');
      wordCount += text.trim().split(/\s+/).filter(Boolean).length;
    }
  }
  wordCountEl.textContent = `${wordCount} words`;
  compCountEl.textContent = `${section.components.length} components`;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}
