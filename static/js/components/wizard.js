/* SOP Portal — Wizard Step Manager */

import { AppState } from '../state.js';
import { icons } from './icons.js';

const STEPS = [
  { label: 'Select Location' },
  { label: 'Select Unit' },
  { label: 'Build SOP' },
  { label: 'Submit & Route' },
];

export function renderWizardSteps(container, currentStep) {
  const total = STEPS.length;
  const fillPct = Math.max(0, ((currentStep - 1) / (total - 1)) * 100);

  container.innerHTML = `
    <div class="wizard-steps" role="tablist" aria-label="SOP creation steps">
      <div class="wizard-steps-track">
        <div class="wizard-steps-track-fill" style="width:${fillPct}%"></div>
      </div>
      ${STEPS.map((step, i) => {
        const stepNum = i + 1;
        const isCompleted = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;
        const cls = isCompleted ? 'completed' : isCurrent ? 'current' : '';
        const circleContent = isCompleted
          ? icons.check.replace('width="20"', 'width="14"').replace('height="20"', 'height="14"').replace('stroke-width="1.75"', 'stroke-width="3"')
          : stepNum;
        return `
          <div class="wizard-step ${cls}" role="tab" aria-selected="${isCurrent}" aria-label="Step ${stepNum}: ${step.label}">
            <div class="wizard-step-circle">${circleContent}</div>
            <div class="wizard-step-label">${step.label}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

export function showWizardStep(step) {
  document.querySelectorAll('.wizard-pane').forEach((pane, i) => {
    pane.classList.toggle('active', i + 1 === step);
  });
  AppState.wizardStep = step;
  // Re-render step indicator
  const stepsContainer = document.querySelector('.wizard-steps-card');
  if (stepsContainer) renderWizardSteps(stepsContainer, step);
  // Update breadcrumb
  const breadcrumb = document.getElementById('breadcrumb');
  if (breadcrumb) updateBreadcrumb(breadcrumb, step);
}

function updateBreadcrumb(el, step) {
  el.innerHTML = `
    <span class="breadcrumb-item" onclick="navigate('#dashboard')" tabindex="0" role="link">Dashboard</span>
    <span class="breadcrumb-separator">›</span>
    <span class="breadcrumb-item" onclick="navigate('#new-sop')" tabindex="0" role="link">New SOP</span>
    <span class="breadcrumb-separator">›</span>
    <span class="breadcrumb-item active">Step ${step}: ${STEPS[step-1]?.label}</span>
  `;
}
