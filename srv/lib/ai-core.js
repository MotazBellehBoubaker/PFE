'use strict';

/*
 * Minimal client for SAP AI Core (Generative AI Hub).
 *
 * The Risk Co-pilot used to answer from a keyword table in the UI. This module
 * is what turns it into a real LLM call: fetch an XSUAA token with the AI Core
 * service key, then POST the conversation to an orchestration deployment.
 *
 * Three things about the service drive the code below:
 *
 *  - AI Core service keys come in two flavours. The `binding-secret` flavour
 *    carries `clientsecret` and authenticates with a normal client_credentials
 *    POST. The `x509` flavour carries `certificate` + `key` and authenticates
 *    with mTLS against `certurl` — the plain `url` will not accept it. A key
 *    that has a certificate but no private key cannot obtain a token at all,
 *    so getBinding() rejects it and the caller falls back to canned answers.
 *  - A service key alone is not enough to reach a model. Inference needs a
 *    deployment ID and a resource group, neither of which is part of the key.
 *    They come from AICORE_DEPLOYMENT_ID / AICORE_RESOURCE_GROUP.
 *  - Response shapes differ between the orchestration service and a direct
 *    model deployment, so extractReply() accepts both rather than assuming.
 *
 * Nothing here throws at import time: when the service is not configured the
 * copilot keeps working on the built-in responses.
 */

const https = require('https');
const { URL } = require('url');

const RESOURCE_GROUP  = process.env.AICORE_RESOURCE_GROUP || 'default';
const DEPLOYMENT_ID   = process.env.AICORE_DEPLOYMENT_ID  || '';
const MODEL_NAME      = process.env.AICORE_MODEL          || 'anthropic--claude-4-sonnet';
const MAX_TOKENS      = Number(process.env.AICORE_MAX_TOKENS || 800);
const REQUEST_TIMEOUT = Number(process.env.AICORE_TIMEOUT_MS || 30000);

// Tokens are valid for a few hours; re-fetching one per chat message would add
// a round trip to every keystroke-sized request.
let oTokenCache = null; // { token, expires }

/**
 * The AI Core credentials, or null when the service is unusable.
 *
 * Order: a bound `aicore` service instance first, then AICORE_SERVICE_KEY
 * holding the whole service key as JSON (what `cf set-env` / default-env.json
 * carry locally).
 */
function getBinding() {
    let oCred = null;

    try {
        const oVcap = JSON.parse(process.env.VCAP_SERVICES || '{}');
        oCred = (oVcap.aicore || [])[0]?.credentials || null;
    } catch {
        oCred = null;
    }

    if (!oCred && process.env.AICORE_SERVICE_KEY) {
        try {
            oCred = JSON.parse(process.env.AICORE_SERVICE_KEY);
        } catch {
            console.error('[ai-core] AICORE_SERVICE_KEY is not valid JSON — ignoring it');
            return null;
        }
    }

    if (!oCred) return null;

    const sApiUrl = oCred.serviceurls?.AI_API_URL || oCred.AI_API_URL;
    if (!sApiUrl || !oCred.clientid) return null;

    // Either flavour of key works, but one of the two secrets must be present.
    const bSecret = !!oCred.clientsecret;
    const bCert   = !!(oCred.certificate && oCred.key && oCred.certurl);
    if (!bSecret && !bCert) {
        console.error(
            '[ai-core] service key carries neither `clientsecret` nor `certificate` + `key`; ' +
            'an x509 key without its private key cannot obtain a token'
        );
        return null;
    }

    return { ...oCred, apiUrl: String(sApiUrl).replace(/\/$/, ''), useCert: !bSecret };
}

/**
 * True when a token can be fetched *and* there is a deployment to send the
 * conversation to. Both halves are required — a valid key with no deployment
 * ID would authenticate and then 404 on every message.
 */
function isConfigured() {
    return !!getBinding() && !!DEPLOYMENT_ID;
}

/** Promise wrapper over https.request that resolves { status, body }. */
function request(sUrl, oOptions, sPayload) {
    return new Promise((resolve, reject) => {
        const oUrl = new URL(sUrl);
        const oReq = https.request({
            hostname: oUrl.hostname,
            port:     oUrl.port || 443,
            path:     oUrl.pathname + oUrl.search,
            method:   oOptions.method || 'GET',
            headers:  oOptions.headers || {},
            cert:     oOptions.cert,
            key:      oOptions.key,
            timeout:  REQUEST_TIMEOUT
        }, (res) => {
            let sBody = '';
            res.on('data', (chunk) => { sBody += chunk; });
            res.on('end', () => resolve({ status: res.statusCode, body: sBody }));
        });
        oReq.on('timeout', () => oReq.destroy(new Error('AI Core request timed out')));
        oReq.on('error', reject);
        if (sPayload) oReq.write(sPayload);
        oReq.end();
    });
}

