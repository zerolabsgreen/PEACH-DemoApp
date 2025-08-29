import { NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createServerComponentClient()
    
    // Test basic connection and table structure
    const { data: testData, error: testError } = await supabase
      .from('eacertificates')
      .select('*')
      .limit(1)
    
    if (testError) {
      return NextResponse.json({ 
        success: false, 
        error: testError.message,
        details: testError 
      }, { status: 500 })
    }
    
    // Test inserting a minimal record
    const testInsert = {
      type: 'REC',
      amounts: [{"amount": 1, "unit": "MWh"}],
      external_ids: [],
      emissions: [],
      links: [],
      documents: [],
      production_source_id: null
    }
    
    const { data: insertData, error: insertError } = await supabase
      .from('eacertificates')
      .insert(testInsert)
      .select('id, type')
      .single()
    
    if (insertError) {
      return NextResponse.json({ 
        success: false, 
        error: `Insert test failed: ${insertError.message}`,
        details: insertError,
        testData: testData 
      }, { status: 500 })
    }
    
    // Clean up test record
    await supabase
      .from('eacertificates')
      .delete()
      .eq('id', insertData.id)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database connection and insert test successful',
      data: testData,
      insertTest: insertData 
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error 
    }, { status: 500 })
  }
}
