export const INTERACTIVE_TOUR_STORAGE_KEY = 'si_interactive_tour_v1';

// Keep the tour focused on the decisions a new store operator needs to make.
// Navigation and search are real interactions; metrics and formulas are
// explanations so the user is not forced to click through every control.
export const INTERACTIVE_TOUR_STEPS = [
  {
    id: 'overview-nav',
    area: 'overview',
    type: 'click',
    selector: '[data-tour="sidebar-overview"]',
    eyebrow: 'Understand your store',
    title: 'Start at Overview',
    body: 'Click Overview to see today\'s sales, stock health, and the work that needs attention first.',
    action: 'Click Overview to continue',
  },
  {
    id: 'overview-kpis',
    area: 'overview',
    type: 'explanation',
    selector: '[data-tour="overview-kpis"]',
    eyebrow: 'Overview · read the cards',
    title: 'Today at a glance',
    body: 'These four cards summarize combined revenue, counter sales, online sales, and products at or below their reorder point.',
  },
  {
    id: 'overview-revenue-trend',
    area: 'overview',
    type: 'explanation',
    selector: '[data-tour="overview-revenue-trend"]',
    eyebrow: 'Overview · read the trend',
    title: 'Revenue over the last 30 days',
    body: 'This chart combines counter and online revenue. Hover a point to see the exact KES amount for that day and notice whether the direction is improving or weakening.',
  },
  {
    id: 'overview-restocking',
    area: 'overview',
    type: 'click',
    selector: '[data-tour="overview-restocking"]',
    eyebrow: 'Overview · 3 of 3',
    title: 'Follow a stock signal',
    body: 'Click Needs restocking to open the products that need replenishment. If the number is zero, your current stock is above its reorder point.',
    action: 'Click Needs restocking to continue',
    optional: true,
  },
  {
    id: 'inventory-nav',
    area: 'inventory',
    type: 'click',
    selector: '[data-tour="sidebar-inventory"]',
    eyebrow: 'Manage inventory',
    title: 'Open Inventory',
    body: 'Click Inventory to see every product and where its units are: backroom, in transit, or on the shop floor.',
    action: 'Click Inventory to continue',
  },
  {
    id: 'inventory-search',
    area: 'inventory',
    type: 'task',
    selector: '[data-tour="inventory-search"]',
    eyebrow: 'Inventory · 2 of 3',
    title: 'Find a product',
    body: 'Type a product name or SKU into this search box. Searching is safe and does not change stock.',
    action: 'Type a product name or SKU',
  },
  {
    id: 'inventory-table',
    area: 'inventory',
    type: 'explanation',
    selector: '[data-tour="inventory-table"]',
    eyebrow: 'Inventory · 3 of 3',
    title: 'Understand stock locations',
    body: 'Backroom is warehouse stock, in transit is released but not yet confirmed, and shop floor is sellable stock. Release moves units into transit; staff confirmation moves them to the shop floor.',
  },
  {
    id: 'replenishment-method',
    area: 'replenishment',
    type: 'explanation',
    selector: '[data-tour="replenishment-method"]',
    eyebrow: 'Reorder intelligence',
    title: 'Why this queue exists',
    body: 'The reorder point is computed, not guessed. Use the urgency, days of cover, supplier, and suggested order columns to decide what to replenish first.',
  },
  {
    id: 'dead-stock-area',
    area: 'dead-stock',
    type: 'explanation',
    selector: '[data-tour="area-dead-stock"]',
    eyebrow: 'Dead stock',
    title: 'Turn slow stock into a decision',
    body: 'This view ranks trapped value using cost price and shop-floor units. Use it to decide whether to bundle, discount, or feature a product.',
  },
  {
    id: 'abc-area',
    area: 'abc-classification',
    type: 'explanation',
    selector: '[data-tour="area-abc-classification"]',
    eyebrow: 'ABC classification',
    title: 'Prioritize control',
    body: 'Class A products carry the most value and deserve frequent counts. Class B needs moderate attention; Class C can use lighter control.',
  },
  {
    id: 'purchasing-nav',
    area: 'purchasing',
    type: 'click',
    selector: '[data-tour="sidebar-purchasing"]',
    eyebrow: 'Buy with visibility',
    title: 'Open Purchasing',
    body: 'Click Purchasing to manage suppliers and move purchase orders from Draft to Ordered to Received.',
    action: 'Click Purchasing to continue',
  },
  {
    id: 'purchasing-lifecycle',
    area: 'purchasing',
    type: 'explanation',
    selector: '[data-tour="purchasing-lifecycle"]',
    eyebrow: 'Purchasing',
    title: 'Follow the purchase lifecycle',
    body: 'Draft records the plan, Ordered records the commitment, and Receive is the step that adds physically received stock to the backroom.',
  },
  {
    id: 'suppliers-area',
    area: 'suppliers',
    type: 'explanation',
    selector: '[data-tour="area-suppliers"]',
    eyebrow: 'Supplier scorecards',
    title: 'Choose suppliers with evidence',
    body: 'Use the scorecards to see which supplier commitments arrive on time and which lead times are shaping your reorder recommendations.',
  },
  {
    id: 'stock-counts-area',
    area: 'stock-counts',
    type: 'explanation',
    selector: '[data-tour="area-stock-counts"]',
    eyebrow: 'Stock counts',
    title: 'Keep the system honest',
    body: 'A count captures the expected quantity first, then records the physical quantity and the resulting variance. Start counts only when you are ready to verify that location.',
  },
  {
    id: 'sales-area',
    area: 'sales',
    type: 'explanation',
    selector: '[data-tour="area-sales"]',
    eyebrow: 'Sales intelligence',
    title: 'Compare channels before acting',
    body: 'Use the channel mix to separate in-person performance from online orders, then ask Nawiri for a focused next step if the pattern is unclear.',
  },
  {
    id: 'fulfillment-nav',
    area: 'fulfillment',
    type: 'click',
    selector: '[data-tour="sidebar-fulfillment"]',
    eyebrow: 'Fulfil customer orders',
    title: 'Open Fulfillment',
    body: 'Click Fulfillment to see open orders and their current delivery or pickup status.',
    action: 'Click Fulfillment to continue',
  },
  {
    id: 'fulfillment-area',
    area: 'fulfillment',
    type: 'explanation',
    selector: '[data-tour="area-fulfillment"]',
    eyebrow: 'Fulfillment',
    title: 'See orders in motion',
    body: 'This is your operational view of open orders. Use the status and fulfillment type to know what is ready for the next handoff.',
  },
  {
    id: 'audit-area',
    area: 'audit-trail',
    type: 'explanation',
    selector: '[data-tour="area-audit-trail"]',
    eyebrow: 'Audit trail',
    title: 'Trust the ledger, not memory',
    body: 'Filter by actor or movement type when investigating a change. Transfer releases, staff receipts, stock counts, and AI actions remain attributable.',
  },
  {
    id: 'team-nav',
    area: 'team',
    type: 'click',
    selector: '[data-tour="sidebar-team"]',
    eyebrow: 'Administration and control',
    title: 'Open Team & controls',
    body: 'Click Team & controls to see operational roles and go to the people-and-permissions screen.',
    action: 'Click Team & controls to continue',
  },
  {
    id: 'team-area',
    area: 'team',
    type: 'explanation',
    selector: '[data-tour="area-team"]',
    eyebrow: 'Team & controls',
    title: 'Change access with care',
    body: 'Role changes affect real operations. Give each person only the permissions needed for their job, and assign staff to the correct branch for branch-scoped work.',
  },
  {
    id: 'assistant-nav',
    area: 'assistant',
    type: 'click',
    selector: '[data-tour="sidebar-assistant"]',
    eyebrow: 'AI assistance',
    title: 'Open Ask Nawiri',
    body: 'Click Ask Nawiri to ask a decision question using the selected live store data.',
    action: 'Click Ask Nawiri to continue',
  },
  {
    id: 'assistant-area',
    area: 'assistant',
    type: 'explanation',
    selector: '[data-tour="area-assistant"]',
    eyebrow: 'Ask Nawiri',
    title: 'Ask, then decide',
    body: 'Choose the data sources and time range, ask a precise question, and review the answer before taking any action. Nawiri stays read-only until you choose a real workflow.',
  },
];

export const getSavedTourState = () => {
  if (typeof window === 'undefined') return { status: 'new', stepIndex: 0 };
  try {
    const raw = window.localStorage.getItem(INTERACTIVE_TOUR_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const stepIndex = Number.isInteger(parsed?.stepIndex)
      ? Math.min(Math.max(parsed.stepIndex, 0), INTERACTIVE_TOUR_STEPS.length - 1)
      : 0;
    return { status: parsed?.status || 'new', stepIndex };
  } catch {
    return { status: 'new', stepIndex: 0 };
  }
};

export const saveTourState = (state) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(INTERACTIVE_TOUR_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // A blocked localStorage should not make the tour unusable for this visit.
  }
};
