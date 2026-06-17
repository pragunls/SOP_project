/* ============================================================
   SOP Portal — Full SOP Builder (Step 3)
   6 required sections: Introduction, Scope, Procedure,
   Safety & Precautions, Results/Observations, Conclusion
   Each section: rich text, numbered steps, tables, images/charts
   ============================================================ */

import { AppState } from '../state.js';
import { api }      from '../utils/api.js';
import { toast }    from '../utils/toast.js';

// ── Section definitions ──────────────────────────────────────────
const REQUIRED_SECTIONS = [
  { key: 'introduction',  name: 'Introduction',           icon: 'info',        hint: 'Purpose and background of this SOP.' },
  { key: 'scope',         name: 'Scope',                  icon: 'file-text',   hint: 'Applicability, boundaries and responsible parties.' },
  { key: 'procedure',     name: 'Procedure',              icon: 'list-ordered',hint: 'Step-by-step instructions to execute this process.' },
  { key: 'safety',        name: 'Safety & Precautions',   icon: 'alert-circle',hint: 'Hazards, PPE requirements and safety measures.' },
  { key: 'results',       name: 'Results / Observations', icon: 'bar-chart',   hint: 'Expected outcomes, measurements and data recording.' },
  { key: 'conclusion',    name: 'Conclusion',             icon: 'check-circle',hint: 'Summary, sign-off and references.' },
];

let _compId = 1000;
function nextId() { return ++_compId; }

// ── Main render ──────────────────────────────────────────────────
export function renderSopBuilder(container) {
  const draft = AppState.sopDraft;

  // Ensure all required sections exist in draft
  ensureRequiredSections();

  container.innerHTML = builderHTML(draft);
  attachAllEvents(container);
  switchSection(draft.activeSectionId, container);
}

function ensureRequiredSections() {
  const existing = AppState.sopDraft.sections.map(s => s.key);
  REQUIRED_SECTIONS.forEach((def, i) => {
    if (!existing.includes(def.key)) {
      AppState.sopDraft.sections.splice(i, 0, {
        id: nextId(), key: def.key, name: def.name, components: []
      });
    }
  });
  if (!AppState.sopDraft.activeSectionId) {
    AppState.sopDraft.activeSectionId = AppState.sopDraft.sections[0]?.id;
  }
}

