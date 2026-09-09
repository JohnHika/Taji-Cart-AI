// Content for the Store Intelligence "?" guide drawer (GuideOverlay.jsx).
// Kept as a plain data module, separate from the component, so the text can
// be reviewed/edited without touching rendering logic. Each entry mirrors
// one sidebar area by id (see StoreManagementApp.jsx's `areas` array) plus a
// standalone 'getting-started' entry shown by default.

export const GUIDE_CONTENT = {
  'getting-started': {
    eyebrow: 'Start here',
    title: 'Getting started',
    tagline: 'What this workspace is, and how to find your way around it.',
    sections: [
      {
        heading: 'What Store Management is',
        body: [
          'A separate, gated ops console for the Nawiri Hair team — it opens only through a one-time hand-off from a signed-in admin session on the main Nawiri Hair site, and that access expires with this browser session.',
          'It reads and writes the same live data as the rest of the platform (the same products, sales, and orders) — there is no separate copy to keep in sync.',
        ],
      },
      {
        heading: 'Finding your way around',
        body: [
          'The left sidebar lists every area. Sell & watch: Overview, Sales intelligence, Fulfillment. Stock: Inventory, Reorder intelligence, Dead stock, ABC classification. Buy: Purchasing, Supplier scorecards. Verify: Stock counts, Audit trail. People: Team & controls. And Ask Nawiri, the copilot.',
          'Press ⌘K (or Ctrl+K) from anywhere to jump straight to an area by typing a few letters of its name.',
          'The light/dark toggle in the top bar is your own preference and follows you across the entire admin app, not just this workspace.',
          'This guide is always one click away — the ? button next to the theme toggle reopens it, pinned to whichever area you were last looking at.',
        ],
      },
      {
        heading: 'A habit worth building',
        body: [
          'Most numbers you will see here are computed from real sale, purchase-order, and movement history — not typed in by anyone. If a screen looks emptier or flatter than you expect (everything showing "no cost set", an ABC table that is entirely Class C), that is almost always a real, fixable data gap — usually a missing cost price — and the screen itself will tell you so.',
        ],
      },
    ],
  },

  overview: {
    eyebrow: 'Home base',
    title: 'Overview',
    tagline: 'One glance at today’s trade and what needs attention.',
    sections: [
      {
        heading: 'The four top tiles',
        body: [
          'Today’s revenue — counter and online combined, with total transaction count.',
          'Counter — in-person sales revenue and items sold today.',
          'Online — web order revenue and order count today.',
          'Needs restocking — how many products are at or below their computed reorder point right now, with the out-of-stock count called out separately.',
        ],
      },
      {
        heading: 'Revenue trend',
        body: [
          'Combined counter + online revenue for the last 30 days. Hover any point on the chart for the exact KES figure for that day.',
        ],
      },
      {
        heading: 'Stock health',
        body: [
          'A breakdown of every product currently below its reorder point, by urgency: Out of stock (critical, red), Reorder now (high, amber), Below reorder point (neutral). Click "Open reorder intelligence" to act on it.',
        ],
      },
      {
        heading: 'Top of the replenishment queue',
        body: [
          'The five most urgent products right now, with current stock and days of cover left at the current sales pace.',
        ],
      },
      {
        heading: 'Tip',
        body: [
          'This screen is read-only by design — every button on it hands you off to the area where you can actually take the action.',
        ],
      },
    ],
  },

  inventory: {
    eyebrow: 'Where the stock physically is',
    title: 'Inventory',
    tagline: 'Backroom vs. shop-floor stock for every product, and moving it between the two.',
    sections: [
      {
        heading: 'Reading the table',
        body: [
          'Search narrows the list by product name or SKU.',
          'Backroom — units in the warehouse, not yet available to sell on the shop floor.',
          'Shop floor — units physically available right now; the number turns red at 3 or fewer. That is a simple, fixed low-stock line, separate from the computed reorder point used in Reorder intelligence.',
        ],
      },
      {
        heading: 'Moving stock',
        body: [
          'Type a quantity, then choose Receive (adds to backroom — use this when a delivery physically arrives) or To shop (moves backroom → shop floor, for restocking the sales floor). "To shop" is disabled when there is nothing in the backroom to move.',
        ],
      },
      {
        heading: 'Gotcha',
        body: [
          'The Receive button here is a quick manual add and does not reconcile against any purchase order. A formal supplier delivery should be received through Purchasing instead, where it is matched line-by-line against what was actually ordered and feeds Supplier scorecards.',
        ],
      },
    ],
  },

  replenishment: {
    eyebrow: 'Computed, not guessed',
    title: 'Reorder intelligence',
    tagline: 'Exactly which products need reordering right now, and why.',
    sections: [
      {
        heading: 'The formula',
        body: [
          'Reorder point = (sales velocity × supplier lead time) + safety stock.',
          'Velocity blends the last 30/60/90 days of non-voided sales.',
          'Lead time comes from that supplier’s actual delivery history (falls back to a conservative default until there is enough history to trust).',
          'Safety stock is statistical — sized to a 95% service level from that product’s own day-to-day demand variability — once there is enough sale-day history. Rows using the statistical method carry a small "stat" badge next to the reorder point; everything else falls back to a flat buffer rather than being silently skipped.',
        ],
      },
      {
        heading: 'Reading a row',
        body: [
          'Urgency chip: Out of stock (critical), Reorder now (high), or Below reorder point.',
          'Days of cover — how many days current stock lasts at the current sales pace. Clamped at zero; it never shows negative even for oversold products.',
          'Suggested order — the quantity to bring stock back to a healthy level, priced at that product’s cost.',
        ],
      },
      {
        heading: 'Taking action',
        body: [
          'If a product has no linked supplier yet, choose one from the dropdown first. Then "Draft PO" creates a real draft purchase order — it is disabled, with a tooltip explaining why, if the product has no cost price set.',
        ],
      },
      {
        heading: 'Gotcha',
        body: [
          'A row only appears once a product is at or below its computed reorder point. An empty table is good news, not a broken screen.',
        ],
      },
    ],
  },

  'dead-stock': {
    eyebrow: 'Computed from sale history, not a guess',
    title: 'Dead stock',
    tagline: 'What’s not moving, and what it’s costing you.',
    sections: [
      {
        heading: 'The three buckets',
        body: [
          'Slow — 90 to 179 days since the last sale, still selling, just slowly.',
          'Dead — 180+ days since the last sale, no realistic near-term demand.',
          'Never sold — sitting in the catalogue for 30+ days with zero sales ever. Brand-new products are deliberately excluded so they are not flagged unfairly.',
        ],
      },
      {
        heading: 'How it’s ranked',
        body: [
          'By KES value trapped — cost price × units still on the shop floor — not just by how long a product has sat. A cheap item sitting a year matters less than an expensive one sitting three months.',
          'Only in-stock products are listed; anything already sold through has nothing trapped to report.',
        ],
      },
      {
        heading: '"no cost set"',
        body: [
          'Shown in amber when a product has no recorded cost price, so its trapped value cannot be calculated. Add a cost price on that product to get a real number.',
        ],
      },
      {
        heading: 'What to do with a finding here',
        body: [
          'Bundle it, discount it, or feature it rather than let it keep sitting — this screen flags the problem, it does not act on it for you.',
        ],
      },
    ],
  },

  'abc-classification': {
    eyebrow: 'Ranked by cost, not retail price',
    title: 'ABC classification',
    tagline: 'Which products actually matter to the business.',
    sections: [
      {
        heading: 'The formula',
        body: [
          'Annual consumption value = sales velocity × cost price × 365. Ranking by retail revenue instead would overweight high-margin items and hide how much capital is actually tied up in bulk, low-margin stock.',
        ],
      },
      {
        heading: 'Reading a class',
        body: [
          'Class A — the top ~80% of cumulative value. Deserve tight control: frequent counts, no stockouts.',
          'Class B — the next ~15%. Moderate attention.',
          'Class C — the trailing ~5%. Fine with loose control; low value at stake.',
          'Cumulative share is what actually draws the A/B/C lines — it is the running percentage of total value as you scan down the ranked table.',
        ],
      },
      {
        heading: 'If everything shows Class C',
        body: [
          'That means no product in the catalogue has a cost price set yet, so there is nothing real to rank. The screen shows an explicit warning banner when this happens — add cost prices to get a real A/B/C split.',
        ],
      },
    ],
  },

  purchasing: {
    eyebrow: 'Draft → Ordered → Received',
    title: 'Purchasing',
    tagline: 'Supplier records and the full purchase-order lifecycle.',
    sections: [
      {
        heading: 'The flow',
        body: [
          'Add a supplier first (name, contact, phone), then create a purchase order against them.',
          'A new purchase order starts as a Draft — stock does not change yet.',
          '"Mark ordered" moves it to Ordered — still no stock change, this just records the commitment.',
          '"Receive" (in full or partially) is the only step that actually adds stock, into the backroom, matched line-by-line against what was ordered.',
        ],
      },
      {
        heading: 'Why it matters beyond this screen',
        body: [
          'Every receipt recorded here is what feeds Supplier scorecards’ on-time-rate and order-accuracy numbers, and Reorder intelligence’s lead-time calculation for that supplier. A manual quick-receive done from Inventory instead does not get counted in either.',
        ],
      },
    ],
  },

  suppliers: {
    eyebrow: 'Computed from purchase order history',
    title: 'Supplier scorecards',
    tagline: 'Who actually delivers on time — nothing here is self-reported.',
    sections: [
      {
        heading: 'The three numbers',
        body: [
          'On-time rate — each order’s actual receipt date compared against the expected date you set when it was placed.',
          'Order accuracy — units actually received compared against units ordered, across every line of every order.',
          'Avg. lead time — that supplier’s real average days from order to receipt.',
        ],
      },
      {
        heading: 'Reading the color',
        body: [
          'Green: on-time ≥80%, accuracy ≥95%. Amber: down to 50% / 85%. Red: below that. "No history yet" means the supplier has no completed orders to score.',
        ],
      },
      {
        heading: 'Where this feeds back in',
        body: [
          'A supplier with a weak on-time rate here is exactly why that supplier’s products show a longer, more conservative lead time on Reorder intelligence.',
        ],
      },
    ],
  },

  'stock-counts': {
    eyebrow: 'Inventory accuracy',
    title: 'Stock counts',
    tagline: 'Reconcile what the system thinks you have against what’s physically there.',
    sections: [
      {
        heading: 'Running a count',
        body: [
          'Start a shop-floor or backroom count — this locks in the system’s expected quantity for every product in that location at that exact moment.',
          'Enter the physical quantity for each product as you count.',
          '"Finalize and post variances" locks the count and writes every difference to the movement ledger with a reason attached — a permanent, audited record, not a silent overwrite.',
          'Only one count can be in progress at a time.',
        ],
      },
      {
        heading: 'Recent ledger',
        body: [
          'Every stock movement — receipts, transfers, count variances — with a reason, most recent first.',
        ],
      },
      {
        heading: 'Tip',
        body: [
          'Run a count on a regular cadence, not only when something already looks wrong — it is the only way small shrinkage or mis-scans surface before they become a real, unexplained gap.',
        ],
      },
    ],
  },

  sales: {
    eyebrow: 'Trade desk',
    title: 'Sales intelligence',
    tagline: 'Today’s channel mix, counter vs. online, at a glance.',
    sections: [
      {
        heading: 'What’s here',
        body: [
          'Counter — in-person transaction count and revenue today.',
          'Online — web order count and revenue today.',
          '"Open full sales hub" leaves Store Management for the main admin site’s deeper sales reporting.',
        ],
      },
      {
        heading: 'Getting more out of it',
        body: [
          'Use "Ask about sales" to have Nawiri compare the two channels and suggest what is actually worth investigating, rather than reading the raw numbers alone.',
        ],
      },
    ],
  },

  fulfillment: {
    eyebrow: 'Orders in motion',
    title: 'Fulfillment',
    tagline: 'What needs attention before a customer is kept waiting.',
    sections: [
      {
        heading: 'What’s here',
        body: [
          'A table of open online orders — order, customer, status, value.',
          'Open online orders and Active deliveries tiles give the current workload at a glance.',
          '"Open full order desk" leaves for the main admin site’s complete order management.',
        ],
      },
      {
        heading: 'Getting more out of it',
        body: [
          'Use "Review fulfilment" to have Nawiri combine order volume, drivers, counter traffic, and stock risk before you assign work — rather than checking each of those separately.',
        ],
      },
    ],
  },

  team: {
    eyebrow: 'People and permissions',
    title: 'Team & controls',
    tagline: 'Live visibility into who’s on duty — not where roles are changed.',
    sections: [
      {
        heading: 'What’s here',
        body: [
          'Admins, delivery staff, and other operational roles currently in the system.',
        ],
      },
      {
        heading: 'What’s deliberately not here',
        body: [
          'Role changes and driver verification are handled in the main admin site’s dedicated, audited controls — "Open people and permissions" and "Verify drivers" hand off there rather than duplicating those actions in this workspace.',
        ],
      },
      {
        heading: 'Leaving',
        body: [
          '"Leave Store Management" ends this session immediately, the same as closing the tab. Getting back in requires a fresh hand-off from the main Nawiri site — knowing this URL alone does not unlock it.',
        ],
      },
    ],
  },

  assistant: {
    eyebrow: 'Ask. Then decide.',
    title: 'Ask Nawiri',
    tagline: 'A decision-support copilot that already sees today’s store snapshot.',
    sections: [
      {
        heading: 'What it can see',
        body: [
          'Analysis window — how far back it looks: today, 7, 30, or 90 days.',
          'Business data toggles — which live sources (counter, online, inventory, delivery) it is allowed to pull from for this particular question.',
          'Include web research — owner-initiated only. When switched on, Nawiri may also search the web, and it keeps that outside research clearly separate from your actual business data in its answer.',
        ],
      },
      {
        heading: 'How it behaves',
        body: [
          'It asks one precise follow-up question when your preference, or a piece of missing information, would actually change its advice — instead of guessing and moving on.',
          'Every write action it is able to take is capped, named in advance, and logged — visible afterward in the Audit trail. It does not have open-ended database access.',
        ],
      },
      {
        heading: 'Tip',
        body: [
          'The starting-point questions in the side panel are a fast way to get a useful first answer before you’ve worked out exactly what to ask.',
        ],
      },
    ],
  },

  'audit-trail': {
    eyebrow: 'Every stock change and every write, in one place',
    title: 'Audit trail',
    tagline: 'A merged, browsable record that neither source had a view for before.',
    sections: [
      {
        heading: 'What’s merged here',
        body: [
          'The inventory movement ledger — every warehouse receipt, transfer, and stocktake adjustment.',
          'The admin action log — every other write, including the AI copilot’s capped, audited actions.',
        ],
      },
      {
        heading: 'Filtering',
        body: [
          'Switch between All, Ask Nawiri, and Staff to see only one actor type.',
          'Each row shows when, who, what happened, the specific detail, and the reason recorded for it.',
        ],
      },
      {
        heading: 'When to check it',
        body: [
          'A stock number looks unexpected and you want to know exactly what changed it and why, or you want to confirm what the AI copilot has actually done on your behalf.',
        ],
      },
    ],
  },
};
