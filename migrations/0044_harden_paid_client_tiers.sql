-- SPR entitlement hardening: client subscription tiers are not a client-controlled
-- authorization primitive. Paid tiers may only exist when backed by a Paid billing
-- record for the same tenant/client, or when the tenant belongs to the founder.
--
-- The cleanup is intentionally limited to invalid entitlement state; legitimate
-- Paid rows are preserved. The trigger then prevents the same bypass from being
-- recreated through direct API/database writes.

UPDATE clients AS c
SET subscription_tier = 'Standard'
WHERE c.subscription_tier IN ('Enterprise', 'Premium')
  AND NOT EXISTS (
    SELECT 1
    FROM billing AS b
    WHERE b.tenant_id = c.tenant_id
      AND lower(trim(b.client_name)) = lower(trim(c.name))
      AND b.status = 'Paid'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM users AS u
    WHERE u.tenant_id = c.tenant_id
      AND lower(trim(u.email)) = 'dreamzzzz120@gmail.com'
  );

CREATE OR REPLACE FUNCTION spr_enforce_client_tier_entitlement()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.subscription_tier IS NULL OR NEW.subscription_tier = 'Standard' THEN
    NEW.subscription_tier := 'Standard';
    RETURN NEW;
  END IF;

  IF NEW.subscription_tier NOT IN ('Enterprise', 'Premium') THEN
    RAISE EXCEPTION 'Unsupported client subscription tier: %', NEW.subscription_tier
      USING ERRCODE = '22023';
  END IF;

  -- Founder workspace is explicitly privileged, but the identity is resolved
  -- from the server-owned users table rather than request/localStorage state.
  IF EXISTS (
    SELECT 1
    FROM users AS u
    WHERE u.tenant_id = NEW.tenant_id
      AND lower(trim(u.email)) = 'dreamzzzz120@gmail.com'
  ) THEN
    RETURN NEW;
  END IF;

  -- Customer paid entitlement must be evidenced by a Paid billing record for
  -- this tenant and client. A requested tier alone is never sufficient.
  IF EXISTS (
    SELECT 1
    FROM billing AS b
    WHERE b.tenant_id = NEW.tenant_id
      AND lower(trim(b.client_name)) = lower(trim(NEW.name))
      AND b.status = 'Paid'
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Paid client tier requires a verified Paid billing record'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS spr_client_tier_entitlement_guard ON clients;
CREATE TRIGGER spr_client_tier_entitlement_guard
BEFORE INSERT OR UPDATE OF subscription_tier
ON clients
FOR EACH ROW
EXECUTE FUNCTION spr_enforce_client_tier_entitlement();