// ── HTML skeleton ────────────────────────────────────────────────
function builderHTML(draft) {
  const activeId = draft.activeSectionId;
  return `
<div class="full-builder-wrap">

  <!-- ── Left sidebar ── -->
  <div class="full-builder-sidebar">

    <!-- Import panel -->
    <div class="fb-import-panel">
      <div class="fb-panel-heading">
        ${i('cloud-upload','14')} Import PDF / DOCX
      </div>
      <div class="fb-drop-zone" id="fb-drop-zone" tabindex="0" role="button"
        aria-label="Drop PDF or DOCX to import">
        <span class="fb-drop-icon">${i('file-text','28')}</span>
        <span class="fb-drop-label">Drop file here or click</span>
        <span class="fb-drop-sub">PDF, DOCX · max 20 MB</span>
        <input type="file" id="fb-file-input" accept=".pdf,.docx,.doc"
          style="display:none" aria-hidden="true" />
      </div>
      <div class="fb-parse-status" id="fb-parse-status" style="display:none"></div>
    </div>

    <div class="fb-divider"></div>

    <!-- Metadata -->
    <div class="fb-meta-form">
      <div class="fb-panel-heading">${i('file-text','14')} SOP Details</div>

      <div class="input-wrapper">
        <label class="input-label" for="sop-title">Title *</label>
        <input type="text" id="sop-title" class="input-field"
          placeholder="Enter SOP title…" value="${esc(draft.title)}" />
      </div>
      <div class="input-wrapper">
        <label class="input-label">SOP Number</label>
        <input type="text" class="input-field meta-sop-number"
          id="sop-number" readonly value="${esc(draft.sop_number)}" tabindex="-1" />
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="input-wrapper">
          <label class="input-label">Version</label>
          <input type="text" class="input-field" value="${esc(draft.version)}" readonly tabindex="-1" />
        </div>
        <div class="input-wrapper">
          <label class="input-label" for="eff-date">Effective Date</label>
          <input type="date" id="eff-date" class="input-field" value="${esc(draft.effective_date)}" />
        </div>
      </div>
      <div class="input-wrapper">
        <label class="input-label">Prepared By</label>
        <input type="text" class="input-field" value="${esc(draft.prepared_by)}" readonly tabindex="-1" />
      </div>
      <div class="input-wrapper">
        <label class="input-label" for="sop-tags">Tags</label>
        <div class="tag-input-wrap" id="tag-wrap">
          ${draft.tags.map(t => tagChip(t)).join('')}
          <input type="text" class="tag-input-inner" id="sop-tags"
            placeholder="${draft.tags.length === 0 ? 'Type + Enter…' : ''}" />
        </div>
      </div>
    </div>

    <div class="fb-divider"></div>

    <!-- Section nav -->
    <div class="fb-sections-nav">
      <div class="fb-panel-heading">${i('list-ordered','14')} Sections</div>
      ${draft.sections.map((sec, idx) => {
        const def = REQUIRED_SECTIONS.find(d => d.key === sec.key) || {};
        const compCount = sec.components.length;
        return `
          <div class="fb-section-btn ${sec.id === activeId ? 'active' : ''}"
            data-nav-section="${sec.id}" tabindex="0" role="tab"
            aria-selected="${sec.id === activeId}">
            <span class="fb-section-icon">${i(def.icon || 'file-text','14')}</span>
            <span class="fb-section-label">${esc(sec.name)}</span>
            ${compCount > 0 ? `<span class="fb-comp-badge">${compCount}</span>` : ''}
          </div>`;
      }).join('')}
    </div>

  </div><!-- /sidebar -->

  <!-- ── Right editor ── -->
  <div class="full-builder-editor">

    ${draft.sections.map(sec => {
      const def = REQUIRED_SECTIONS.find(d => d.key === sec.key) || {};
      return `
      <div class="fb-section-panel ${sec.id === activeId ? 'active' : ''}"
        data-section-panel="${sec.id}">

        <div class="fb-editor-header">
          <div>
            <h2 class="fb-editor-title">${esc(sec.name)}</h2>
            ${def.hint ? `<p class="fb-editor-hint">${esc(def.hint)}</p>` : ''}
          </div>
          <div class="fb-toolbar">
            <button class="fb-tool-btn" data-add-comp="text" data-sec="${sec.id}"
              title="Add text block" aria-label="Add text">
              ${i('align-left','14')} Text
            </button>
            <button class="fb-tool-btn" data-add-comp="step" data-sec="${sec.id}"
              title="Add numbered steps" aria-label="Add steps">
              ${i('list-ordered','14')} Steps
            </button>
            <button class="fb-tool-btn" data-add-comp="table" data-sec="${sec.id}"
              title="Add table" aria-label="Add table">
              ${i('table','14')} Table
            </button>
            <button class="fb-tool-btn" data-add-comp="image" data-sec="${sec.id}"
              title="Add image/chart" aria-label="Add image">
              ${i('image','14')} Image
            </button>
          </div>
        </div>

        <div class="fb-comp-list" id="comp-list-${sec.id}" data-sec-list="${sec.id}">
          ${sec.components.length === 0 ? `
            <div class="fb-empty-section">
              <span style="color:var(--color-border)">${i('plus-circle','28')}</span>
              <span>Use the toolbar above to add content</span>
            </div>` : sec.components.map(c => componentCard(c)).join('')}
        </div>

      </div>`;
    }).join('')}

  </div><!-- /editor -->

</div><!-- /full-builder-wrap -->
  `;
}

// ── Component card HTML ──────────────────────────────────────────
function componentCard(comp) {
  const badges = { text:'badge-text', step:'badge-chart', table:'badge-table', image:'badge-image' };
  const labels = { text:'Text', step:'Numbered Steps', table:'Table', image:'Image / Chart' };
  return `
<div class="fb-comp-card" data-comp-id="${comp.id}" data-comp-type="${comp.type}" draggable="true">
  <div class="fb-comp-header">
    <span class="fb-drag-handle" aria-hidden="true">${i('drag','14')}</span>
    <span class="component-type-badge ${badges[comp.type]||'badge-text'}">${labels[comp.type]||comp.type}</span>
    <div class="fb-comp-actions">
      <label class="fb-weight-label" title="Weight 0–9">
        W: <input type="number" class="fb-weight-input" min="0" max="9"
          value="${comp.weight||0}" data-comp-weight="${comp.id}" aria-label="Weight" />
      </label>
      <button class="fb-del-btn" data-del-comp="${comp.id}" aria-label="Delete component">
        ${i('trash','14')}
      </button>
    </div>
  </div>
  <div class="fb-comp-body">
    ${componentBody(comp)}
  </div>
</div>`;
}

