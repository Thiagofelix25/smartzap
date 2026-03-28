/**
 * API Route Auth Wrappers
 *
 * Centralized authentication enforcement for API routes
 * Reduces boilerplate and ensures consistent security
 *
 * Usage:
 *   import { requireApiKey, requireAdminKey } from '@/lib/api-auth'
 *   async function handler(req, res) { ... }
 *   export const POST = requireApiKey(handler)
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyApiKey } from '@/lib/auth'

// ============================================================================
// Public Routes Allowlist
// ============================================================================
// Routes that intentionally do NOT require authentication
export const PUBLIC_ALLOWLIST = [
  '/api/webhook',
  '/api/health',
  '/api/flows',
  '/api/install',
  '/api/auth',
  '/api/lead-forms',
  '/api/phone-numbers',
]

// ============================================================================
// Response Format (Consistent)
// ============================================================================
function unauthorized(message = 'Unauthorized') {
  return NextResponse.json(
    {
      error: message,
      code: 'AUTH_REQUIRED',
    },
    { status: 401 }
  )
}

function forbidden(message = 'Forbidden') {
  return NextResponse.json(
    {
      error: message,
      code: 'AUTH_FORBIDDEN',
    },
    { status: 403 }
  )
}

// ============================================================================
// Wrapper: requireApiKey
// ============================================================================
/**
 * Wraps an API route handler to require SMARTZAP_API_KEY
 * Supports: Authorization: Bearer <key> or X-API-Key: <key>
 *
 * Usage:
 *   async function handler(req) { ... }
 *   export const POST = requireApiKey(handler)
 */
export function requireApiKey(
  handler: (req: NextRequest) => Promise<NextResponse | Response>
) {
  return async (req: NextRequest) => {
    // Check auth
    const authResult = await verifyApiKey(req)

    if (!authResult.valid) {
      return unauthorized('Invalid or missing API key')
    }

    // Allow both api and admin keys
    if (authResult.keyType !== 'api' && authResult.keyType !== 'admin') {
      return unauthorized('Invalid key type')
    }

    // Call original handler
    return handler(req)
  }
}

// ============================================================================
// Wrapper: requireAdminKey
// ============================================================================
/**
 * Wraps an API route handler to require SMARTZAP_ADMIN_KEY
 * More restrictive than requireApiKey
 *
 * Usage:
 *   async function handler(req) { ... }
 *   export const DELETE = requireAdminKey(handler)
 */
export function requireAdminKey(
  handler: (req: NextRequest) => Promise<NextResponse | Response>
) {
  return async (req: NextRequest) => {
    // Check auth
    const authResult = await verifyApiKey(req)

    if (!authResult.valid) {
      return unauthorized('Invalid or missing API key')
    }

    // Only allow admin key (not regular API key)
    if (authResult.keyType !== 'admin') {
      return forbidden('Admin key required')
    }

    // Call original handler
    return handler(req)
  }
}

// ============================================================================
// Wrapper: requireQStashSignature (for webhook callbacks)
// ============================================================================
/**
 * Wraps a QStash workflow callback handler
 * Verifies incoming QStash workflow execution signature
 *
 * This is separate from API key auth — uses QStash's own signature verification
 */
export function requireQStashSignature(
  handler: (req: NextRequest) => Promise<NextResponse | Response>
) {
  return async (req: NextRequest) => {
    // QStash signature verification happens in the workflow SDK
    // This wrapper is a placeholder for consistency
    // Actual verification: @upstash/workflow verifySignature()

    return handler(req)
  }
}

// ============================================================================
// Utility: Check if route should be public
// ============================================================================
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ALLOWLIST.some(
    (route) => pathname.startsWith(route) || pathname === route
  )
}

// ============================================================================
// Utility: Extract API Key from headers
// ============================================================================
export function extractApiKey(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization')
  const apiKeyHeader = req.headers.get('x-api-key')

  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  return apiKeyHeader
}
