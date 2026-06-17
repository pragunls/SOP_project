/* ============================================================
   SOP Portal — Step 3: Build SOP
   Single centered card: Import panel + Metadata form only.
   No tabs, no section editor, no component toolbar.
   ============================================================ */

import { AppState } from '../state.js';
import { icons }    from './icons.js';
import { api }      from '../utils/api.js';
import { toast }    from '../utils/toast.js';

export function renderSopBuilder(container) {
  const draft = AppState.sopDraft;

  container.innerHTML = `
    <div class="builder-centered-wrap">
      <div class="builder-centered-card card">

        <!-- ── Import from PDF / DOCX ── -->
        <div class="builder-section-heading">
          ${icons['cloud-upload'].replace('width="20"','width="16"').replace('height="20"','height="16"')}
          Import from PDF / DOCX
        </div>

        <div class="doc-drop-zone" id="doc-drop-zone" tabindex="0" role="button"
          aria-label="Upload PDF or DOCX to auto-fill the form">
          <span class="doc-drop-icon" aria-hidden="true">
            ${icons['file-text'].replace('width="20"','width="36"').replace('height="20"','height="36"')}
          </span>
          <span class="doc-drop-text">Drop PDF or DOCX here<br/>or click to browse</span>
          <span class="doc-drop-sub">Max 20 MB · PDF, DOCX</span>
          <input type="file" id="doc-file-input" accept=".pdf,.docx,.doc"
            style="display:none;" aria-hidden="true" />
        </div>

        <div class="doc-parse-status" id="doc-parse-status" style="display:none;"></div>

        <div class="builder-divider"></div>

        <!-- ── Metadata Form ── -->
        <div class="builder-meta-form">

          <div class="input-wrapper">
            <label class="input-label" for="sop-title">SOP Title *</label>
            <input type="text" id="sop-title" class="input-field"
              placeholder="Enter SOP title..."
              value="${escapeHtml(draft.title)}" autocomplete="off" />
          </div>

          <div class="input-wrapper">
            <label class="input-label" for="sop-number">SOP Number (auto-generated)</label>
            <input type="text" id="sop-number" class="input-field meta-sop-number"
              readonly value="${escapeHtml(draft.sop_number)}" tabindex="-1" />
          </div>

          <div class="builder-row-2">
            <div class="input-wrapper">
              <label class="input-label">Version</label>
              <input type="text" class="input-field"
                value="${draft.version}" readonly tabindex="-1" />
            </div>
            <div class="input-wrapper">
              <label class="input-label" for="effective-date">Effective Date</label>
              <input type="date" id="effective-date" class="input-field"
                value="${draft.effective_date}" />
            </div>
          </div>

          <div class="input-wrapper">
            <label class="input-label">Prepared By</label>
            <input type="text" class="input-field"
              value="${escapeHtml(draft.prepared_by)}" readonly tabindex="-1" />
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

        </div><!-- /builder-meta-form -->

        <!-- ── Parsed Sections Preview (shown after import) ── -->
        <div id="parsed-preview" style="display:none;">
          <div class="builder-divider"></div>
          <div class="builder-section-heading" style="color:var(--color-success);">
            ${icons['check-circle'].replace('width="20"','width="16"').replace('height="20"','height="16"')}
            Extracted Content
          </div>
          <div id="parsed-preview-body"></div>
        </div>

      </div>
    </div>
  `;

  attachMetaEvents(container);
  initDocumentUpload(container);
}

// ── Metadata event wiring ──
function attachMetaEvents(container) {
  container.querySelector('#sop-title')?.addEventListener('input', (e) => {
    AppState.sopDraft.title = e.target.value;
  });

  container.querySelector('#effective-date')?.addEventListener('change', (e) => {
    AppState.sopDraft.effective_date = e.target.value;
  });

  const tagWrap  = container.querySelector('#tag-input-wrap');
  const tagInput = container.querySelector('#sop-tags');
  if (tagInput && tagWrap) {
    tagInput.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ',') && tagInput.value.trim()) {
        e.preventDefault();
        const tag = tagInput.value.trim().replace(',', '');
        if (!AppState.sopDraft.tags.includes(tag)) {
          AppState.sopDraft.tags.push(tag);
          const chip = document.createElement('span');
          chip.className = 'tag-chip';
          chip.innerHTML = `${escapeHtml(tag)}<button class="tag-chip-remove"
            aria-label="Remove tag" type="button">×</button>`;
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
}

// ── Document upload / parse ──
function initDocumentUpload(container) {
  const dropZone  = container.querySelector('#doc-drop-zone');
  const fileInput = container.querySelector('#doc-file-input');
  const statusEl  = container.querySelector('#doc-parse-status');

  if (!dropZone || !fileInput) return;

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') fileInput.click();
  });

  dropZone.addEventListener('dragover',  (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', ()  => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) processFile(file, container, statusEl, dropZone);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) processFile(fileInput.files[0], container, statusEl, dropZone);
  });
}