function componentBody(comp) {
  switch (comp.type) {
    case 'text': return `
      <div class="rte-wrap">
        <div class="rte-toolbar" role="toolbar">
          ${rteBtn('bold','B','Bold')}
          ${rteBtn('italic','I','Italic')}
          ${rteBtn('underline','U','Underline')}
          <div class="rte-sep"></div>
          ${rteBtn('insertUnorderedList', i('list','14'), 'Bullet list')}
          <div class="rte-sep"></div>
          ${rteBtnVal('formatBlock','h3', i('heading','14'), 'Heading')}
        </div>
        <div class="rte-content" contenteditable="true" data-rte="${comp.id}"
          role="textbox" aria-multiline="true">${comp.content||''}</div>
      </div>`;

    case 'step': return `
      <div class="step-editor" data-step-editor="${comp.id}">
        ${(comp.steps||['']).map((s,idx) => stepRow(comp.id, idx, s)).join('')}
        <button class="btn btn-ghost btn-sm" data-add-step="${comp.id}" type="button"
          style="margin-top:8px;">+ Add Step</button>
      </div>`;

    case 'table': return `
      <div class="fb-table-controls">
        <label style="font-size:12px;color:var(--color-text-secondary);">
          Rows: <input type="number" class="input-field" min="1" max="30"
            value="${comp.rows?.length||3}" data-tbl-rows="${comp.id}"
            style="width:56px;height:28px;text-align:center;" />
        </label>
        <label style="font-size:12px;color:var(--color-text-secondary);">
          Cols: <input type="number" class="input-field" min="1" max="10"
            value="${comp.rows?.[0]?.length||4}" data-tbl-cols="${comp.id}"
            style="width:56px;height:28px;text-align:center;" />
        </label>
        <button class="btn btn-outline btn-sm" data-gen-tbl="${comp.id}" type="button">
          Generate
        </button>
        <button class="btn btn-ghost btn-sm" data-add-row="${comp.id}" type="button">+ Row</button>
        <button class="btn btn-ghost btn-sm" data-add-col="${comp.id}" type="button">+ Col</button>
      </div>
      <div id="tbl-${comp.id}" data-tbl-wrap="${comp.id}" style="overflow-x:auto;">
        ${comp.rows ? editableTable(comp) : ''}
      </div>`;

    case 'image': return `
      <div class="fb-upload-zone" data-upload="${comp.id}" tabindex="0" role="button"
        aria-label="Click to upload image or chart">
        ${comp.src
          ? `<img src="${esc(comp.src)}" class="fb-img-preview" alt="preview" />`
          : `<span class="fb-upload-icon">${i('cloud-upload','28')}</span>
             <span class="fb-upload-label">Click or drag to upload image / chart</span>
             <span class="fb-upload-sub">PNG, JPG, SVG · max 10 MB</span>`}
        <input type="file" accept="image/*" style="display:none"
          data-file-inp="${comp.id}" aria-hidden="true" />
      </div>
      <div style="margin-top:8px;display:flex;flex-direction:column;gap:8px;">
        <input type="text" class="input-field" placeholder="Caption / chart title…"
          value="${esc(comp.caption||comp.chartTitle||'')}"
          data-img-caption="${comp.id}" />
        <input type="text" class="input-field" placeholder="Alt text…"
          value="${esc(comp.altText||'')}" data-img-alt="${comp.id}" />
      </div>`;

    default: return '';
  }
}

