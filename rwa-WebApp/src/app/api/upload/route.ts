// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { requireSessionWallet } from '@/lib/wallet-session';

// Max file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// The extension comes from the checked MIME type, never from the uploaded
// file's name: a name ending in .html or .svg would otherwise be served from
// this site as a page.
const EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};
const ALLOWED_TYPES = Object.keys(EXTENSIONS);

// `type` names the folder the file goes in, so it may not contain path
// separators or dots: "../../app" used to write outside public/uploads.
const SAFE_TYPE = /^[a-z0-9_-]{1,32}$/i;

export async function POST(request: NextRequest) {
  const session = requireSessionWallet(request);
  if (!session.ok) return session.response;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string || 'document';

    if (!SAFE_TYPE.test(type)) {
      return NextResponse.json({ error: 'Invalid upload type' }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PDF, DOC, DOCX, JPG, PNG, WEBP' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const extension = EXTENSIONS[file.type];
    const filename = `${type}_${timestamp}_${randomId}.${extension}`;

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', type);
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Write file to disk
    const filepath = join(uploadsDir, filename);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Return public URL
    const url = `/uploads/${type}/${filename}`;

    return NextResponse.json({
      success: true,
      url,
      filename,
      originalName: file.name,
      size: file.size,
      type: file.type,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

// Optional: GET to list uploads (for debugging)
export async function GET() {
  return NextResponse.json({ message: 'Upload endpoint ready' });
}