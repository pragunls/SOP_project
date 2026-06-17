/* SOP Portal — Global State
   Persists across router navigations via in-memory object. */

export const AppState = {
  // Current user
  currentUser: {
    id: 1,
    name: 'Rajesh Kumar',
    initials: 'RK',
    role: 'Process Engineer',
    email: 'r.kumar@hpcl.in',
  },

  // Wizard draft state — persists across steps
  sopDraft: {
    // Step 1
    refinery: null,        // { code, name, state }
    department: null,      // { code, name }
    // Step 2
    unit: null,            // { code, name }
    // Step 3
    title: '',
    sop_number: '',
    version: '1.0',
    effective_date: '',
    prepared_by: '',
    tags: [],
    sections: [
      { id: 1, key: 'introduction', name: 'Introduction',           components: [] },
      { id: 2, key: 'scope',        name: 'Scope',                  components: [] },
      { id: 3, key: 'procedure',    name: 'Procedure',              components: [] },
      { id: 4, key: 'safety',       name: 'Safety & Precautions',   components: [] },
      { id: 5, key: 'results',      name: 'Results / Observations', components: [] },
      { id: 6, key: 'conclusion',   name: 'Conclusion',             components: [] },
    ],
    activeSectionId: 1,
    approvalChain: [],
  },

  // Current wizard step (1–4)
  wizardStep: 1,

  // Dashboard filters
  dashboardFilters: {
    search: '',
    refinery: '',
    department: '',
    status: '',
    date: '',
  },

  // Dashboard pagination
  dashboardPage: 1,
  dashboardPageSize: 10,

  // Reference data
  refineries: [
    { code: 'MUM', name: 'Mumbai Refinery', state: 'Maharashtra' },
    { code: 'VIZ', name: 'Vishakhapatnam Refinery', state: 'Andhra Pradesh' },
    { code: 'MUN', name: 'Mundra Refinery', state: 'Gujarat' },
    { code: 'BAT', name: 'Bathinda Refinery', state: 'Punjab' },
  ],

  departments: [
    { code: 'OPS', name: 'Operations' },
    { code: 'MNT', name: 'Maintenance' },
    { code: 'HSE', name: 'HSE' },
    { code: 'PRO', name: 'Process Engineering' },
    { code: 'QC',  name: 'Quality Control' },
    { code: 'UTL', name: 'Utilities' },
    { code: 'INS', name: 'Inspection' },
  ],

  units: [
    { code: 'NHT', name: 'NHT', full: 'Naphtha Hydrotreater', desc: 'Removes sulphur, nitrogen from naphtha feed prior to CCR processing.' },
    { code: 'CDU', name: 'CDU', full: 'Crude Distillation Unit', desc: 'Atmospheric distillation of crude oil into fractions by boiling point.' },
    { code: 'VDU', name: 'VDU', full: 'Vacuum Distillation Unit', desc: 'Further distillation of atmospheric residue under vacuum conditions.' },
    { code: 'CCR', name: 'CCR', full: 'Catalytic Reformer', desc: 'Converts naphtha into high-octane gasoline and aromatics continuously.' },
    { code: 'FCC', name: 'FCC', full: 'Fluid Catalytic Cracker', desc: 'Cracks heavy gas oil to produce petrol and lighter hydrocarbons.' },
    { code: 'HCU', name: 'HCU', full: 'Hydrocracker', desc: 'High-pressure hydrogenation for converting heavy oil to lighter products.' },
    { code: 'ARU', name: 'ARU', full: 'Amine Recovery Unit', desc: 'Recovers amine solution from acid gas streams for reuse.' },
    { code: 'SRU', name: 'SRU', full: 'Sulphur Recovery Unit', desc: 'Converts H₂S from refinery gas streams to elemental sulphur.' },
    { code: 'UTL', name: 'Utilities', full: 'Utilities Section', desc: 'Steam, power, cooling water and compressed air supply systems.' },
    { code: 'BLR', name: 'Boiler House', full: 'Boiler House', desc: 'Steam generation through fuel-fired boilers for process and power.' },
  ],

  roles: [
    'Unit Supervisor',
    'Department Head',
    'HSE Officer',
    'Plant Manager',
    'Operations Director',
  ],

  // Helper methods

  resetDraft() {
    this.sopDraft = {
      refinery: null,
      department: null,
      unit: null,
      title: '',
      sop_number: '',
      version: '1.0',
      effective_date: '',
      prepared_by: this.currentUser.name,
      tags: [],
      sections: [
        { id: 1,  key: 'introduction', name: 'Introduction',           components: [] },
        { id: 2,  key: 'scope',        name: 'Scope',                  components: [] },
        { id: 3,  key: 'procedure',    name: 'Procedure',              components: [] },
        { id: 4,  key: 'safety',       name: 'Safety & Precautions',   components: [] },
        { id: 5,  key: 'results',      name: 'Results / Observations', components: [] },
        { id: 6,  key: 'conclusion',   name: 'Conclusion',             components: [] },
      ],
      activeSectionId: 1,
      approvalChain: [],
    };
    this.wizardStep = 1;
  },

  generateSOPNumber() {
    const d = this.sopDraft;
    if (!d.refinery || !d.department || !d.unit) return '';
    const year = new Date().getFullYear();
    const seq = String(Math.floor(Math.random() * 900) + 100).padStart(3, '0');
    return `SOP-${d.refinery.code}-${d.department.code}-${d.unit.code}-${year}-${seq}`;
  },

  getTotalScore() {
    let total = 0;
    for (const section of this.sopDraft.sections) {
      for (const comp of section.components) {
        total += Number(comp.weight) || 0;
      }
    }
    return total;
  },

  getMaxScore() {
    let count = 0;
    for (const section of this.sopDraft.sections) {
      count += section.components.length;
    }
    return count * 9;
  },

  getTotalComponents() {
    return this.sopDraft.sections.reduce((acc, s) => acc + s.components.length, 0);
  },
};

// Expose globally for non-module scripts
window.AppState = AppState;
