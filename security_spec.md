# Security Specification — Kinetic Ledger Firestore Rules

## 1. Data Invariants
1. **Strict Multi-Tenant Ownership**: Every operational document (`/users/{userId}` and subcollections `skus`, `warehouses`, `movements`, `orders`, `suppliers`) belongs exclusively to `userId == request.auth.uid`.
2. **Email Verification Gate**: All writes require `request.auth != null && request.auth.token.email_verified == true`.
3. **Immutable Audit Ledger (`movements`)**: Stock movements are append-only audit logs (`allow update, delete: if false;`) once created.
4. **Terminal Order Locking (`orders`)**: Orders in terminal status (`received` or `cancelled`) cannot be mutated afterward.
5. **Bounded Types & Sizes**: All strings enforce explicit `.size()` ceilings, numeric quantities/prices enforce non-negative bounds, and all document IDs match `^[a-zA-Z0-9_\\-]+$` (max 128 chars).
6. **Temporal Integrity**: `createdAt` and `updatedAt` are strictly validated against `request.time`, with `createdAt` immutable on updates.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. Unauthenticated read or write to `/users/u1/skus/sku1`.
2. Authenticated user `u2` attempting `get`, `list`, `create`, `update`, or `delete` under `/users/u1/skus`.
3. Unverified email (`email_verified: false`) attempting `create` on `/users/u1/skus/sku1`.
4. Shadow field injection (`isAdmin: true` or `extra: "x"`) on `create` or `update`.
5. Identity spoofing (`ownerId: "u2"` inside `/users/u1/skus/sku1`).
6. Oversized document ID (`130` chars) or invalid ID characters (`bad/id`) on single-doc operations.
7. Oversized string (`name` > 120 chars or `notes` > 280 chars) to trigger resource exhaustion.
8. Negative `quantity` or `unitCost` in `SkuItem`.
9. Client-forged `createdAt` timestamp not equal to `request.time`.
10. Attempting to modify `createdAt` or `ownerId` during a `SkuItem` `update`.
11. Attempting to `update` or `delete` an immutable `StockMovement` record.
12. Attempting to `update` a `PurchaseOrder` whose `existing().status == 'received'`.
