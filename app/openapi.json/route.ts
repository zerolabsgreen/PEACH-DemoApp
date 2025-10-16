import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET() {
  try {
    const rootPath = process.cwd()
    const filePath = path.join(rootPath, 'openapi.json')
    const fileContents = await fs.readFile(filePath, 'utf8')
    const json = JSON.parse(fileContents)
    return NextResponse.json(json)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load openapi.json', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}


