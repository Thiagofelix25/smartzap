/**
 * Endpoint para limpar estado de instalação (debug only)
 * Acesse: GET /api/install/clear-state
 *
 * Retorna HTML com script para limpar localStorage e recarregar
 */

import { NextResponse } from 'next/server'

export async function GET() {
  // HTML que limpa localStorage e redireciona
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Limpando estado de instalação...</title>
        <meta charset="utf-8" />
        <style>
          body {
            background: #1a1a2e;
            color: #00ff00;
            font-family: monospace;
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
            font-size: 2em;
            margin-bottom: 20px;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="spinner">⟳</div>
          <p>Limpando estado de instalação...</p>
          <p id="status">Removendo smartzap_install_state</p>
        </div>
        <script>
          try {
            // Limpa localStorage
            localStorage.removeItem('smartzap_install_state');
            console.log('✓ localStorage limpo');
            document.getElementById('status').textContent = 'Estado limpo! Redirecionando...';

            // Aguarda 1s e redireciona
            setTimeout(() => {
              window.location.href = '/install';
            }, 1000);
          } catch (error) {
            console.error('Erro ao limpar:', error);
            document.getElementById('status').textContent = 'Erro: ' + error.message;
          }
        </script>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