function stepRow(compId, idx, value) {
  return `
<div class="step-row" data-step-row="${compId}-${idx}">
  <span class="step-num">${idx+1}</span>
  <input type="text" class="input-field step-input"
    value="${esc(value)}" placeholder="Describe step ${idx+1}…"
    data-step-inp="${compId}-${idx}" aria-label="Step ${idx+1}" />
  <button class="step-del-btn" data-del-step="${compId}-${idx}"
    aria-label="Delete step" type="button">${i('x','12')}</button>
</div>`;
}

function editableTable(comp) {
  if (!comp.rows?.length) return '';
  return `<table class="editable-table">
    <thead><tr>${comp.rows[0].map((c,ci) =>
      `<th contenteditable="true" data-cell="${comp.id}-0-${ci}">${esc(c)}</th>`
    ).join('')}</tr></thead>
    <tbody>${comp.rows.slice(1).map((row,ri) =>
      `<tr>${row.map((c,ci) =>
        `<td contenteditable="true" data-cell="${comp.id}-${ri+1}-${ci}">${esc(c)}</td>`
      ).join('')}</tr>`
    ).join('')}</tbody>
  </table>`;
}

// ── Event wiring ─────────────────────────────────────────────────
function attachAllEvents(container) {
  // Section nav
  container.addEventListener('click', e => {
    const navBtn = e.target.closest('[data-nav-section]');
    if (navBtn) { switchSection(Number(navBtn.dataset.navSection), container); return; }

    const addComp = e.target.closest('[data-add-comp]');
    if (addComp) { addComponent(addComp.dataset.addComp, Number(addComp.dataset.sec), container); return; }

    const delComp = e.target.closest('[data-del-comp]');
    if (delComp) { deleteComponent(Number(delComp.dataset.delComp), container); return; }

    const genTbl = e.target.closest('[data-gen-tbl]');
    if (genTbl) { generateTable(Number(genTbl.dataset.genTbl), container); return; }

    const addRow = e.target.closest('[data-add-row]');
    if (addRow) { addTableRow(Number(addRow.dataset.addRow), container); return; }

    const addCol = e.target.closest('[data-add-col]');
    if (addCol) { addTableCol(Number(addCol.dataset.addCol), container); return; }

    const addStep = e.target.closest('[data-add-step]');
    if (addStep) { addStep_fn(Number(addStep.dataset.addStep), container); return; }

    const delStep = e.target.closest('[data-del-step]');
    if (delStep) { deleteStep(delStep.dataset.delStep, container); return; }

    const uploadZone = e.target.closest('[data-upload]');
    if (uploadZone && !e.target.closest('input[type=file]')) {
      uploadZone.querySelector('input[type=file]')?.click(); return;
    }

    const rteBtn2 = e.target.closest('[data-cmd]');
    if (rteBtn2) {
      document.execCommand(rteBtn2.dataset.cmd, false, rteBtn2.dataset.val || null);
      return;
    }
  });

  // Input syncing
  container.addEventListener('input', e => {
    if (e.target.dataset.rte)        syncRte(Number(e.target.dataset.rte), e.target.innerHTML);
    if (e.target.dataset.compWeight) syncWeight(Number(e.target.dataset.compWeight), e.target.value);
    if (e.target.dataset.imgCaption) syncProp(Number(e.target.dataset.imgCaption), 'caption', e.target.value);
    if (e.target.dataset.imgAlt)     syncProp(Number(e.target.dataset.imgAlt), 'altText', e.target.value);
    if (e.target.id === 'sop-title') AppState.sopDraft.title = e.target.value;
    if (e.target.id === 'eff-date')  AppState.sopDraft.effective_date = e.target.value;
    // Step input
    if (e.target.dataset.stepInp) {
      const [compId, idx] = e.target.dataset.stepInp.split('-').map(Number);
      const comp = findComp(compId);
      if (comp && comp.steps) comp.steps[idx] = e.target.value;
    }
  });

  // File upload
  container.addEventListener('change', e => {
    if (e.target.dataset.fileInp) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const compId = Number(e.target.dataset.fileInp);
        syncProp(compId, 'src', ev.target.result);
        const zone = container.querySelector(`[data-upload="${compId}"]`);
        if (zone) {
          let img = zone.querySelector('img.fb-img-preview');
          if (!img) { img = document.createElement('img'); img.className = 'fb-img-preview'; zone.prepend(img); }
          img.src = ev.target.result;
          zone.querySelectorAll('.fb-upload-icon,.fb-upload-label,.fb-upload-sub').forEach(el => el.style.display='none');
        }
      };
      reader.readAsDataURL(file);
    }
    if (e.target.id === 'fb-file-input') {
      const file = e.target.files[0];
      if (file) processImport(file, container);
    }
  });

  // Tags
  const tagWrap  = container.querySelector('#tag-wrap');
  const tagInput = container.querySelector('#sop-tags');
  if (tagInput && tagWrap) {
    tagInput.addEventListener('keydown', e => {
      if ((e.key==='Enter'||e.key===',') && tagInput.value.trim()) {
        e.preventDefault();
        const tag = tagInput.value.trim().replace(',','');
        if (!AppState.sopDraft.tags.includes(tag)) {
          AppState.sopDraft.tags.push(tag);
          const chip = document.createElement('span');
          chip.className = 'tag-chip';
          chip.innerHTML = `${esc(tag)}<button class="tag-chip-remove" type="button">×</button>`;
          chip.querySelector('.tag-chip-remove').addEventListener('click', () => {
            AppState.sopDraft.tags = AppState.sopDraft.tags.filter(t=>t!==tag);
            chip.remove();
          });
          tagWrap.insertBefore(chip, tagInput);
        }
        tagInput.value = '';
      }
    });
  }

  // Import drop zone
  const dz = container.querySelector('#fb-drop-zone');
  const fi = container.querySelector('#fb-file-input');
  if (dz && fi) {
    dz.addEventListener('click', () => fi.click());
    dz.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') fi.click(); });
    dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
    dz.addEventListener('drop', e => {
      e.preventDefault(); dz.classList.remove('drag-over');
      const f = e.dataTransfer.files[0];
      if (f) processImport(f, container);
    });
  }

  initDragToReorder(container);
}

