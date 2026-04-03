/**
 * Endpoint para injetar token Vercel no localStorage e continuar instalacao
 * Acesse: GET /api/install/inject-vercel-token?token=vcp_...
 *
 * Injeta o token no estado de instalacao (step 2) e redireciona para /install
 * Permite continuar sem precisar colar manualmente na pagina
 *
 * PUBLIC — sem auth necessaria (endpoint de instalacao).
 */

import { NextResponse } from 'next/server'
import { SCHEMA_VERSION, EMPTY_INSTALL_DATA } from '@/lib/installer/types'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')

  if (!token) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Injetar Token Vercel</title>
          <meta charset="utf-8" />
          <style>
            body {
              background: #0a0a1a;
              color: #00ffd5;
              font-family: 'Courier New', monospace;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .container {
              text-align: center;
              max-width: 600px;
            }
            h2 {
              color: #00ffd5;
              letter-spacing: 2px;
            }
            .error {
              color: #ff6b6b;
              margin: 20px 0;
              padding: 15px;
              background: rgba(255, 107, 107, 0.1);
              border: 1px solid rgba(255, 107, 107, 0.3);
              border-radius: 8px;
            }
            .info {
              color: #888;
              margin-top: 15px;
              font-size: 0.9em;
            }
            code {
              background: rgba(0, 255, 213, 0.1);
              padding: 8px 12px;
              border-radius: 4px;
              display: block;
              margin: 10px 0;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Parametro faltando</h2>
            <div class="error">
              Forneca o token Vercel via parametro de URL
            </div>
            <p class="info">Formato:</p>
            <code>
              /api/install/inject-vercel-token?token=vcp_seu_token_aqui
            </code>
            <p class="info">Copie o token Vercel completo apos "vcp_"</p>
          </div>
        </body>
      </html>`,
      {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    )
  }

  // Estado com o token Vercel injetado no step 2
  // Preserva dados de steps anteriores com valores default
  const installState = {
    version: SCHEMA_VERSION,
    state: {
      phase: 'collecting',
      step: 2, // Step Vercel
      data: {
        ...EMPTY_INSTALL_DATA,
        vercelToken: token.trim(),
      },
      direction: 1,
    },
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Injetando token Vercel...</title>
        <meta charset="utf-8" />
        <style>
          body {
            background: #0a0a1a;
            color: #00ffd5;
            font-family: 'Courier New', monospace;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          .container {
            text-align: center;
          }
          .spinner {
            font-size: 3em;
            margin-bottom: 20px;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          h2 {
            color: #00ffd5;
            letter-spacing: 2px;
            text-transform: uppercase;
          }
          .status {
            margin-top: 15px;
            padding: 12px;
            background: rgba(0, 255, 213, 0.1);
            border: 1px solid rgba(0, 255, 213, 0.3);
            border-radius: 8px;
            font-size: 0.9em;
          }
          .check { color: #00ff88; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="spinner">&#x27F3;</div>
          <h2>Injetando Token Vercel</h2>
          <div class="status" id="status">
            <span class="check">[1/4]</span> Lendo estado atual...<br>
            <span class="check">[2/4]</span> Preservando dados anteriores...<br>
            <span class="check">[3/4]</span> Injetando token Vercel...<br>
            <span class="check">[4/4]</span> Redirecionando...
          </div>
        </div>
        <script>
          try {
            // Le estado existente para preservar dados de steps anteriores
            var existingRaw = localStorage.getItem('smartzap_install_state');
            var existingData = {};
            if (existingRaw) {
              try {
                var parsed = JSON.parse(existingRaw);
                if (parsed && parsed.state && parsed.state.data) {
                  existingData = parsed.state.data;
                }
              } catch (e) {
                console.warn('[Install] Estado anterior invalido, usando defaults');
              }
            }

            // Mescla dados anteriores com o novo token Vercel
            var newState = ${JSON.stringify(installState)};
            newState.state.data = Object.assign({}, newState.state.data, existingData, {
              vercelToken: ${JSON.stringify(token.trim())}
            });

            localStorage.setItem('smartzap_install_state', JSON.stringify(newState));

            console.log('[Install] Token Vercel injetado:', {
              token: '${token.substring(0, 20)}...',
              step: 2,
              preservedFields: Object.keys(existingData).filter(function(k) { return existingData[k]; })
            });

            // Aguarda 1.5s e redireciona
            setTimeout(function() {
              window.location.href = '/install';
            }, 1500);
          } catch (error) {
            document.getElementById('status').innerHTML =
              '<span style="color:#ff4466">[ERRO]</span> ' + error.message;
            console.error('Erro ao injetar token:', error);
          }
        </script>
      </body>
    </html>
  `

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
