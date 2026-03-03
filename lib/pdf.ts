export async function extractTextFromPDF(file: File): Promise<string> {
  if (typeof window === 'undefined') return '';
  
  try {
    console.log('Starting PDF extraction for file:', file.name, 'Size:', file.size);
    
    // Dynamically import pdfjs-dist using a more direct path
    // For v5, the main entry point is often problematic in some bundlers
    let pdfjsLib;
    try {
      // @ts-ignore
      const mod = await import('pdfjs-dist/build/pdf.min.mjs');
      pdfjsLib = mod.default || mod;
    } catch (e) {
      console.warn('Direct minified mjs import failed, trying standard mjs:', e);
      try {
        // @ts-ignore
        const mod = await import('pdfjs-dist/build/pdf.mjs');
        pdfjsLib = mod.default || mod;
      } catch (e2) {
        console.warn('Standard mjs import failed, trying main entry:', e2);
        const mod = await import('pdfjs-dist');
        pdfjsLib = mod.default || mod;
      }
    }
    
    if (!pdfjsLib || !pdfjsLib.getDocument) {
      throw new Error('Não foi possível carregar a biblioteca de PDF.');
    }

    // Set the worker source - using unpkg as a fallback
    const version = pdfjsLib.version || '5.5.207';
    // For v5, the worker is an mjs file
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.mjs`;
    
    console.log('PDF.js version:', version);
    
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      useWorkerFetch: true,
      isEvalSupported: false,
    });
    
    const pdf = await loadingTask.promise;
    let fullText = '';

    console.log(`PDF loaded successfully. Pages: ${pdf.numPages}`);

    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => (item as any).str || '')
          .join(' ');
        fullText += pageText + '\n';
      } catch (pageError) {
        console.warn(`Error extracting text from page ${i}:`, pageError);
      }
    }

    const trimmedText = fullText.trim();
    if (trimmedText.length === 0) {
      console.warn('No text extracted from PDF. It might be an image-based PDF.');
      throw new Error('Não foi possível extrair texto deste PDF. Ele pode ser um PDF de imagem (scaneado) ou estar protegido.');
    }

    console.log('PDF extraction complete. Total characters:', trimmedText.length);
    return trimmedText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    if (error instanceof Error) {
      if (error.message.includes('worker')) {
        throw new Error('Erro no carregamento do processador de PDF. Verifique sua conexão.');
      }
      throw error;
    }
    throw new Error('Falha desconhecida ao processar o PDF.');
  }
}
