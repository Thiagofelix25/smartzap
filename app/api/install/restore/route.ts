/**
 * Endpoint para restaurar estado de instalacao com dados validos.
 * Acesse: GET /api/install/restore
 *
 * Injeta localStorage com dados de identidade validos (step 1 completo)
 * para que o usuario possa continuar de onde parou sem ficar travado
 * por validacao de senha corrompida.
 *
 * PUBLIC — sem auth necessaria (endpoint de instalacao).
 */

import { NextResponse } from 'next/server'
import { SCHEMA_VERSION, EMPTY_INSTALL_DATA } from '@/lib/installer/types'

export async function GET() {
  // Estado valido: collecting, step 1, com dados default
  const validState = {
    version: SCHEMA_VERSION,
    state: {
      phase: 'collecting',
      step: 1,
      data: {
        ...EMPTY_INSTALL_DATA,
      },
      direction: 1,
    },
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Restaurando estado de instalacao...</title>
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
            max-width: 500px;
          }
          .icon {
            font-size: 3em;
            margin-bottom: 20px;
          }
          h2 {
            color: #00ffd5;
            letter-spacing: 2px;
            text-transform: uppercase;
            font-size: 1.1em;
          }
          .status {
            margin-top: 15px;
            padding: 12px;
            background: rgba(0, 255, 213, 0.1);
            border: 1px solid rgba(0, 255, 213, 0.3);
            border-radius: 8px;
            font-size: 0.85em;
          }
          .check { color: #00ff88; }
          .info { color: #888; margin-top: 10px; font-size: 0.8em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">&#9881;</div>
          <h2>Restaurando Estado</h2>
          <div class="status" id="status">Injetando dados validos...</div>
          <p class="info" id="info"></p>
        </div>
        <script>
          try {
            // Remove estado corrompido
            localStorage.removeItem('smartzap_install_state');

            // Injeta estado valido (step 1 limpo)
            var validState = ${JSON.stringify(validState)};
            localStorage.setItem('smartzap_install_state', JSON.stringify(validState));

            document.getElementById('status').innerHTML =
              '<span class="check">[OK]</span> Estado restaurado com sucesso!<br>' +
              '<span class="check">[OK]</span> Formulario limpo para preenchimento<br>' +
              '<span class="check">[OK]</span> Pronto para iniciar instalacao';
            document.getElementById('info').textContent = 'Redirecionando para /install em 2s...';

            setTimeout(function() {
              window.location.href = '/install';
            }, 2000);
          } catch (error) {
            document.getElementById('status').innerHTML =
              '<span style="color:#ff4466">[ERRO]</span> ' + error.message;
          }
        </script>
      </body>
    </html>
  `

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