async function processFile(file, container, statusEl, dropZone) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['pdf','docx','doc'].includes(ext)) {
    showStatus(statusEl, 'error', 'Only PDF and DOCX files are supported.');
    return;
  }

  dropZone.classList.add('parsing');
  showStatus(statusEl, 'loading',
    `<span class="btn-spinner" style="border-color:rgba(196,114,0,0.3);border-top-color:var(--color-warning);width:12px;height:12px;"></span>
     Parsing <strong>${escapeHtml(file.name)}</strong>…`);

  try {
    const result = await api.parseDocument(file);
    dropZone.classList.remove('parsing');

    if (result.error) {
      showStatus(statusEl, 'error', `Parse failed: ${escapeHtml(result.error)}`);
      return;
    }

    // Auto-fill title
    if (result.title && !AppState.sopDraft.title) {
      AppState.sopDraft.title = result.title;
      const titleEl = container.querySelector('#sop-title');
      if (titleEl) titleEl.value = result.title;
    }

    // Store sections in draft
    if (result.sections?.length) {
      let idC = 500;
      AppState.sopDraft.sections = result.sections.map((sec) => {
        idC++;
        let cC = idC * 100;
        return {
          id: idC,
          name: sec.name || 'Section',
          components: (sec.components || []).map(c => ({
            id: ++cC, type: c.type || 'text',
            content: c.content || '', weight: 0,
            src: c.src || null, rows: c.rows || null,
            altText: c.altText || '', caption: c.caption || '',
            chartTitle: c.chartTitle || '', chartDesc: c.chartDesc || '',
          })),
        };
      });
      AppState.sopDraft.activeSectionId = AppState.sopDraft.sections[0]?.id;
      renderParsedPreview(container, result);
    }

    const { text_blocks = 0, tables = 0, images = 0 } = result.stats || {};
    showStatus(statusEl, 'success',
      `✓ Imported ${result.sections?.length || 0} sections · ${text_blocks} text · ${tables} tables · ${images} images`);

    toast.success('Document imported', file.name);

  } catch (err) {
    dropZone.classList.remove('parsing');
    showStatus(statusEl, 'error', `Failed: ${escapeHtml(err.message)}`);
    toast.error('Import failed', err.message);
  }
}

function renderParsedPreview(container, result) {
  const preview = container.querySelector('#parsed-preview');
  const body    = container.querySelector('#parsed-preview-body');
  if (!preview || !body) return;

  preview.style.display = 'block';
  body.innerHTML = result.sections.map(sec => `
    <div class="parsed-section">
      <div class="parsed-section-name">${escapeHtml(sec.name)}</div>
      <div class="parsed-section-chips">
        ${(sec.components || []).map(c => {
          const labels = { text:'Text', table:'Table', image:'Image', chart:'Chart' };
          const colors = { text:'badge-text', table:'badge-table', image:'badge-image', chart:'badge-chart' };
          return `<span class="component-type-badge ${colors[c.type]||'badge-text'}">${labels[c.type]||c.type}</span>`;
        }).join('')}
        ${sec.components?.length === 0 ? '<span style="font-size:12px;color:var(--color-text-secondary);">No components</span>' : ''}
      </div>
    </div>
  `).join('');
}

function showStatus(el, type, html) {
  if (!el) return;
  el.style.display = 'flex';
  el.className = `doc-parse-status doc-parse-${type}`;
  el.innerHTML = html;
}

function renderTag(tag) {
  return `<span class="tag-chip">${escapeHtml(tag)}<button class="tag-chip-remove"
    type="button" aria-label="Remove tag">×</button></span>`;
}

function escapeHtml(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}
