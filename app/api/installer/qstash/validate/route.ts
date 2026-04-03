import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/installer/qstash/validate
 *
 * Valida o token do QStash com estrategia multi-camada:
 *  1. Tenta endpoints remotos (issuer do JWT + fallbacks)
 *  2. Se nenhum endpoint responde, aceita token se JWT valido com issuer
 *
 * Isso garante que o usuario avanca mesmo se a API QStash estiver
 * temporariamente indisponivel ou se a regiao (EU/US) nao responde
 * no endpoint padrao.
 *
 * PUBLIC — sem auth necessaria (endpoint de instalacao).
 */

/**
 * Decodifica payload JWT sem verificar assinatura.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payloadB64 = parts[1];
    const base64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

/**
 * Decodifica token base64 do QStash (formato: base64 de JSON com UserID + Password).
 * Este e o formato mais comum retornado pelo console Upstash.
 */
function decodeBase64Token(token: string): { UserID: string; Password: string } | null {
  try {
    const base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    const decoded = JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'));
    if (decoded && typeof decoded.UserID === 'string' && typeof decoded.Password === 'string') {
      return decoded;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Tenta validar token contra um endpoint QStash. Timeout: 6s.
 */
async function tryEndpoint(url: string, token: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    // Validacao basica
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token QStash e obrigatorio' },
        { status: 400 }
      );
    }

    const cleanToken = token.trim().replace(/^["'`]|["'`]$/g, '');

    if (cleanToken.length < 20) {
      return NextResponse.json(
        { error: 'Token muito curto. Copie o QSTASH_TOKEN completo do console Upstash.' },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------------
    // Camada 0: Detecta formato do token (JWT vs base64 JSON)
    // ---------------------------------------------------------------
    const isJwt = cleanToken.split('.').length === 3;
    const base64Decoded = !isJwt ? decodeBase64Token(cleanToken) : null;

    // ---------------------------------------------------------------
    // Camada 1: Decodifica JWT para extrair issuer (URL da regiao)
    // ---------------------------------------------------------------
    const payload = isJwt ? decodeJwtPayload(cleanToken) : null;
    const issuer = payload?.iss ? String(payload.iss).replace(/\/$/, '') : null;

    console.log('[QStash Validate] Token analysis:', {
      isJwt,
      isBase64: !!base64Decoded,
      hasPayload: !!payload,
      issuer,
      userId: base64Decoded?.UserID?.substring(0, 8) || null,
    });

    // ---------------------------------------------------------------
    // Camada 2: Tenta validacao remota em multiplos endpoints
    // ---------------------------------------------------------------
    const endpointsToTry: string[] = [];

    // Issuer do JWT primeiro (mais provavel de funcionar)
    if (issuer) {
      endpointsToTry.push(`${issuer}/v2/schedules`);
      endpointsToTry.push(`${issuer}/v1/keys`);
    }

    // Fallbacks para regioes conhecidas
    const fallbackBases = [
      'https://qstash.upstash.io',
      'https://qstash-eu-west-1.upstash.io',
      'https://qstash-us-east-1.upstash.io',
    ];

    for (const base of fallbackBases) {
      const url = `${base}/v2/schedules`;
      if (!endpointsToTry.includes(url)) {
        endpointsToTry.push(url);
      }
    }

    // Testa todos em paralelo — retorna assim que um funcionar
    const results = await Promise.all(
      endpointsToTry.map(async (url) => {
        const ok = await tryEndpoint(url, cleanToken);
        return { url, ok };
      })
    );

    const workingEndpoint = results.find(r => r.ok);

    if (workingEndpoint) {
      console.log('[QStash Validate] Token validado remotamente via:', workingEndpoint.url);
      return NextResponse.json({
        valid: true,
        message: 'Token QStash valido',
        validatedVia: workingEndpoint.url,
      });
    }

    // ---------------------------------------------------------------
    // Camada 3: Validacao offline (JWT estrutural OU base64 JSON)
    // Aceita se token e decodificavel com estrutura QStash valida
    // ---------------------------------------------------------------
    console.log('[QStash Validate] Nenhum endpoint remoto respondeu OK. Tentando validacao offline...');

    // Camada 3a: Base64 JSON token (formato mais comum do Upstash)
    if (base64Decoded) {
      // Token base64 com UserID e Password — formato valido do QStash
      // A API pode estar temporariamente indisponivel ou o usuario esta em uma regiao nao testada
      console.log('[QStash Validate] Token aceito por validacao offline (base64 JSON com UserID+Password)');
      return NextResponse.json({
        valid: true,
        message: 'Token QStash aceito (validacao offline — formato base64 valido)',
        validatedVia: 'base64-offline',
        warning: 'A API QStash nao respondeu em nenhuma regiao, mas o token tem estrutura valida (UserID + Password). Se houver problemas ao enviar mensagens, verifique o token no console Upstash.',
      });
    }

    // Camada 3b: JWT token com issuer QStash
    if (payload && issuer) {
      // Verifica se o issuer parece ser QStash
      const looksLikeQstash =
        issuer.includes('qstash') ||
        issuer.includes('upstash');

      if (looksLikeQstash) {
        // Verifica expiracao
        if (payload.exp) {
          const expDate = new Date(Number(payload.exp) * 1000);
          if (expDate < new Date()) {
            return NextResponse.json(
              { error: `Token QStash expirado em ${expDate.toISOString()}. Gere um novo no console Upstash.` },
              { status: 401 }
            );
          }
        }

        console.log('[QStash Validate] Token aceito por validacao offline (JWT valido + issuer QStash)');
        return NextResponse.json({
          valid: true,
          message: 'Token QStash aceito (validacao offline — API temporariamente indisponivel)',
          validatedVia: 'jwt-offline',
          warning: 'A API QStash nao respondeu, mas o token tem estrutura valida. Se houver problemas, verifique o token no console Upstash.',
        });
      }
    }

    // ---------------------------------------------------------------
    // Camada 4: Tudo falhou
    // ---------------------------------------------------------------
    // Log detalhado dos resultados para debug
    const failedDetails = results.map(r => `${r.url}: ${r.ok ? 'OK' : 'FAIL'}`).join(', ');
    console.error('[QStash Validate] Todas as tentativas falharam:', failedDetails);

    return NextResponse.json(
      {
        error: 'Token QStash invalido. Verifique se copiou o QSTASH_TOKEN (nao o signing key) da aba Details no console Upstash.',
        details: {
          jwtDecoded: !!payload,
          isBase64: !!base64Decoded,
          issuerFound: !!issuer,
          endpointsTried: endpointsToTry.length,
          hint: !payload && !base64Decoded
            ? 'Token nao tem formato reconhecido. O QSTASH_TOKEN correto comeca com "eyJ" (base64 ou JWT).'
            : issuer
              ? 'JWT decodificado mas nenhum endpoint aceitou. Token pode estar revogado.'
              : 'Token decodificado mas sem identificadores QStash validos.',
        },
      },
      { status: 401 }
    );

  } catch (error) {
    console.error('[installer/qstash/validate] Erro:', error);
    return NextResponse.json(
      { error: `Erro interno ao validar token: ${error instanceof Error ? error.message : 'desconhecido'}` },
      { status: 500 }
    );
  }
}
