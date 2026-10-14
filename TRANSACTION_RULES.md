# Transaction Rules

1. Money is represented as integer paise in the database and converted to rupees only at API/UI boundaries.
2. A charge creates an `orders` row and a positive `ledger_entries` row within one SQLite transaction.
3. A payment creates a `payments` row and a negative ledger entry within one SQLite transaction.
4. A payment cannot exceed the person’s current calculated outstanding balance.
5. A non-empty payment reference is unique per account, preventing accidental duplicate imports/entries.
6. Balances are derived using `SUM(ledger_entries.amount_paise)`; no mutable balance field exists.
7. Ledger entries cannot be updated or deleted. Database triggers enforce this even if an API bug attempts it.
8. Orders cannot be deleted, and their amount/person cannot be changed. Payments cannot be updated or deleted.
9. A correction appends a linked reversal entry and, when supplied, a replacement entry. The reason and entry links are stored permanently in `corrections`.
10. Every request is authorized by account. Person ownership is rechecked within financial write transactions.
11. Dates reflect the business event; `created_at` is the immutable system timestamp used for audit ordering.
12. Restore merges known version-1 backups using original IDs. Existing IDs are skipped, never overwritten.
