-- Document must have exactly one parent FK set.
ALTER TABLE "Document"
  ADD CONSTRAINT document_single_parent_chk
  CHECK (
    (CASE WHEN "leaseId"     IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN "propertyId"  IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN "unitId"      IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN "tenantId"    IS NOT NULL THEN 1 ELSE 0 END) = 1
  );

-- Exactly one primary tenant per lease.
CREATE UNIQUE INDEX lease_tenant_one_primary_uq
  ON "LeaseTenant" ("leaseId")
  WHERE "isPrimary" = true;
