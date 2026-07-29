# Credential Store — setup

Moves the Jira API token out of the application environment. Before this, the
token was set with `cf set-env` and therefore readable via `cf env
SentinelGRC-srv` by anyone holding Space Developer on the space. It now lives in
the Credential Store service and is fetched at runtime.

Code: [`srv/lib/credential-store.js`](../srv/lib/credential-store.js), consumed
by `getJiraConfig()` in `srv/handlers/security-handler.js`.

---

## 1. Create the service instance

BTP cockpit → subaccount *Aymax Consulting-Dev AZURE* → **Services → Service
Marketplace → Credential Store → Create**, plan **free**.

**The authentication type must be `basic`.** The plan default is `mtls`, whose
binding carries `certificate`/`key` instead of the `username`/`password` this
client uses — with an mTLS binding the app silently falls back to environment
variables. Set it under *Instance → Credential Store → Settings → Edit
Configuration → Authentication Type*, or create the instance from the CLI:

```bash
cf create-service credstore free sentinelgrc-credstore \
  -c '{"authentication":{"type":"basic"}}'
```

`mta.yaml` already declares the instance with this configuration, so an
`mbt build && cf deploy` creates it too.

## 2. Create the namespace and the credential

Instance → **Credential Store** → **Namespaces → New Namespace** → name it
`sentinelgrc` (override with the `CREDSTORE_NAMESPACE` env var if you pick
another).

Inside it → **Passwords → New Password**:

| Field | Value |
| --- | --- |
| Name | `jira` |
| Username | your Jira account e-mail |
| Value | the Jira API token |

One entry holds the whole login — `readPassword()` returns both fields, and
`getJiraConfig()` maps `username` onto the e-mail. Override the credential name
with `JIRA_CREDENTIAL_NAME` if you store it under something else.

## 3. Bind and deploy

```bash
mbt build && cf deploy mta_archives/SentinelGRC_1.0.0.mtar
```

Then remove the secret from the environment, which is the entire point:

```bash
cf unset-env SentinelGRC-srv JIRA_TOKEN
cf unset-env SentinelGRC-srv JIRA_EMAIL
cf restage SentinelGRC-srv
```

`JIRA_URL` and `JIRA_PROJECT` stay as environment variables — they are not
secrets.

## 4. Verify

Open a ticket from a violation in the UI. On success the app log shows
`[Jira] Created ticket …` with no `[CredStore]` warning. If you see

```
[CredStore] Jira credential unavailable, falling back to env: …
```

the service was reachable but the read failed — the message carries the HTTP
status. Common causes:

- **404** — namespace or credential name mismatch. The namespace header is
  `sapcp-credstore-namespace`; check the spelling of both.
- **401** — the binding expired (see below) or the instance is not on `basic`.
- **falls back with no error at all** — `isConfigured()` returned false, meaning
  no `credstore` entry in `VCAP_SERVICES` or an mTLS binding. Check
  `cf env SentinelGRC-srv | grep -A5 credstore`.

---

## Operational notes

**Bindings expire.** SAP documents a default validity of 60 days for new
bindings (a later note raises `basic` and `oauth:key` to 365 days — check what
your instance actually shows under *Settings*). When it lapses, reads start
failing with 401 and the app falls back to environment variables that are no
longer set. Rebinding — `cf unbind-service` / `cf bind-service`, or a redeploy —
issues fresh credentials. Worth a calendar reminder before the PFE defence.

**Caching.** Credentials are cached in memory for 10 minutes
(`CREDSTORE_CACHE_TTL_MS`) so a burst of ticket creations doesn't make one API
round trip each. After rotating a secret, either wait out the TTL or restart the
app.

**Local development.** The service isn't bound under `cds watch`, so
`isConfigured()` is false and the environment variables are used unchanged. No
local setup needed.

**Payload encryption.** Every response is a JWE (RSA-OAEP-256 key wrapping,
A256GCM content encryption) decrypted with the `encryption.client_private_key`
from the binding. Node's built-in `crypto` covers both algorithms, so this needs
no third-party JOSE dependency.

## Extending it

`readPassword(name)` is generic. Any future third-party secret — an SMTP
password, an S/4 technical user — becomes a new entry in the same namespace plus
one call, rather than another `cf set-env`.
