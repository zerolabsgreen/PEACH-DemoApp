import { NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createServerComponentClient()
    
    // Test the connection by getting the current user (will be null if not authenticated)
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      return NextResponse.json(
        { error: 'Supabase connection failed', details: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      message: 'Supabase connection successful',
      user: user ? { id: user.id, email: user.email } : null,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
