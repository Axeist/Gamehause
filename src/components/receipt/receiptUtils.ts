import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const generatePDF = async (element: HTMLElement, billId: string, customerName: string): Promise<void> => {
  if (!element) {
    throw new Error('Receipt element not found');
  }
  
  try {
    // Show loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.innerHTML = '<div style="font-size:16px;font-weight:bold;">Generating PDF...</div><div style="font-size:12px;margin-top:8px;color:#666;">Please wait</div>';
    loadingDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:20px 40px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:99999;text-align:center;';
    document.body.appendChild(loadingDiv);
    
    // The element passed is already the receipt content ref from ReceiptContent
    // Just use it directly
    const receiptContent = element;
    
    // Create a complete clone for PDF generation
    const clonedElement = receiptContent.cloneNode(true) as HTMLElement;
    
    // Hide all no-print elements in the clone
    const elementsToHide = clonedElement.querySelectorAll('.no-print, button, .edit-button');
    elementsToHide.forEach((el) => {
      (el as HTMLElement).style.display = 'none';
    });
    
    // Create a temporary container with A4 dimensions
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-99999px';
    tempContainer.style.top = '0';
    tempContainer.style.width = '794px'; // A4 width in pixels (210mm at 96 DPI)
    tempContainer.style.padding = '40px';
    tempContainer.style.backgroundColor = '#ffffff';
    tempContainer.style.color = '#000000';
    tempContainer.style.fontFamily = 'Arial, sans-serif';
    tempContainer.style.boxSizing = 'border-box';
    tempContainer.style.overflow = 'visible';
    
    // Ensure cloned content is properly styled
    clonedElement.style.width = '100%';
    clonedElement.style.maxHeight = 'none';
    clonedElement.style.overflow = 'visible';
    
    tempContainer.appendChild(clonedElement);
    document.body.appendChild(tempContainer);
    
    // Wait for layout to settle and images to load
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Get the actual height of the content
    const contentHeight = Math.max(
      clonedElement.scrollHeight,
      clonedElement.offsetHeight,
      clonedElement.clientHeight
    );
    
    tempContainer.style.height = `${contentHeight + 80}px`; // Add extra padding
    
    // Wait again for height adjustment
    await new Promise(resolve => setTimeout(resolve, 400));
    
    console.log('Capturing content:', {
      width: tempContainer.offsetWidth,
      height: tempContainer.offsetHeight,
      contentHeight: contentHeight
    });
    
    // Capture with html2canvas
    const canvas = await html2canvas(tempContainer, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      allowTaint: false,
      imageTimeout: 0,
      removeContainer: false,
      width: tempContainer.offsetWidth,
      height: tempContainer.offsetHeight,
      scrollX: 0,
      scrollY: 0,
      windowWidth: tempContainer.offsetWidth,
      windowHeight: tempContainer.offsetHeight
    });
    
    console.log('Canvas captured:', {
      width: canvas.width,
      height: canvas.height
    });
    
    // Remove temporary container and loading indicator
    document.body.removeChild(tempContainer);
    document.body.removeChild(loadingDiv);
    
    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Calculate dimensions
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;
    
    // Convert canvas to image
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    
    // Calculate number of pages needed
    const totalPages = Math.ceil(imgHeight / pageHeight);
    
    console.log(`Generating PDF: ${totalPages} page(s), Image height: ${imgHeight}mm`);
    
    // Add pages
    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        pdf.addPage();
      }
      
      const yOffset = -page * pageHeight;
      
      pdf.addImage(
        imgData,
        'JPEG',
        0,
        yOffset,
        imgWidth,
        imgHeight,
        undefined,
        'FAST'
      );
    }
    
    // Format filename
    const sanitizedCustomerName = customerName.replace(/[^a-zA-Z0-9]/g, '_');
    const shortBillId = billId.substring(0, 8).toUpperCase();
    const fileName = `Gamehaus_Receipt_${sanitizedCustomerName}_${shortBillId}.pdf`;
    
    pdf.save(fileName);
    
    console.log('PDF saved successfully:', fileName);
    
    return;
  } catch (error) {
    // Remove loading indicator if error occurs
    const loadingDivs = document.querySelectorAll('div[style*="z-index:99999"]');
    loadingDivs.forEach(div => {
      if (div.parentNode) {
        document.body.removeChild(div);
      }
    });
    
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
};

