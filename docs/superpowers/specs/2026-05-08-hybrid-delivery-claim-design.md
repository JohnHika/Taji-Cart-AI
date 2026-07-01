# Hybrid Delivery Claim Architecture Design

**Date:** 2026-05-08  
**Project:** Taji-Cart-AI  
**Scope:** Backend foundation for hybrid admin-assigned and driver-claimed deliveries

## Summary

Taji Cart AI already has a working delivery foundation built around dispatch, manual driver assignment, delivery status updates, and live driver location tracking. The next step is not a full Uber-style rewrite. Instead, the system should evolve into a **hybrid claim architecture** that preserves the current admin/staff dispatch workflow while adding a safe self-claim path for approved delivery drivers.

Under this design, admin/staff users continue dispatching orders and may still manually or automatically assign drivers. In parallel, dispatched orders can enter a claimable delivery pool that is visible to approved, active, online, and available drivers. A driver may accept one of those orders, and the backend must atomically lock the order so no second driver can claim it.

This approach improves delivery speed and flexibility without destabilizing the current operational model.

## Goals

- Keep the existing admin/staff dispatch workflow intact.
- Add driver self-claiming for dispatched orders.
- Prevent dispatch and assignment race conditions.
- Preserve current order statuses and most existing schema behavior.
- Share assignment eligibility rules across manual assignment, auto-assignment, and driver self-accept.
- Ship the backend foundation first before customer tracking UX and proof-of-delivery UX.

## Non-goals

- Replacing the entire delivery system with a marketplace/offers engine.
- Redesigning the CEO/admin approval dashboard in this pass.
- Implementing proof-of-delivery uploads, signatures, or image capture in this pass.
- Building the customer tracking frontend in this pass.
- Changing the overall order lifecycle beyond what is needed for claim-safe assignment.

## Existing System Constraints

### Current order lifecycle

The `order` model already supports the statuses needed for this design:

- `pending`
- `processing`
- `dispatched`
- `driver_assigned`
- `out_for_delivery`
- `nearby`
- `delivered`
- `cancelled`

This design keeps those states and reuses them as follows:

- `dispatched` means the order is ready for assignment or driver claim.
- `driver_assigned` means a specific driver has been locked to the order.

### Current delivery identity model

Delivery access is currently split across two layers:

1. `User`
   - `role`
   - `isDelivery`
   - auth/middleware access control
2. `DeliveryPersonnel`
   - operational delivery profile
   - `verificationStatus`
   - `isActive`
   - `isAvailable`
   - `activeOrders`
   - `activeOrdersCount`
   - location and performance metrics

This design must respect that split and avoid introducing a competing source of truth.

### Current approval semantics

`DeliveryPersonnel.verificationStatus` already exists with:

- `pending`
- `verified`
- `rejected`

This pass will not replace that enum. Business meaning will be derived from existing fields:

- `verified + isActive=true` → approved and enabled driver
- `verified + isActive=false` → suspended/inactive driver
- `pending` → awaiting approval
- `rejected` → rejected driver

## Proposed Architecture

## 1. Hybrid delivery modes

The system will support two parallel delivery modes:

1. **Managed assignment mode**
   - Admin/staff dispatches order.
   - Admin/staff manually assigns a driver, or admin auto-assigns one.
2. **Claim pool mode**
   - Admin/staff dispatches order.
   - Order appears in the available delivery pool.
   - Eligible drivers may accept the order themselves.

These modes are complementary, not competing. A business operator can still take control when needed, while drivers can self-pick jobs when that is operationally faster.

## 2. Driver presence model

A new `DeliveryPersonnel.isOnline` field will be introduced:

```js
isOnline: {
  type: Boolean,
  default: false
}
```

This creates a cleaner operational model:

- `verificationStatus` → has the driver been approved?
- `isActive` → is the driver allowed to operate?
- `isOnline` → is the driver currently on shift and accepting work?
- `isAvailable` → can the driver still accept more work right now?

This separation avoids overloading `isAvailable` to mean both “working today” and “not full yet.”

## 3. Shared assignment/claim rules

All assignment methods must use the same core eligibility rules.

A driver is eligible to receive or self-claim an order only if:

- they have a valid `DeliveryPersonnel` record
- `verificationStatus === "verified"`
- `isActive === true`
- `isOnline === true` for self-claim routes
- `isAvailable === true`
- they have not exceeded the active order capacity

An order is claimable/assignable only if:

- it exists
- it is a delivery order
- `status === "dispatched"`
- `deliveryPersonnel` is not set

This rule set must be centralized in shared controller/service logic so manual assignment, auto-assignment, and self-claim do not drift apart over time.

## 4. Atomic dispatch and assignment

### Dispatch

`dispatchOrder` must stop using read-then-save logic as its gate. Instead, it must use a conditional atomic update so the order is only dispatched if it is still eligible at write time.

If the dispatch update affects no document, the API should return **409 Conflict** when the order has already been dispatched or entered a later delivery state.

### Assignment and claim

Manual assignment, auto-assignment, and driver self-claim must all rely on conditional locking of the order so that only one actor wins.