// ── Section switching ─────────────────────────────────────────────
function switchSection(sectionId, container) {
  AppState.sopDraft.activeSectionId = sectionId;
  container.querySelectorAll('[data-section-panel]').forEach(p =>
    p.classList.toggle('active', Number(p.dataset.sectionPanel) === sectionId));
  container.querySelectorAll('[data-nav-section]').forEach(b => {
    const isActive = Number(b.dataset.navSection) === sectionId;
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-selected', isActive);
  });
}

// ── Component CRUD ────────────────────────────────────────────────
function addComponent(type, sectionId, container) {
  const sec = AppState.sopDraft.sections.find(s => s.id === sectionId);
  if (!sec) return;

  const comp = {
    id: nextId(), type, weight: 0,
    content: '', steps: [''],
    src: null, rows: null,
    caption: '', altText: '', chartTitle: '', chartDesc: '',
  };
  if (type === 'table') comp.rows = [['Header 1','Header 2','Header 3'],['','',''],['','','']];
  sec.components.push(comp);

  const list = container.querySelector(`#comp-list-${sectionId}`);
  if (list) {
    // Remove empty-section placeholder
    const empty = list.querySelector('.fb-empty-section');
    if (empty) empty.remove();
    const wrap = document.createElement('div');
    wrap.innerHTML = componentCard(comp);
    list.appendChild(wrap.firstElementChild);
    initDragToReorder(container);
  }
  // Update badge
  updateNavBadge(sectionId, container);
}

function deleteComponent(compId, container) {
  for (const sec of AppState.sopDraft.sections) {
    const idx = sec.components.findIndex(c => c.id === compId);
    if (idx !== -1) {
      sec.components.splice(idx, 1);
      container.querySelector(`[data-comp-id="${compId}"]`)?.remove();
      const list = container.querySelector(`[data-sec-list="${sec.id}"]`);
      if (list && sec.components.length === 0) {
        list.innerHTML = `<div class="fb-empty-section">
          <span style="color:var(--color-border)">${i('plus-circle','28')}</span>
          <span>Use the toolbar above to add content</span></div>`;
      }
      updateNavBadge(sec.id, container);
      return;
    }
  }
}

function updateNavBadge(sectionId, container) {
  const sec = AppState.sopDraft.sections.find(s => s.id === sectionId);
  const btn = container.querySelector(`[data-nav-section="${sectionId}"]`);
  if (!btn || !sec) return;
  let badge = btn.querySelector('.fb-comp-badge');
  if (sec.components.length > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'fb-comp-badge';
      btn.appendChild(badge);
    }
    badge.textContent = sec.components.length;
  } else {
    badge?.remove();
  }
}

