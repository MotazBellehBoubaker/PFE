'use strict';

/*
 * Minimal client for the SAP BTP Credential Store service.
 *
 * Secrets that used to sit in `cf set-env` (and therefore in `cf env`, readable
 * by anyone with Space Developer) are stored in the service instead and read at
 * runtime over its REST API.
 *
 * Two things about that API drive the code below:
 *
 *  - The instance must use the "basic" authentication type. The default for the
 *    free/standard plans is "mtls", and an mTLS binding carries `certificate` +
 *    `key` instead of `password` — getBinding() returns null for it, so the
 *    caller quietly falls back to environment variables rather than crashing.
 *  - Response bodies are always encrypted (JWE compact serialization,
 *    RSA-OAEP-256 + A256GCM) and must be decrypted with the private key the
 *    binding hands us. Node's crypto covers both, so this needs no dependency.
 *
 * Reference: SAP Credential Store documentation, "Basic Authentication" and
 * "Encrypting Payloads".
 */

const https  = require('https');
const crypto = require('crypto');

const NAMESPACE    = process.env.CREDSTORE_NAMESPACE || 'sentinelgrc';
const CACHE_TTL_MS = Number(process.env.CREDSTORE_CACHE_TTL_MS || 10 * 60 * 1000);

// name -> { expires, payload }. Keeps a burst of ticket creations from making
// one API round trip each; a restart or a TTL lapse re-reads.
const oCache = new Map();

/**
 * The `credstore` entry of VCAP_SERVICES, or null when the service is not bound
 * (local development) or is bound with an authentication type we can't use.
 */
function getBinding() {
    let oVcap;
    try {
        oVcap = JSON.parse(process.env.VCAP_SERVICES || '{}');
    } catch {
        return null;
    }
    const oCred = (oVcap.credstore || [])[0]?.credentials;
    if (!oCred?.url || !oCred?.username || !oCred?.password) return null;
    if (!oCred?.encryption?.client_private_key) return null;
    return oCred;
}

function isConfigured() {
    return !!getBinding();
}

/**
 * Decrypt one JWE compact serialization with the binding's client private key.
 * The key arrives base64-encoded DER in PKCS#8 form.
 */
function decryptJwe(sCompact, sPrivateKeyDer) {
    const aParts = String(sCompact).trim().split('.');
    if (aParts.length !== 5) {
        throw new Error('response is not a JWE compact serialization');
    }
    const [sHeader, sEncKey, sIv, sCipherText, sTag] = aParts;

    const oPrivateKey = crypto.createPrivateKey({
        key:    Buffer.from(sPrivateKeyDer, 'base64'),
        format: 'der',
        type:   'pkcs8'
    });

    const bCek = crypto.privateDecrypt(
        {
            key:      oPrivateKey,
            padding:  crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256'
        },
        Buffer.from(sEncKey, 'base64url')
    );

    const oDecipher = crypto.createDecipheriv('aes-256-gcm', bCek, Buffer.from(sIv, 'base64url'));
    oDecipher.setAuthTag(Buffer.from(sTag, 'base64url'));
    // RFC 7516: the additional authenticated data is the ASCII form of the
    // encoded protected header, not its decoded contents.
    oDecipher.setAAD(Buffer.from(sHeader, 'ascii'));

    return Buffer.concat([
        oDecipher.update(Buffer.from(sCipherText, 'base64url')),
        oDecipher.final()
    ]).toString('utf8');
}

function httpGet(sUrl, oHeaders) {
    return new Promise((resolve, reject) => {
        const oUrl = new URL(sUrl);
        const r = https.request({
            hostname: oUrl.hostname,
            path:     oUrl.pathname + oUrl.search,
            method:   'GET',
            headers:  oHeaders
        }, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) resolve(d);
                else reject(new Error('Credential Store ' + res.statusCode + ': ' + d.slice(0, 200)));
            });
        });
        r.on('error', reject);
        r.setTimeout(15000, () => r.destroy(new Error('Credential Store timeout')));
        r.end();
    });
}

/**
 * Read a password credential by name.
 * Resolves to `{ value, username }` — for a Jira credential the API token is
 * the value and the account e-mail is carried in username, so one entry holds
 * the whole login.
 *
 * Throws when the service is bound but unreachable; returns null when it is not
 * bound at all, so callers can decide whether to fall back.
 */
async function readPassword(sName) {
    const oBinding = getBinding();
    if (!oBinding) return null;

    const oHit = oCache.get(sName);
    if (oHit && oHit.expires > Date.now()) return oHit.payload;

    const sBase = oBinding.url.replace(/\/$/, '');
    const sBody = await httpGet(
        sBase + '/password?name=' + encodeURIComponent(sName),
        {
            'Authorization': 'Basic ' + Buffer.from(oBinding.username + ':' + oBinding.password).toString('base64'),
            'sapcp-credstore-namespace': NAMESPACE,
            'Accept': 'application/jose',
            'Cache-Control': 'no-cache'
        }
    );

    const oPayload = JSON.parse(decryptJwe(sBody, oBinding.encryption.client_private_key));
    const oResult  = { value: oPayload.value, username: oPayload.username || '' };

    oCache.set(sName, { expires: Date.now() + CACHE_TTL_MS, payload: oResult });
    return oResult;
}

/** Drop cached credentials — call after rotating a secret. */
function clearCache() {
    oCache.clear();
}

module.exports = { readPassword, isConfigured, clearCache, decryptJwe };
