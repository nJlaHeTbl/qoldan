# Map editor

Entry point: /map-editor; also linked below settlement search and in the footer.
Users signed in through the existing identity flow can submit proposals. Only
accounts authorized by existing QOLDAN_ADMIN_USER_IDS / QOLDAN_ADMIN_EMAILS
can approve, reject, publish directly, or return to the source data. Display
names do not grant privileges. Existing administrator configuration was retained.

settlement_edits stores pending/rejected/approved revisions without changing
the source GeoNames files. settlement_overrides stores the latest approved
revision. Public pickers merge it into the regional source data. A reset restores
the original source point or removes a custom point from suggestions; history
is retained. Restoring history creates a new revision, not an erasure.

The approval batch compares expected_revision and changes the public record
and proposal state atomically. A stale or repeated approval returns 409.
Source settlement IDs are checked against settlement-regions.json; regenerate
it with scripts/index-settlement-regions.mjs after refreshing source data.
Existing records cannot be moved into an unrelated region through this editor.
There is no automatic renaming of authors' existing free-text addresses.

Validation: TypeScript; local editor rendering; HTTP workflow integration;
production-shaped handler checks for anonymous/non-admin access; pending
isolation; repeated/stale approvals; reset/history; region validation.
The local preview promotes its visitor to a developer, so authorization tests
invoke the actual transpiled handlers with an isolated binding environment.
scripts/test-settlement-editor.mjs performs writes ONLY on localhost.
