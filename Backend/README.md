# Salar Motors Backend

## Remove the retired vehicle field

The car schema and API no longer use the retired `steeringType` property.
To inspect existing records and matching indexes without changing data, run
from this directory:

```powershell
npm run migrate:remove-steering-type
```

After reviewing the dry-run counts and taking a database backup, deploy the
backend version that no longer defines the field, stop older backend
instances, then explicitly apply the cleanup:

```powershell
npm run migrate:remove-steering-type -- --apply
```

The migration unsets only that property from documents in the `cars`
collection and drops only indexes whose key includes it. It does not delete
documents or modify other fields. The script is safe to rerun; its default
mode is read-only.