// ── State syncing ─────────────────────────────────────────────────
function syncRte(compId, html) { syncProp(compId, 'content', html); }
function syncWeight(compId, val) { syncProp(compId, 'weight', Math.min(9, Math.max(0, Number(val)||0))); }
function syncProp(compId, prop, val) {
  const comp = findComp(compId);
  if (comp) comp[prop] = val;
}
function findComp(compId) {
  for (const s of AppState.sopDraft.sections)
    for (const c of s.components) if (c.id === compId) return c;
  return null;
}

// ── Numbered steps ────────────────────────────────────────────────
function addStep_fn(compId, container) {
  const comp = findComp(compId);
  if (!comp) return;
  if (!comp.steps) comp.steps = [];
  const idx = comp.steps.length;
  comp.steps.push('');
  const editor = container.querySelector(`[data-step-editor="${compId}"]`);
  if (!editor) return;
  const addBtn = editor.querySelector(`[data-add-step]`);
  const row = document.createElement('div');
  row.innerHTML = stepRow(compId, idx, '');
  editor.insertBefore(row.firstElementChild, addBtn);
}

function deleteStep(key, container) {
  const [compIdStr, idxStr] = key.split('-');
  const compId = Number(compIdStr), idx = Number(idxStr);
  const comp = findComp(compId);
  if (!comp || !comp.steps) return;
  comp.steps.splice(idx, 1);
  // Re-render entire step editor
  const editor = container.querySelector(`[data-step-editor="${compId}"]`);
  if (!editor) return;
  const addBtn = editor.querySelector('[data-add-step]');
  editor.querySelectorAll('.step-row').forEach(r => r.remove());
  comp.steps.forEach((s, i) => {
    const row = document.createElement('div');
    row.innerHTML = stepRow(compId, i, s);
    editor.insertBefore(row.firstElementChild, addBtn);
  });
}

// ── Table operations ──────────────────────────────────────────────
function generateTable(compId, container) {
  const rowsEl = container.querySelector(`[data-tbl-rows="${compId}"]`);
  const colsEl = container.querySelector(`[data-tbl-cols="${compId}"]`);
  const rows   = Math.max(1, Math.min(30, Number(rowsEl?.value)||3));
  const cols   = Math.max(1, Math.min(10, Number(colsEl?.value)||4));
  const header = Array.from({length:cols}, (_,i)=>`Header ${i+1}`);
  const body   = Array.from({length:rows-1}, ()=> Array(cols).fill(''));
  const comp   = findComp(compId);
  if (comp) { comp.rows = [header,...body]; rerenderTable(comp, container); }
}

function addTableRow(compId, container) {
  const comp = findComp(compId);
  if (!comp?.rows) return;
  comp.rows.push(Array(comp.rows[0]?.length||1).fill(''));
  rerenderTable(comp, container);
}

function addTableCol(compId, container) {
  const comp = findComp(compId);
  if (!comp?.rows) return;
  comp.rows = comp.rows.map((r,i) => [...r, i===0 ? `Header ${r.length+1}` : '']);
  rerenderTable(comp, container);
}

function rerenderTable(comp, container) {
  const wrap = container.querySelector(`[data-tbl-wrap="${comp.id}"]`);
  if (wrap) wrap.innerHTML = editableTable(comp);
}

// ── Drag-to-reorder components ────────────────────────────────────
let dragSrc = null;
function initDragToReorder(container) {
  container.querySelectorAll('.fb-comp-card').forEach(card => {
    card.addEventListener('dragstart', () => { dragSrc=card; card.style.opacity='0.5'; });
    card.addEventListener('dragend',   () => { dragSrc=null; card.style.opacity=''; });
    card.addEventListener('dragover',  e => { e.preventDefault(); card.style.outline='2px dashed var(--color-primary)'; });
    card.addEventListener('dragleave', () => { card.style.outline=''; });
    card.addEventListener('drop', e => {
      e.stopPropagation(); card.style.outline='';
      if (dragSrc && dragSrc !== card) {
        const parent = card.parentNode;
        const all = [...parent.querySelectorAll('.fb-comp-card')];
        const si = all.indexOf(dragSrc), di = all.indexOf(card);
        if (si < di) parent.insertBefore(dragSrc, card.nextSibling);
        else parent.insertBefore(dragSrc, card);
        // Sync state
        const secId = Number(parent.dataset.secList);
        const sec = AppState.sopDraft.sections.find(s=>s.id===secId);
        if (sec) {
          const order = [...parent.querySelectorAll('.fb-comp-card')].map(c=>Number(c.dataset.compId));
          sec.components.sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));
        }
      }
    });
  });
}