export const handlePrint = (printContent: string): void => {
  try {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (!printWindow) {
      throw new Error('Pop-up blocked. Please allow pop-ups for this site.');
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Gamehaus — Invoice</title>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            @page {
              size: A4;
              margin: 10mm;
            }

            html, body {
              font-family: 'Inter', sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              color: #1f2937;
              background: #fff;
            }

            body {
              margin: 0;
              padding: 0;
            }

            .indian-rupee::before {
              content: "₹";
              display: inline-block;
              margin-right: 2px;
            }

            .invoice-container,
            .receipt-container {
              width: 100%;
              max-width: 100%;
              margin: 0 auto;
              padding: 12px 16px 0;
              background: white;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              min-height: 257mm;
            }

            .no-break {
              page-break-inside: avoid;
              break-inside: avoid;
            }

            .receipt-header.inv-header {
              text-align: center;
              border-bottom: 1px solid #eee;
              padding-bottom: 16px;
              margin-bottom: 16px;
            }

            .inv-brand-hero {
              text-align: center;
              padding: 8px 0 20px;
            }

            img.inv-brand-logo {
              display: block;
              margin: 0 auto 14px;
              max-height: 100px;
              width: auto;
              max-width: 280px;
              height: auto;
              object-fit: contain;
            }

            .inv-brand-title {
              font-size: 52px;
              font-weight: 800;
              color: #ff4a1a;
              margin: 0;
              line-height: 1.05;
              letter-spacing: -0.03em;
            }

            .inv-tagline {
              font-size: 15px;
              color: #6b7280;
              margin: 10px 0 0 0;
              font-weight: 500;
            }

            .inv-doc-title {
              font-size: 22px;
              font-weight: 700;
              color: #1f2937;
              margin: 14px 0 0 0;
              text-transform: uppercase;
              letter-spacing: 0.12em;
            }

            .inv-address {
              font-size: 13px;
              color: #6b7280;
              line-height: 1.5;
              margin: 0 auto 16px;
              max-width: 48rem;
              text-align: center;
            }

            .inv-meta-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px 28px;
              font-size: 15px;
              color: #1f2937;
              text-align: left;
            }

            .inv-muted {
              color: #6b7280;
              display: block;
              font-size: 13px;
              font-weight: 500;
            }

            .inv-meta-grid p {
              margin: 2px 0 0 0;
              font-weight: 600;
            }

            .inv-comp-note {
              margin-top: 8px;
              padding: 8px;
              background: #fffbeb;
              border: 1px solid #fcd34d;
              border-radius: 4px;
            }

            .inv-comp-text {
              font-size: 11px;
              font-weight: 500;
              color: #92400e;
              font-style: italic;
              margin: 4px 0 0 0;
            }

            .inv-items-section-title {
              font-size: 18px;
              font-weight: 600;
              color: #1f2937;
              border-bottom: 1px solid #eee;
              padding-bottom: 8px;
              margin-bottom: 8px;
            }

            .inv-items-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 15px;
              margin-bottom: 16px;
            }

            .inv-items-table th {
              font-size: 14px;
              font-weight: 600;
              color: #374151;
              text-align: left;
              padding: 10px 10px 10px 0;
              border-bottom: 1px solid #eee;
            }

            .inv-items-table th:nth-child(2),
            .inv-items-table th:nth-child(3),
            .inv-items-table th:nth-child(4) {
              text-align: right;
            }

            .inv-items-table td {
              padding: 10px 10px 10px 0;
              border-bottom: 1px solid #eee;
              vertical-align: top;
              line-height: 1.4;
            }

            .inv-items-table td:nth-child(2),
            .inv-items-table td:nth-child(3),
            .inv-items-table td:nth-child(4) {
              text-align: right;
              font-variant-numeric: tabular-nums;
            }

            .inv-dur { color: #6b7280; }

            .inv-summary {
              margin-left: auto;
              max-width: 360px;
              width: 100%;
              margin-top: 16px;
              font-size: 15px;
            }

            .inv-summary-head {
              border-bottom: 1px solid #eee;
              padding-bottom: 8px;
              margin-bottom: 8px;
            }

            .inv-summary-title {
              font-size: 17px;
              font-weight: 600;
              color: #1f2937;
            }

            .inv-sum-row {
              display: flex;
              justify-content: space-between;
              gap: 8px;
              margin-bottom: 8px;
            }

            .inv-discount { color: #059669; }
            .inv-loyalty { color: #15803d; }

            .inv-total-row {
              display: flex;
              justify-content: space-between;
              align-items: baseline;
              gap: 8px;
              padding-top: 10px;
              margin-top: 10px;
              border-top: 1px solid #eee;
              font-size: 28px;
              font-weight: 700;
              color: #ff4a1a;
            }

            .inv-total-row .inv-total-amt {
              font-size: 28px !important;
              font-weight: 700 !important;
              color: #ff4a1a !important;
            }

            .inv-loyalty-foot {
              font-size: 12px;
              color: #6b7280;
              text-align: right;
              padding-top: 8px;
            }

            .inv-num { font-variant-numeric: tabular-nums; }

            .inv-payment {
              border-top: 1px solid #eee;
              padding: 14px 0;
              margin-top: 16px;
              font-size: 15px;
              color: #1f2937;
            }

            .inv-pay-label { font-weight: 600; color: #374151; }
            .inv-pay-total { font-weight: 700; color: #ff4a1a; }

            .inv-footer {
              border-top: 1px solid #eee;
              padding-top: 16px;
              margin-top: auto;
              padding-bottom: 10mm;
              text-align: center;
            }

            .inv-footer-terms {
              font-size: 12px;
              color: #4b5563;
              line-height: 1.5;
              max-width: 42rem;
              margin: 0 auto 12px;
            }

            .inv-footer-line {
              font-size: 12px;
              color: #6b7280;
              margin: 0;
            }

            .inv-footer-support {
              font-size: 11px;
              color: #9ca3af;
              margin: 8px 0 0 0;
            }

            .receipt-item {
              display: flex;
              justify-content: space-between;
              margin-bottom: 0.25rem;
            }

            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .items-center { align-items: center; }
            .text-right { text-align: right; }
            .font-mono { font-family: ui-monospace, monospace; }

            svg, .no-print, button, .edit-button {
              display: none !important;
            }

            img {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .receipt-header,
            .payment-method-section,
            .terms-section,
            .inv-summary,
            .inv-items-wrap {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            @media print {
              body {
                margin: 0;
                padding: 0;
              }

              html, body {
                height: auto;
              }

              .invoice-container,
              .receipt-container {
                max-width: 100%;
                min-height: 257mm;
                padding: 0 4mm;
              }

              * {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              table, thead, tbody, tr, td, th {
                page-break-inside: auto !important;
                break-inside: auto !important;
              }

              tr {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container receipt-container">
            ${printContent}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  } catch (error) {
    console.error('Error printing receipt:', error);
    throw new Error('Failed to print receipt. Please check your browser settings.');
  }
};
