import { NextRequest, NextResponse } from 'next/server';
import { withPurchPayment } from '@/lib/payment-middleware';
import { getServiceSupabase } from '@/lib/supabase';

export const maxDuration = 30;

async function handler(req: NextRequest): Promise<Record<string, unknown>> {
  const body = await req.json();
  const {
    html,
    filename,
    pageSize = 'A4',
    orientation = 'portrait',
    margins = { top: '20px', bottom: '20px', left: '20px', right: '20px' },
  } = body as {
    html: string;
    filename: string;
    pageSize?: 'A4' | 'Letter';
    orientation?: 'portrait' | 'landscape';
    margins?: { top?: string; bottom?: string; left?: string; right?: string };
  };

  if (!html) throw new Error('html is required');
  if (!filename) throw new Error('filename is required');

  if (Buffer.byteLength(html, 'utf8') > 500 * 1024) {
    throw new Error('HTML exceeds 500KB limit');
  }

  // Strip script tags for security
  const safeHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  let pdfBuffer: Buffer;

  try {
    // Try @sparticuz/chromium first (serverless), fall back to puppeteer-core
    let browser;
    try {
      const chromium = (await import('@sparticuz/chromium')).default;
      const puppeteer = (await import('puppeteer-core')).default;
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: { width: 1280, height: 800 },
        executablePath: await chromium.executablePath(),
        headless: true,
      });
    } catch {
      // Fall back to system chromium for persistent server deployments
      const puppeteer = (await import('puppeteer-core')).default;
      browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium-browser',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }

    const page = await browser.newPage();
    await page.setContent(safeHtml, { waitUntil: 'networkidle0', timeout: 20000 });

    const pdfBytes = await page.pdf({
      format: pageSize,
      landscape: orientation === 'landscape',
      margin: margins,
      printBackground: true,
    });

    await browser.close();
    pdfBuffer = Buffer.from(pdfBytes);
  } catch (err) {
    throw new Error(`PDF generation failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Upload to Supabase Storage
  const supabase = getServiceSupabase();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'pdf-outputs';
  const safeFilename = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
  const storagePath = `${Date.now()}_${safeFilename}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, pdfBuffer, { contentType: 'application/pdf' });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data: signedData, error: signError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, 86400); // 24 hours

  if (signError || !signedData) {
    throw new Error(`Could not create download URL: ${signError?.message}`);
  }

  const expiresAt = new Date(Date.now() + 86400 * 1000).toISOString();

  return {
    downloadUrl: signedData.signedUrl,
    filename: `${safeFilename}.pdf`,
    fileSizeBytes: pdfBuffer.length,
    expiresAt,
    generatedAt: new Date().toISOString(),
  };
}

export const POST = withPurchPayment({
  price: 0.02,
  description: 'PDF Generator — render HTML to PDF with 24-hour download link',
  skillId: 'pdf-generate',
})(handler);
