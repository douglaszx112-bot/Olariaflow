import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface ExportPdfOptions {
  fileName?: string;
  title?: string;
  onProgress?: (step: string) => void;
}

/**
 * Captures the dashboard element including all rendered charts, KPI cards and tables,
 * and compiles them into a high-resolution, multi-page PDF document using html2canvas & jsPDF.
 */
export async function exportDashboardToPdf(
  targetElement: HTMLElement,
  options: ExportPdfOptions = {}
): Promise<void> {
  const {
    fileName = `relatorio_producao_${new Date().toISOString().slice(0, 10)}.pdf`,
    title = 'Telha Canal — Relatório de Produção e Perdas',
    onProgress,
  } = options;

  onProgress?.('Preparando gráficos e tabelas para captura...');

  // Store original styles to ensure clean full-bleed capture
  const originalWidth = targetElement.style.width;

  try {
    onProgress?.('Renderizando elementos em alta definição com html2canvas...');

    // Wait a brief tick for any pending animations or SVG redraws
    await new Promise((resolve) => setTimeout(resolve, 150));

    const canvas = await html2canvas(targetElement, {
      scale: 2, // 2x resolution for crisp text and sharp SVG charts
      useCORS: true,
      logging: false,
      backgroundColor: '#121110', // Maintain consistent dark theme background
      ignoreElements: (el) => {
        // Exclude UI controls, buttons and tooltips that shouldn't appear in the executive PDF
        return (
          el.classList.contains('no-print') ||
          el.classList.contains('no-pdf') ||
          (el.tagName === 'BUTTON' && el.closest('.no-print') !== null)
        );
      },
      windowWidth: 1280, // Consistent desktop-grade width rendering
      onclone: (clonedDoc: Document) => {
        // Fix for "Attempting to parse an unsupported color function oklab" in html2canvas
        const helperCanvas = clonedDoc.createElement('canvas');
        const ctx = helperCanvas.getContext('2d');

        const sanitizeColorStr = (str: string): string => {
          if (!str || (!str.includes('oklab') && !str.includes('oklch'))) return str;
          if (!ctx) return '#1c1b19';
          try {
            ctx.fillStyle = str;
            return ctx.fillStyle;
          } catch {
            return '#1c1b19';
          }
        };

        // 1. Sanitize stylesheets / style tags
        clonedDoc.querySelectorAll('style').forEach((st) => {
          if (st.textContent && (st.textContent.includes('oklab') || st.textContent.includes('oklch'))) {
            st.textContent = st.textContent
              .replace(/oklab\([^)]+\)/gi, (m) => sanitizeColorStr(m))
              .replace(/oklch\([^)]+\)/gi, (m) => sanitizeColorStr(m));
          }
        });

        // 2. Sanitize element inline styles
        const elements = clonedDoc.querySelectorAll('*');
        elements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          if (htmlEl.style) {
            const props = [
              'color',
              'backgroundColor',
              'borderColor',
              'borderTopColor',
              'borderBottomColor',
              'borderLeftColor',
              'borderRightColor',
              'outlineColor',
              'fill',
              'stroke',
            ];
            for (const prop of props) {
              const val = (htmlEl.style as any)[prop];
              if (typeof val === 'string' && (val.includes('oklab') || val.includes('oklch'))) {
                (htmlEl.style as any)[prop] = sanitizeColorStr(val);
              }
            }
          }
        });
      },
    });

    onProgress?.('Montando páginas do documento PDF com jsPDF...');

    // A4 dimensions in millimeters
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth(); // 210 mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 297 mm
    const margin = 8; // 8 mm margin on sides
    const contentWidth = pageWidth - margin * 2; // 194 mm

    // Aspect ratio calculation
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const totalContentHeightInMm = (imgHeight * contentWidth) / imgWidth;

    const availablePageHeight = pageHeight - margin * 2 - 10; // Reserve 10mm for header/footer
    let heightLeft = totalContentHeightInMm;
    let position = margin + 5; // Start just below header
    let pageNumber = 1;

    // Convert canvas to JPEG for compact PDF file size with high visual fidelity
    const imgData = canvas.toDataURL('image/jpeg', 0.94);

    // First page
    pdf.addImage(
      imgData,
      'JPEG',
      margin,
      position,
      contentWidth,
      totalContentHeightInMm,
      undefined,
      'FAST'
    );

    // Header & Footer helper
    const addHeaderFooter = (page: number) => {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(140, 134, 126);

      // Top title
      pdf.text(title, margin, 6);
      pdf.text(
        `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        pageWidth - margin,
        6,
        { align: 'right' }
      );

      // Bottom footer
      pdf.text('Sistema de Monitoramento Cerâmico — Telha Canal', margin, pageHeight - 4);
      pdf.text(`Página ${page}`, pageWidth - margin, pageHeight - 4, { align: 'right' });
    };

    addHeaderFooter(pageNumber);

    heightLeft -= availablePageHeight;

    // Subsequent pages if content overflows single A4 page
    while (heightLeft > 0) {
      position = -(pageNumber * availablePageHeight) + margin + 5;
      pdf.addPage();
      pageNumber++;

      pdf.addImage(
        imgData,
        'JPEG',
        margin,
        position,
        contentWidth,
        totalContentHeightInMm,
        undefined,
        'FAST'
      );

      addHeaderFooter(pageNumber);
      heightLeft -= availablePageHeight;
    }

    onProgress?.('Concluindo e baixando arquivo PDF...');
    pdf.save(fileName);
  } finally {
    targetElement.style.width = originalWidth;
  }
}
