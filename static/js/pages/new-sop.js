/* ============================================================
   SOP Portal — New SOP Page (Multi-Step Wizard)
   Steps: 1 Location → 2 Unit → 3 Build SOP → 4 Review & Submit
   ============================================================ */

import { AppState }        from '../state.js';
import { icons }           from '../components/icons.js';
import { renderWizardSteps, showWizardStep } from '../components/wizard.js';
import { renderSopBuilder }   from '../components/sop-builder.js';
import { renderApprovalChain } from '../components/approval-chain.js';
import { toast }           from '../utils/toast.js';
import { api }             from '../utils/api.js';

export function renderNewSop(container) {
  AppState.resetDraft();
  AppState.sopDraft.prepared_by = AppState.currentUser.name;

  container.innerHTML = `
    <nav class="breadcrumb" id="breadcrumb" aria-label="Breadcrumb">
      <span class="breadcrumb-item" onclick="navigate('#dashboard')" tabindex="0" role="link">Dashboard</span>
      <span class="breadcrumb-separator">›</span>
      <span class="breadcrumb-item active">New SOP</span>
    </nav>

    <div class="wizard-steps-card" id="wizard-steps-card"></div>

    <!-- Step 1: Location -->
    <div class="wizard-pane active" data-pane="1">
      <div class="wizard-card">
        <h1 class="wizard-card-title">Select Refinery &amp; Department</h1>
        <div class="step1-grid">
          <div>
            <div class="input-wrapper" style="margin-bottom:0;">
              <label class="input-label" id="refinery-label">Refinery</label>
              <div class="custom-dropdown" id="refinery-dropdown" aria-labelledby="refinery-label">
                <button type="button" class="custom-dropdown-trigger" id="refinery-trigger"
                  aria-haspopup="listbox" aria-expanded="false">
                  <span class="custom-dropdown-placeholder" id="refinery-display">Select refinery...</span>
                  <span aria-hidden="true">${icons.chevronDown.replace('width="20"','width="16"').replace('height="20"','height="16"')}</span>
                </button>
                <div class="custom-dropdown-menu" role="listbox" aria-labelledby="refinery-label">
                  <div class="custom-dropdown-search">
                    <div class="input-group">
                      <span class="input-icon">${icons.search.replace('width="20"','width="14"').replace('height="20"','height="14"')}</span>
                      <input type="text" class="input-field" id="refinery-search" placeholder="Search refineries..." aria-label="Search refineries" />
                    </div>
                  </div>
                  <div class="custom-dropdown-list" role="group" id="refinery-list">
                    ${AppState.refineries.map(r => `
                      <div class="custom-dropdown-option" role="option" aria-selected="false"
                        data-refinery='${JSON.stringify(r)}' tabindex="0">
                        <div>
                          <div>${escapeHtml(r.name)}</div>
                          <div class="custom-dropdown-option-sub">${escapeHtml(r.state)}</div>
                        </div>
                        <span style="display:none;color:var(--color-primary);">${icons.check.replace('width="20"','width="14"').replace('height="20"','height="14"')}</span>
                      </div>`).join('')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div class="input-wrapper" style="margin-bottom:0;">
              <label class="input-label" id="dept-label">Department</label>
              <div class="custom-dropdown" id="dept-dropdown" aria-labelledby="dept-label">
                <button type="button" class="custom-dropdown-trigger disabled" id="dept-trigger"
                  aria-haspopup="listbox" aria-expanded="false" disabled aria-disabled="true">
                  <span class="custom-dropdown-placeholder" id="dept-display">
                    ${icons.lock.replace('width="20"','width="12"').replace('height="20"','height="12"')}
                    Select refinery first
                  </span>
                  <span aria-hidden="true">${icons.chevronDown.replace('width="20"','width="16"').replace('height="20"','height="16"')}</span>
                </button>
                <div class="custom-dropdown-menu" role="listbox" aria-labelledby="dept-label">
                  <div class="custom-dropdown-list" role="group" id="dept-list">
                    ${AppState.departments.map(d => `
                      <div class="custom-dropdown-option" role="option" aria-selected="false"
                        data-dept='${JSON.stringify(d)}' tabindex="0">
                        ${escapeHtml(d.name)}
                        <span style="display:none;color:var(--color-primary);">${icons.check.replace('width="20"','width="14"').replace('height="20"','height="14"')}</span>
                      </div>`).join('')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="wizard-nav">
          <button class="btn btn-ghost" onclick="navigate('#dashboard')" type="button">Cancel</button>
          <button class="btn btn-danger" id="step1-next" disabled aria-disabled="true" type="button">
            Next ${icons['arrow-right'].replace('width="20"','width="16"').replace('height="20"','height="16"')}
          </button>
        </div>
      </div>
    </div>

    <!-- Step 2: Unit -->
    <div class="wizard-pane" data-pane="2">
      <div class="wizard-card">
        <h1 class="wizard-card-title">Select Process Unit</h1>
        <div class="unit-search-bar">
          <div class="input-group">
            <span class="input-icon">${icons.search.replace('width="20"','width="16"').replace('height="20"','height="16"')}</span>
            <input type="search" class="input-field" id="unit-search" placeholder="Search units..." aria-label="Search units" />
          </div>
        </div>
        <div class="units-grid" id="units-grid">${renderUnitsGrid()}</div>
        <div class="wizard-nav">
          <button class="btn btn-ghost" id="step2-back" type="button">
            ${icons['arrow-left'].replace('width="20"','width="16"').replace('height="20"','height="16"')} Back
          </button>
          <button class="btn btn-danger" id="step2-next" disabled aria-disabled="true" type="button">
            Next ${icons['arrow-right'].replace('width="20"','width="16"').replace('height="20"','height="16"')}
          </button>
        </div>
      </div>
    </div>

    <!-- Step 3: Build SOP -->
    <div class="wizard-pane" data-pane="3">
      <div id="sop-builder-container"></div>
      <div class="wizard-nav" style="background:var(--color-surface);padding:var(--space-5) var(--space-8);border-radius:var(--radius-md);box-shadow:var(--shadow-card);margin-top:var(--space-4);">
        <button class="btn btn-ghost" id="step3-back" type="button">
          ${icons['arrow-left'].replace('width="20"','width="16"').replace('height="20"','height="16"')} Back
        </button>
        <div class="wizard-nav-right">
          <button class="btn btn-outline" id="step3-draft" type="button">Save Draft</button>
          <button class="btn btn-danger" id="step3-next" type="button">
            Next ${icons['arrow-right'].replace('width="20"','width="16"').replace('height="20"','height="16"')}
          </button>
        </div>
      </div>
    </div>

    <!-- Step 4: Review & Submit -->
    <div class="wizard-pane" data-pane="4">
      <div class="wizard-card">
        <h1 class="wizard-card-title">Review &amp; Submit</h1>

        <div class="submit-summary-card" id="summary-card"></div>

        <!-- Approval Chain (manual) -->
        <div id="approval-chain-container"></div>

        <div class="card card-padded" style="margin-bottom:var(--space-6);">
          <label class="checkbox-wrap">
            <input type="checkbox" class="checkbox-input" id="declaration-check" />
            <span class="checkbox-label">
              I confirm this SOP is accurate and complete, and is ready for review.
            </span>
          </label>
        </div>

        <div class="wizard-nav">
          <button class="btn btn-ghost" id="step4-back" type="button">
            ${icons['arrow-left'].replace('width="20"','width="16"').replace('height="20"','height="16"')} Back
          </button>
          <div class="wizard-nav-right">
            <button class="btn btn-outline" id="step4-draft" type="button">Save Draft</button>
            <button class="btn btn-danger btn-lg" id="submit-btn" disabled aria-disabled="true" type="button">
              ${icons.send.replace('width="20"','width="16"').replace('height="20"','height="16"')}
              Submit SOP
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  renderWizardSteps(container.querySelector('#wizard-steps-card'), 1);
  initStep1(container);
  initStep2(container);
  initStep3(container);
  initStep4(container);
}

// ── Step 1 ──────────────────────────────────────────────────────
function initStep1(container) {
  const refineryDd      = container.querySelector('#refinery-dropdown');
  const refineryTrigger = container.querySelector('#refinery-trigger');
  const refinerySearch  = container.querySelector('#refinery-search');
  const deptDd          = container.querySelector('#dept-dropdown');
  const deptTrigger     = container.querySelector('#dept-trigger');
  const nextBtn         = container.querySelector('#step1-next');

  refineryTrigger.addEventListener('click', () => {
    refineryDd.classList.toggle('open');
    refineryTrigger.setAttribute('aria-expanded', refineryDd.classList.contains('open'));
  });

  refinerySearch?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    container.querySelectorAll('#refinery-list [data-refinery]').forEach(opt => {
      const r = JSON.parse(opt.dataset.refinery);
      opt.style.display = (r.name.toLowerCase().includes(q) || r.state.toLowerCase().includes(q)) ? '' : 'none';
    });
  });

  container.querySelectorAll('#refinery-list [data-refinery]').forEach(opt => {
    opt.addEventListener('click', () => selectRefinery(opt, container));
    opt.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') selectRefinery(opt, container); });
  });

  deptTrigger.addEventListener('click', () => {
    if (deptTrigger.disabled) return;
    deptDd.classList.toggle('open');
    deptTrigger.setAttribute('aria-expanded', deptDd.classList.contains('open'));
  });

  container.querySelectorAll('#dept-list [data-dept]').forEach(opt => {
    opt.addEventListener('click', () => selectDept(opt, container));
    opt.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') selectDept(opt, container); });
  });

  document.addEventListener('click', e => {
    if (!refineryDd.contains(e.target)) { refineryDd.classList.remove('open'); refineryTrigger.setAttribute('aria-expanded','false'); }
    if (!deptDd.contains(e.target)) { deptDd.classList.remove('open'); deptTrigger.setAttribute('aria-expanded','false'); }
  });

  nextBtn.addEventListener('click', () => {
    if (!AppState.sopDraft.refinery || !AppState.sopDraft.department) return;
    showWizardStep(2);
  });
}

function selectRefinery(opt, container) {
  const r = JSON.parse(opt.dataset.refinery);
  AppState.sopDraft.refinery = r;
  container.querySelector('#refinery-display').textContent = r.name;
  container.querySelector('#refinery-dropdown').classList.remove('open');
  container.querySelectorAll('#refinery-list [data-refinery]').forEach(o => {
    const sel = JSON.parse(o.dataset.refinery).code === r.code;
    o.classList.toggle('selected', sel);
    o.setAttribute('aria-selected', sel);
    o.querySelector('span').style.display = sel ? '' : 'none';
  });
  const deptTrigger = container.querySelector('#dept-trigger');
  deptTrigger.disabled = false;
  deptTrigger.removeAttribute('aria-disabled');
  deptTrigger.classList.remove('disabled');
  container.querySelector('#dept-display').textContent = 'Select department...';
  AppState.sopDraft.department = null;
  checkStep1Next(container);
}

function selectDept(opt, container) {
  const d = JSON.parse(opt.dataset.dept);
  AppState.sopDraft.department = d;
  container.querySelector('#dept-display').textContent = d.name;
  container.querySelector('#dept-dropdown').classList.remove('open');
  container.querySelectorAll('#dept-list [data-dept]').forEach(o => {
    const sel = JSON.parse(o.dataset.dept).code === d.code;
    o.classList.toggle('selected', sel);
    o.setAttribute('aria-selected', sel);
    o.querySelector('span').style.display = sel ? '' : 'none';
  });
  checkStep1Next(container);
}

function checkStep1Next(container) {
  const btn = container.querySelector('#step1-next');
  const ok  = !!(AppState.sopDraft.refinery && AppState.sopDraft.department);
  btn.disabled = !ok;
  btn.setAttribute('aria-disabled', !ok);
}

// ── Step 2 ──────────────────────────────────────────────────────
function initStep2(container) {
  container.querySelector('#step2-back')?.addEventListener('click', () => showWizardStep(1));

  container.querySelector('#step2-next')?.addEventListener('click', () => {
    if (!AppState.sopDraft.unit) return;
    AppState.sopDraft.sop_number = AppState.generateSOPNumber();
    renderSopBuilder(container.querySelector('#sop-builder-container'));
    showWizardStep(3);
  });

  container.querySelector('#unit-search')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    container.querySelectorAll('.unit-card').forEach(card => {
      const match = (card.dataset.unitName||'').includes(q) || (card.dataset.unitDesc||'').includes(q);
      card.style.display = match ? '' : 'none';
    });
  });

  container.querySelectorAll('.unit-card').forEach(card => {
    card.addEventListener('click', () => selectUnit(card, container));
    card.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') selectUnit(card, container); });
    card.querySelector('[data-select-unit]')?.addEventListener('click', e => { e.stopPropagation(); selectUnit(card, container); });
  });
}

function renderUnitsGrid() {
  return AppState.units.map(u => `
    <div class="unit-card card-hoverable" tabindex="0" role="radio" aria-checked="false"
      data-unit-code="${escapeHtml(u.code)}"
      data-unit='${JSON.stringify(u)}'
      data-unit-name="${escapeHtml(u.full.toLowerCase())} ${escapeHtml(u.name.toLowerCase())}"
      data-unit-desc="${escapeHtml(u.desc.toLowerCase())}"
      aria-label="Select ${escapeHtml(u.full)}">
      <div class="unit-card-check" aria-hidden="true">
        ${icons.check.replace('width="20"','width="12"').replace('height="20"','height="12"').replace('stroke-width="1.75"','stroke-width="3"')}
      </div>
      <div class="unit-icon" aria-hidden="true">
        ${icons['settings-2'].replace('width="20"','width="22"').replace('height="20"','height="22"')}
      </div>
      <div class="unit-name">${escapeHtml(u.name)} <span style="font-weight:400;font-size:12px;color:var(--color-text-secondary);">${escapeHtml(u.full)}</span></div>
      <div class="unit-desc">${escapeHtml(u.desc)}</div>
      <button class="btn btn-outline btn-sm unit-select-btn" data-select-unit="${escapeHtml(u.code)}" type="button">Select</button>
    </div>`).join('');
}

function selectUnit(card, container) {
  const unit = JSON.parse(card.dataset.unit);
  AppState.sopDraft.unit = unit;
  container.querySelectorAll('.unit-card').forEach(c => {
    const sel = c.dataset.unitCode === unit.code;
    c.classList.toggle('selected', sel);
    c.setAttribute('aria-checked', sel);
    const btn = c.querySelector('[data-select-unit]');
    if (btn) {
      btn.innerHTML = sel
        ? `${icons.check.replace('width="20"','width="12"').replace('height="20"','height="12"').replace('stroke-width="1.75"','stroke-width="3"')} Selected`
        : 'Select';
      btn.classList.toggle('btn-primary', sel);
      btn.classList.toggle('btn-outline', !sel);
    }
  });
  const next = container.querySelector('#step2-next');
  next.disabled = false;
  next.removeAttribute('aria-disabled');
}

// ── Step 3 ──────────────────────────────────────────────────────
function initStep3(container) {
  container.querySelector('#step3-back')?.addEventListener('click', () => showWizardStep(2));
  container.querySelector('#step3-draft')?.addEventListener('click', saveDraft);
  container.querySelector('#step3-next')?.addEventListener('click', () => {
    if (!AppState.sopDraft.title.trim()) {
      container.querySelector('#sop-title')?.focus();
      toast.error('Please enter an SOP title before continuing.');
      return;
    }
    renderSummaryCard(container.querySelector('#summary-card'));
    renderApprovalChain(container.querySelector('#approval-chain-container'));
    showWizardStep(4);
  });
}

// ── Step 4 ──────────────────────────────────────────────────────
function initStep4(container) {
  container.querySelector('#step4-back')?.addEventListener('click', () => showWizardStep(3));
  container.querySelector('#step4-draft')?.addEventListener('click', saveDraft);

  const submitBtn   = container.querySelector('#submit-btn');
  const declaration = container.querySelector('#declaration-check');

  declaration?.addEventListener('change', () => {
    submitBtn.disabled = !declaration.checked;
    submitBtn.setAttribute('aria-disabled', !declaration.checked);
  });

  submitBtn?.addEventListener('click', async () => {
    submitBtn.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span> Submitting…`;
    submitBtn.disabled = true;
    try {
      const created = await api.createSOP({ ...AppState.sopDraft, status: 'review' });
      toast.success('SOP submitted!', AppState.sopDraft.sop_number);
      setTimeout(() => navigate('#my-sops'), 1500);
    } catch (e) {
      toast.error('Submission failed', e.message);
      submitBtn.innerHTML = `${icons.send.replace('width="20"','width="16"').replace('height="20"','height="16"')} Submit SOP`;
      submitBtn.disabled = false;
    }
  });
}

