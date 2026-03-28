import { NextResponse, NextRequest } from 'next/server'

import { templateProjectDb } from '@/lib/supabase-db'
import { requireSessionOrApiKey } from '@/lib/request-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
    const auth = await requireSessionOrApiKey(request as NextRequest)
    if (auth) return auth

        const projects = await templateProjectDb.getAll()
        return NextResponse.json(projects)
    } catch (error) {
        console.error('Failed to fetch template projects:', error)
        return NextResponse.json(
            { error: 'Failed to fetch template projects' },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
    const auth = await requireSessionOrApiKey(request as NextRequest)
    if (auth) return auth

        const body = await request.json();
        console.log('[API CREATE PROJECT] Body Items:', JSON.stringify(body.items?.map((i: any) => ({ name: i.name, category: i.category })), null, 2));

        // Default: AI (compat). Builder manual poderá enviar { source: 'manual' }.
        if (!body.source) body.source = 'ai'

        const project = await templateProjectDb.create(body);
        return NextResponse.json(project)
    } catch (error) {
        console.error('Failed to create template project:', error)
        return NextResponse.json(
            { error: 'Failed to create template project' },
            { status: 500 }
        )
    }
}
