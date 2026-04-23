# Product Overview Gap Checklist

Source deck: `C:\Users\liamp\Downloads\Product Overview.pptx`
Assessment date: `2026-04-23`

Legend:
- `Implemented` = the workflow is materially present in the current product.
- `Partial` = we have some scaffolding or adjacent functionality, but not the full requirement from the deck.
- `Missing` = no concrete workflow, model, route, or UI was found.

## Snapshot

| Status | Count |
|--------|-------|
| Implemented | 4 |
| Partial | 9 |
| Missing | 13 |

## Checklist

### Tenant Lifecycle

| Capability from deck | Status | Current alignment | Shortfall |
|----------------------|--------|-------------------|-----------|
| Tenant Onboarding | Implemented | Staff can onboard a tenant, assign a unit, create a draft lease, and optionally create a portal account via `lib/services/onboarding.ts` and `app/(staff)/tenants/onboard/page.tsx`. | None at the checklist level. |
| Tenant Application | Partial | Staff can capture tenant details during onboarding and tenant creation. | No separate application intake, applicant pipeline, or application review flow was found. |
| Tenant Vetting | Missing | `lib/services/tenants.ts` includes duplicate detection only. | No vetting checklist, screening documents, background checks, or approval workflow was found. |
| Lease Agreement & e-Signatures | Implemented | Lease generation, tenant signing, and clause review requests exist in `lib/lease-template.ts`, `lib/services/signatures.ts`, and the tenant lease signing UI. | None at the checklist level. |
| Handover Inspection & Report | Missing | The lease template references inspections. | No inspection entity, capture form, report workflow, or handover document flow was found. |
| Tenant Offboarding Process | Partial | Lease termination plus tenant archive/delete flows exist in `lib/services/leases.ts` and `lib/services/tenants.ts`. | No guided offboarding workflow, checklist, or status tracking was found. |
| Outgoing Inspection & Report | Missing | No dedicated inspection workflow was found. | Move-out inspections and reporting are not implemented. |
| Repairs/Cleaning Report/Summary | Missing | Maintenance tickets exist. | No cleaning report, repair summary, or move-out damage reconciliation workflow was found. |
| Finalise Accounts/Payments | Partial | Invoice generation and payment tracking exist in `lib/services/invoices.ts`. | No move-out settlement flow ties outstanding balances, deposits, and final account closeout together. |

### Financial

| Capability from deck | Status | Current alignment | Shortfall |
|----------------------|--------|-------------------|-----------|
| Rental Income & Utilities | Partial | Staff dashboard and invoice flows cover rental income. | No utilities model, usage capture, or utility reconciliation workflow was found. |
| Auto Generate Monthly Invoices based on rent + usage | Partial | `ensureInvoicesForLease()` auto-generates monthly invoices from lease rent. | Usage-based billing is not implemented; invoices are rent-only today. |
| Annual Recons | Missing | No annual reconciliation workflow was found. | End-of-period rent and utilities reconciliation is not implemented. |
| Auto Generate Tax returns based on annual performance for Landlords & Tenants | Missing | No tax reporting service or document generation flow was found. | Tax return generation is not implemented. |
| Payment Tracking / Track payments received to tenant accounts | Implemented | Staff can mark invoices paid/unpaid and tenants can view invoice history. | None at the checklist level. |
| Trust Account Management | Missing | No trust account model, ledger, or service was found. | Trust accounting is not implemented. |
| Insight into Trust Account Balance | Missing | No trust balance reporting was found. | No dashboard or report exists for trust balances. |
| Identify funds per tenant | Missing | No tenant-level trust fund tracking was found. | Funds segregation and allocation per tenant are not implemented. |
| Document Generation / Automatically generate documents (Invoices, statements) | Partial | The product has invoice records and lease document upload/download support. | No generated invoice PDFs, statements, or automated financial document output was found. |
| Usage Alerts / Automatically generate usage alerts based on previous data | Missing | No usage analytics or alerting service was found. | Predictive or threshold-based usage alerts are not implemented. |
| Cloud Back up & Storage / Cloud Storage | Partial | File uploads use Vercel Blob via `lib/blob.ts`. | No explicit backup, disaster recovery, retention, or encrypted recovery workflow was found in the app. |
| Payment Alerts / Alerts are issued on late or low payments received | Missing | SMS exists for invoice-paid confirmation only. | No late-payment or low-payment alert flow was found. |

### Portals, Alerts, and Maintenance

| Capability from deck | Status | Current alignment | Shortfall |
|----------------------|--------|-------------------|-----------|
| Outage Notifications | Missing | No outage model, feed, or notification flow was found. | Area outage notifications are not implemented. |
| Separate Dashboards for Property Management Company, Tenant, Managing Agent & Landlord | Partial | Staff dashboard, tenant home, landlord dashboard, and agent dashboard pages exist. | Landlord and agent experiences are thin; sidebars advertise deeper routes that do not exist yet, and the agent dashboard is still placeholder-heavy. |
| Estate Notifications | Missing | No estate notices model, inbox, or notification flow was found. | Estate notifications are not implemented. |
| Logging repairs | Implemented | Tenants can submit repairs and staff can manage them through `lib/services/maintenance.ts` and the tenant/staff maintenance pages. | None at the checklist level. |
| Repairs approved by MA & LL | Partial | Tenant maintenance logging exists, and there is a generic landlord approval service in `lib/services/approvals.ts`. | Maintenance does not currently call the approval workflow, and there is no managing-agent approval flow wired into repair handling. |

## Recommended Build Order

1. Finish the financial backbone: utilities, usage-aware invoicing, statements, payment alerts, trust accounting.
2. Add formal inspections and offboarding: handover, outgoing inspection, repairs/cleaning summary, final account closeout.
3. Wire approvals into operations: especially maintenance approvals for landlord and managing-agent review.
4. Expand role portals: complete landlord and agent routes so the separate-dashboard promise is real, not just scaffolded.
5. Add area intelligence: outage and estate notification feeds once the operational core is stable.
