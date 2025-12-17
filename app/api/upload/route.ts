import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import fs from 'fs';
import path from 'path';

// Helper to save file to disk (For demo purposes. In production, use S3/Blob storage)
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create unique filename
        const filename = `${Date.now()}-${file.name.replace(/\s/g, '-')}`;
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');

        // Ensure directory exists (handled by user manually or we check)
        // For now we assume public/uploads exists or we return a relative path that works if it exists

        // Write to public/uploads
        // Note: We are not checking if directory exists to keep it simple, 
        // but in a real app we should ensure it exists.
        const filepath = path.join(uploadDir, filename);

        // This might fail if directory doesn't exist
        try {
            await writeFile(filepath, buffer);
        } catch (e) {
            // Setup directory if missing (simple fallback)
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
                await writeFile(filepath, buffer);
            } else {
                throw e;
            }
        }

        const url = `/uploads/${filename}`;

        return NextResponse.json({ url });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Upload failed' },
            { status: 500 }
        );
    }
}
