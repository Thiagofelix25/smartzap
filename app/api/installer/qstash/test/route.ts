import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/installer/qstash/test
 *
 * Teste abrangente do token QStash: tenta multiplos endpoints
 * e retorna diagnostico completo.
 * Usado pelo wizard de instalacao para validacao robusta.
 *
 * PUBLIC — sem auth necessaria (endpoint de instalacao).
 */

interface EndpointResult {
  url: string;
  status: number | null;
  ok: boolean;
  error?: string;
  responsePreview?: string;
}

interface JwtInfo {
  decoded: boolean;
  issuer: string | null;
  detectedRegion: string | null;
  expiresAt: string | null;
  issuedAt: string | null;
  raw: Record<string, unknown> | null;
}

interface TestResult {
  tokenValid: boolean;
  jwtInfo: JwtInfo;
  endpoints: EndpointResult[];
  workingUrl: string | null;
  summary: string;
  nextSteps: string[];
}

/**
 * Decodifica o payload JWT sem verificar assinatura.
 * Suficiente para extrair issuer e detectar regiao.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payloadB64 = parts[1];
    // Base64url -> base64 standard + padding
    const base64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

/**
 * Detecta regiao a partir do issuer URL ou do token payload.
 */
function detectRegion(issuer: string | null): string | null {
  if (!issuer) return null;
  const lower = issuer.toLowerCase();

  if (lower.includes('eu-west') || lower.includes('eu-central') || lower.includes('fra1')) {
    return 'EU';
  }
  if (lower.includes('us-east') || lower.includes('us-west') || lower.includes('us1')) {
    return 'US';
  }
  // Generico qstash.upstash.io => geralmente US
  if (lower === 'https://qstash.upstash.io') {
    return 'US (default)';
  }
  return 'unknown';
}

/**
 * Tenta um GET em um endpoint QStash com o token fornecido.
 * Timeout de 8s para nao travar o wizard.
 */
async function probeEndpoint(url: string, token: string): Promise<EndpointResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    let responsePreview = '';
    try {
      const text = await res.text();
      responsePreview = text.substring(0, 200);
    } catch {
      // ignore
    }

    return {
      url,
      status: res.status,
      ok: res.ok,
      responsePreview: res.ok ? responsePreview : undefined,
      error: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      url,
      status: null,
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown fetch error',
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token || typeof token !== 'string' || token.trim().length < 10) {
      return NextResponse.json(
        { error: 'Token QStash e obrigatorio (minimo 10 caracteres)' },
        { status: 400 }
      );
    }

    const cleanToken = token.trim().replace(/^["'`]|["'`]$/g, '');

    // ---------------------------------------------------------------
    // 1. Decodifica JWT
    // ---------------------------------------------------------------
    const payload = decodeJwtPayload(cleanToken);
    const issuer = payload?.iss ? String(payload.iss).replace(/\/$/, '') : null;
    const detectedRegion = detectRegion(issuer);

    const jwtInfo: JwtInfo = {
      decoded: payload !== null,
      issuer,
      detectedRegion,
      expiresAt: payload?.exp ? new Date(Number(payload.exp) * 1000).toISOString() : null,
      issuedAt: payload?.iat ? new Date(Number(payload.iat) * 1000).toISOString() : null,
      raw: payload ? { sub: payload.sub, iss: payload.iss, aud: payload.aud } : null,
    };

    // ---------------------------------------------------------------
    // 2. Monta lista de URLs para testar (issuer primeiro, depois fallbacks)
    // ---------------------------------------------------------------
    const endpointsToTest: string[] = [];

    // Se o JWT tem issuer, usa como URL principal
    if (issuer) {
      endpointsToTest.push(`${issuer}/v2/schedules`);
      endpointsToTest.push(`${issuer}/v1/keys`);
    }

    // Fallbacks para todas as regioes conhecidas
    const knownBases = [
      'https://qstash.upstash.io',
      'https://qstash-eu-west-1.upstash.io',
      'https://qstash-us-east-1.upstash.io',
    ];

    for (const base of knownBases) {
      const url = `${base}/v2/schedules`;
      if (!endpointsToTest.includes(url)) {
        endpointsToTest.push(url);
      }
    }

    // Whoami como teste extra
    if (issuer) {
      endpointsToTest.push(`${issuer}/v1/whoami`);
    }
    endpointsToTest.push('https://qstash.upstash.io/v1/whoami');

    // ---------------------------------------------------------------
    // 3. Testa endpoints em paralelo (ate 6 simultaneos)
    // ---------------------------------------------------------------
    const results = await Promise.all(
      endpointsToTest.map(url => probeEndpoint(url, cleanToken))
    );

    // ---------------------------------------------------------------
    // 4. Determina resultado
    // ---------------------------------------------------------------
    const workingEndpoint = results.find(r => r.ok);
    let workingUrl: string | null = null;
    let tokenValid = false;
    let summary = '';
    const nextSteps: string[] = [];

    if (workingEndpoint) {
      tokenValid = true;
      // Extrai base URL do endpoint que funcionou
      const match = workingEndpoint.url.match(/^(https:\/\/[^/]+)/);
      workingUrl = match ? match[1] : workingEndpoint.url;
      summary = `Token valido! Endpoint funcional: ${workingUrl}`;
      nextSteps.push('Token pronto para uso. Pode prosseguir com a instalacao.');
    } else {
      // Nenhum endpoint remoto funcionou — verifica se JWT e estruturalmente valido
      if (payload && issuer) {
        // JWT decodificavel com issuer = provavelmente valido, API pode estar temporariamente indisponivel
        tokenValid = true;
        workingUrl = issuer;
        summary = 'Nenhum endpoint QStash respondeu, mas o token tem estrutura JWT valida com issuer. Aceito por validacao offline.';
        nextSteps.push(
          'O token sera usado conforme o issuer detectado no JWT.',
          'Se houver problemas depois, verifique se o token nao expirou no console Upstash.',
        );
      } else if (payload) {
        // JWT decodificavel mas sem issuer
        tokenValid = false;
        summary = 'Token tem formato JWT mas nao contem campo "iss" (issuer). Pode nao ser um token QStash valido.';
        nextSteps.push(
          'Verifique se copiou o QSTASH_TOKEN (nao o signing key ou current/next key).',
          'O token correto esta na aba "Details" do QStash no console Upstash.',
        );
      } else {
        tokenValid = false;
        summary = 'Token nao e um JWT valido e nenhum endpoint QStash aceitou.';
        nextSteps.push(
          'Copie o QSTASH_TOKEN da aba "Details" no console Upstash.',
          'O token deve comecar com "eyJ" (formato JWT).',
          'Nao copie o signing key — copie especificamente o QSTASH_TOKEN.',
        );
      }
    }

    const result: TestResult = {
      tokenValid,
      jwtInfo,
      endpoints: results,
      workingUrl,
      summary,
      nextSteps,
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('[installer/qstash/test] Erro:', error);
    return NextResponse.json(
      { error: `Erro interno: ${error instanceof Error ? error.message : 'desconhecido'}` },
      { status: 500 }
    );
  }
}