// ── Document import ───────────────────────────────────────────────
async function processImport(file, container) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['pdf','docx','doc'].includes(ext)) {
    showStatus(container, 'error', 'Only PDF and DOCX files supported.');
    return;
  }
  const dz = container.querySelector('#fb-drop-zone');
  dz?.classList.add('parsing');
  showStatus(container, 'loading',
    `<span class="btn-spinner" style="width:12px;height:12px;border-color:rgba(196,114,0,.3);border-top-color:var(--color-warning)"></span>
     Parsing <b>${esc(file.name)}</b>…`);

  try {
    const result = await api.parseDocument(file);
    dz?.classList.remove('parsing');
    if (result.error) { showStatus(container,'error',`Parse failed: ${esc(result.error)}`); return; }

    if (result.title && !AppState.sopDraft.title) {
      AppState.sopDraft.title = result.title;
      const t = container.querySelector('#sop-title');
      if (t) t.value = result.title;
    }

    // Merge parsed sections into required sections
    if (result.sections?.length) {
      let idC = 800;
      result.sections.forEach(parsedSec => {
        // Try to match to a required section by name similarity
        const matched = AppState.sopDraft.sections.find(s =>
          s.name.toLowerCase().includes(parsedSec.name.toLowerCase().split(' ')[0]) ||
          parsedSec.name.toLowerCase().includes(s.key)
        ) || AppState.sopDraft.sections[0];

        parsedSec.components?.forEach(c => {
          idC++;
          matched.components.push({
            id: idC, type: c.type||'text', weight:0,
            content: c.content||'', steps: c.steps||[''],
            src: c.src||null, rows: c.rows||null,
            caption: c.caption||'', altText: c.altText||'',
            chartTitle: c.chartTitle||'', chartDesc: c.chartDesc||'',
          });
        });
      });
      // Re-render builder with merged data
      renderSopBuilder(container);
    }

    const {text_blocks=0,tables=0,images=0} = result.stats||{};
    showStatus(container,'success',
      `✓ Imported: ${text_blocks} text · ${tables} tables · ${images} images`);
    toast.success('Document imported', file.name);
  } catch (err) {
    dz?.classList.remove('parsing');
    showStatus(container,'error',`Failed: ${esc(err.message)}`);
    toast.error('Import failed', err.message);
  }
}

function showStatus(container, type, html) {
  const el = container.querySelector('#fb-parse-status');
  if (!el) return;
  el.style.display = 'flex';
  el.className = `fb-parse-status doc-parse-${type}`;
  el.innerHTML = html;
}

// ── Helpers ───────────────────────────────────────────────────────
function i(name, size='20') {
  const map = {
    'cloud-upload': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>`,
    'file-text':    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    'list-ordered': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>`,
    'alert-circle': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    'bar-chart':    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    'check-circle': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    'plus-circle':  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
    'align-left':   `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>`,
    table:          `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>`,
    image:          `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
    info:           `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    drag:           `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/></svg>`,
    trash:          `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
    x:              `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    heading:        `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/></svg>`,
    list:           `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
  };
  return map[name] || map['file-text'];
}

function rteBtn(cmd, label, title) {
  return `<button class="rte-btn" data-cmd="${cmd}" title="${title}" type="button">${label}</button>`;
}
function rteBtnVal(cmd, val, label, title) {
  return `<button class="rte-btn" data-cmd="${cmd}" data-val="${val}" title="${title}" type="button">${label}</button>`;
}
function tagChip(tag) {
  return `<span class="tag-chip">${esc(tag)}<button class="tag-chip-remove" type="button">×</button></span>`;
}
function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}