/**
 * A client_credentials access token, cached until shortly before it expires.
 * mTLS keys go to `certurl`; secret keys go to `url`.
 */
async function getToken() {
    if (oTokenCache && oTokenCache.expires > Date.now()) return oTokenCache.token;

    const oCred = getBinding();
    if (!oCred) throw new Error('AI Core is not configured');

    const sBase = (oCred.useCert ? oCred.certurl : oCred.url).replace(/\/$/, '');
    const oHeaders = { 'Content-Type': 'application/x-www-form-urlencoded' };
    const oParams  = new URLSearchParams({ grant_type: 'client_credentials', client_id: oCred.clientid });

    if (oCred.useCert) {
        // The certificate identifies the client; there is no secret to send.
    } else {
        oParams.set('client_secret', oCred.clientsecret);
    }

    const sPayload = oParams.toString();
    oHeaders['Content-Length'] = Buffer.byteLength(sPayload);

    const oRes = await request(sBase + '/oauth/token', {
        method:  'POST',
        headers: oHeaders,
        cert:    oCred.useCert ? oCred.certificate : undefined,
        key:     oCred.useCert ? oCred.key         : undefined
    }, sPayload);

    if (oRes.status < 200 || oRes.status >= 300) {
        throw new Error(`AI Core token request failed (${oRes.status}): ${oRes.body.slice(0, 300)}`);
    }

    const oToken = JSON.parse(oRes.body);
    oTokenCache = {
        token:   oToken.access_token,
        // 60s of slack so a token never expires mid-request.
        expires: Date.now() + Math.max(0, (Number(oToken.expires_in) || 3600) - 60) * 1000
    };
    return oTokenCache.token;
}

/**
 * Pull the assistant text out of a completion response.
 *
 * The orchestration service wraps its answer in `orchestration_result`; a
 * direct model deployment returns the bare OpenAI-style body. Rather than
 * hard-code one, try the known shapes in turn.
 */
function extractReply(oBody) {
    const aChoices = oBody?.orchestration_result?.choices || oBody?.choices;
    const sText    = aChoices?.[0]?.message?.content;
    if (typeof sText === 'string' && sText.trim()) return sText.trim();

    // Anthropic-native shape: content is a list of typed blocks.
    const aContent = oBody?.content;
    if (Array.isArray(aContent)) {
        const sJoined = aContent
            .filter((b) => b?.type === 'text' && typeof b.text === 'string')
            .map((b) => b.text)
            .join('')
            .trim();
        if (sJoined) return sJoined;
    }

    return null;
}

/**
 * Send one conversation turn to the deployment and return the reply text.
 *
 * `aHistory` is the prior turns as [{ role, content }]; `sMessage` is what the
 * user just typed. The system prompt carries the scan context, so the model
 * answers about this tenant's data rather than SAP security in general.
 */
async function chat(sSystemPrompt, aHistory, sMessage) {
    const oCred  = getBinding();
    if (!oCred)  throw new Error('AI Core is not configured');
    if (!DEPLOYMENT_ID) throw new Error('AICORE_DEPLOYMENT_ID is not set');

    const sToken = await getToken();

    // The user's message goes through input_params rather than into the
    // template text: orchestration treats `{{?name}}` in a template as a
    // placeholder, so a question containing that syntax would be rewritten.
    const oPayload = {
        orchestration_config: {
            module_configurations: {
                templating_module_config: {
                    template: [
                        { role: 'system', content: sSystemPrompt },
                        { role: 'user',   content: '{{?question}}' }
                    ]
                },
                llm_module_config: {
                    model_name:   MODEL_NAME,
                    model_params: { max_tokens: MAX_TOKENS }
                }
            }
        },
        input_params:     { question: sMessage },
        messages_history: aHistory
    };

    const sBody = JSON.stringify(oPayload);
    const oRes  = await request(
        `${oCred.apiUrl}/v2/inference/deployments/${DEPLOYMENT_ID}/completion`,
        {
            method: 'POST',
            headers: {
                'Authorization':    'Bearer ' + sToken,
                'AI-Resource-Group': RESOURCE_GROUP,
                'Content-Type':     'application/json',
                'Content-Length':   Buffer.byteLength(sBody)
            }
        },
        sBody
    );

    if (oRes.status < 200 || oRes.status >= 300) {
        throw new Error(`AI Core inference failed (${oRes.status}): ${oRes.body.slice(0, 500)}`);
    }

    const sReply = extractReply(JSON.parse(oRes.body));
    if (!sReply) throw new Error('AI Core returned a response with no assistant text');
    return sReply;
}

module.exports = { isConfigured, chat, getToken, extractReply };