function renderSummaryCard(el) {
  if (!el) return;
  const d     = AppState.sopDraft;
  const total = AppState.getTotalScore();
  const max   = AppState.getMaxScore();
  const pct   = max > 0 ? Math.round((total / max) * 100) : 0;

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4);">
      <h2 style="font-size:16px;font-weight:600;">SOP Summary</h2>
      <span class="pill pill-review">Ready to Submit</span>
    </div>
    <div class="summary-grid">
      <div class="summary-item">
        <div class="summary-item-label">SOP Number</div>
        <div class="summary-item-value mono">${escapeHtml(d.sop_number)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-item-label">Title</div>
        <div class="summary-item-value">${escapeHtml(d.title)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-item-label">Refinery</div>
        <div class="summary-item-value">${escapeHtml(d.refinery?.name||'—')}</div>
      </div>
      <div class="summary-item">
        <div class="summary-item-label">Department</div>
        <div class="summary-item-value">${escapeHtml(d.department?.name||'—')}</div>
      </div>
      <div class="summary-item">
        <div class="summary-item-label">Unit</div>
        <div class="summary-item-value">${escapeHtml(d.unit?.name||'—')}</div>
      </div>
      <div class="summary-item">
        <div class="summary-item-label">Sections / Components</div>
        <div class="summary-item-value">${d.sections.length} sections · ${AppState.getTotalComponents()} components</div>
      </div>
    </div>
    <div style="padding-top:var(--space-3);border-top:1px solid var(--color-border);">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;">
        <span style="color:var(--color-text-secondary);">Total Numerical Score</span>
        <span style="font-weight:700;color:var(--color-primary);font-family:var(--font-mono);">${total} / ${max}</span>
      </div>
      <div class="score-bar-track"><div class="score-bar-fill" style="width:${pct}%"></div></div>
    </div>
  `;
}

async function saveDraft() {
  try {
    await api.createSOP({ ...AppState.sopDraft, status: 'draft' });
    toast.success('Draft saved');
  } catch (e) {
    toast.error('Save failed', e.message);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}