At minimum, the order lock must guarantee:

- order is still `dispatched`
- `deliveryPersonnel` is still unset

If no order matches during the conditional update, the API must return **409 Conflict** with a message indicating the order has already been accepted or assigned.

## 5. API additions

### Driver-visible delivery pool

**Route:** `GET /api/delivery/available`

Returns dispatched orders that are still unassigned and claimable.

Eligibility to access this route:

- authenticated delivery user
- approved driver (`verificationStatus === "verified"`)
- active driver
- online driver

Response should include enough information for a driver app/dashboard to decide whether to accept the order, such as:

- order ID
- public order number
- created time
- destination summary
- estimated value/metadata already permitted by business rules
- optional route/location summary if available

### Driver self-accept

**Route:** `POST /api/delivery/accept/:orderId`

Allows an eligible driver to attempt to claim a dispatched order.

On success:

- set `deliveryPersonnel`
- set `status = "driver_assigned"`
- set assignment timestamp metadata
- append status history entry
- update the driver’s active order state
- recalculate driver availability if capacity threshold is reached
- generate customer and driver notifications

On failure because another actor won the race:

- return `409 Conflict`
- explain that the order has already been accepted or assigned

### Driver presence update

**Route:** `POST /api/delivery/presence`

Allows a driver to toggle online/offline state.

This route will manage `isOnline`, and may optionally allow controlled updates to `isAvailable` when appropriate.

## 6. Reuse of existing routes

The following routes remain in place:

- `POST /api/delivery/dispatch`
- `POST /api/delivery/assign-driver`
- `POST /api/delivery/assign`

However, their internals should be refactored so they all use the same safe assignment logic and produce consistent state transitions.

## 7. Data model changes

### DeliveryPersonnel

Add:

- `isOnline: Boolean` default `false`

### Order

A lightweight assignment timestamp field may be added if needed for analytics and timeline consistency:

- `assignedAt: Date`

This is optional but recommended because assignment time is operationally meaningful and cleaner than inferring solely from `statusHistory`.

No full `deliveryFee`, delivery marketplace, or offer queue schema changes are part of this pass.

## 8. Transaction strategy

The backend should prefer the safest mechanism supported by the active MongoDB deployment.

Recommended approach:

1. Use conditional atomic updates as the baseline guarantee.
2. Where supported and practical, wrap multi-document assignment steps in a transaction/session.
3. If transaction support is unavailable in some environments, preserve correctness through conditional order locking first, then fail safely on driver-record update issues.

The most important invariant is that two drivers must never both successfully claim the same order.

## 9. Notifications and history

This pass should preserve the existing notification behavior and improve consistency where possible.

Expected events:

- order dispatched
- driver assigned or claimed
- driver status updates continue through the existing delivery lifecycle

`statusHistory` should remain the canonical event log on the order for backend tracking until a separate customer-facing tracking timeline is built.

## 10. Error handling

### Use `409 Conflict` for race outcomes

The following cases should use `409` rather than generic `400` when the request was valid but lost a concurrency race:

- order already dispatched by another actor
- order already assigned by another actor
- order already accepted by another driver

### Use `400` for business-invalid requests

Examples:

- order is not a delivery order
- driver is not approved
- driver is offline
- driver is inactive

### Use `404` for missing resources

Examples:

- order not found
- driver profile not found

## 11. Security and access control

- Admin/staff dispatch and assignment permissions remain unchanged.
- Delivery routes continue using the existing delivery middleware.
- Driver claim routes must verify both user access and `DeliveryPersonnel` operational eligibility.
- Drivers must never see or claim orders once already assigned.

## 12. Testing strategy

Backend validation for this pass must include:

### Concurrency tests

- two dispatch attempts for the same order at the same time
- two driver claim attempts for the same order at the same time
- manual admin assignment racing with driver self-claim

### Eligibility tests

- verified vs pending vs rejected driver
- active vs inactive driver
- online vs offline driver
- available vs overloaded driver

### Regression tests

- existing manual assignment still works
- existing auto-assignment still works
- delivery status updates still work
- location updates still work

## 13. Rollout plan

### Phase 1: backend foundation

- add `isOnline`
- make dispatch atomic
- add available pool endpoint
- add self-accept endpoint
- extract shared assignment logic
- preserve existing routes

### Phase 2: operational UX

- driver dashboard integration for available orders
- online/offline controls in driver UI
- better assignment notifications

### Phase 3: customer delivery experience

- customer tracking timeline
- richer delivery milestones
- proof of delivery

## Recommendation

Approve and implement **Option 2: Hybrid claim lane**.

This is the best architecture for the current codebase because it preserves the existing dispatch foundation, adds driver self-claiming safely, prevents duplicate assignment through atomic locking, and avoids a high-risk rewrite of the delivery system.

## Spec review checklist

- No placeholders remain.
- Existing schema constraints are respected.
- The design stays focused on backend foundation work.
- The architecture supports both manual assignment and driver self-claim without conflict.
- The concurrency behavior is explicit and uses conflict semantics where appropriate.
