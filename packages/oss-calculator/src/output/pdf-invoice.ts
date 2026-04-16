/**
 * PDF Invoice Generator
 *
 * Directive 2006/112/EC, Article 226 compliant invoice generation.
 * Works in both Node.js and browser environments.
 *
 * @author Marieta Marinova
 * @license MIT
 */

import jsPDF from "jspdf";
import {
  Invoice,
  PDFOptions,
  PDFGenerationResult,
  GenerationError,
} from "./types";

/**
 * Formats a number as currency with proper decimals
 */
function formatCurrency(amount: number, decimalPlaces = 2): string {
  return amount.toFixed(decimalPlaces);
}

/**
 * Formats a date as DD.MM.YYYY
 */
function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Generates a PDF invoice compliant with Directive 2006/112/EC Article 226
 *
 * Mandatory fields per Article 226:
 * - Seller VAT ID
 * - Buyer identification (name, address, VAT if B2B)
 * - Sequential invoice number
 * - Invoice date
 * - Date of supply (if different)
 * - Description of goods/services
 * - Quantity
 * - Net amount per line
 * - VAT rate per line
 * - VAT amount per line
 * - Total net, VAT, gross amounts
 * - Currency
 */
export async function generatePDFInvoice(
  invoice: Invoice,
  options?: PDFOptions
): Promise<PDFGenerationResult | GenerationError> {
  try {
    // Validate invoice data
    const validationError = validateInvoice(invoice);
    if (validationError) {
      return validationError;
    }

    // Initialize PDF document
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: options?.format || "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = options?.marginMm || 15;
    const contentWidth = pageWidth - 2 * margin;
    const fontSize = options?.fontSize || 10;

    let yPosition = margin;

    // Set default font
    doc.setFont("helvetica");
    doc.setFontSize(fontSize);

    // ====== HEADER SECTION ======
    // Add company logo if provided
    if (options?.companyLogo) {
      try {
        doc.addImage(
          options.companyLogo.dataUrl,
          "PNG",
          margin,
          yPosition,
          options.companyLogo.widthMm,
          options.companyLogo.heightMm
        );
        yPosition += options.companyLogo.heightMm + 5;
      } catch (_) {
        // Logo load failed, skip it
      }
    }

    // Invoice title
    doc.setFontSize(fontSize + 6);
    doc.text("INVOICE", margin, yPosition);
    yPosition += 12;

    // Invoice number and date
    doc.setFontSize(fontSize);
    doc.text(`Invoice #: ${invoice.invoiceNumber}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Date: ${formatDate(invoice.invoiceDate)}`, margin, yPosition);
    yPosition += 6;

    if (invoice.supplyDate && invoice.supplyDate !== invoice.invoiceDate) {
      doc.text(`Date of Supply: ${formatDate(invoice.supplyDate)}`, margin, yPosition);
      yPosition += 6;
    }

    doc.text(`Currency: ${invoice.currency}`, margin, yPosition);
    yPosition += 10;

    // ====== SELLER/BUYER SECTION ======
    doc.setFontSize(fontSize - 1);
    doc.setFont("helvetica", "bold");
    doc.text("FROM (Seller):", margin, yPosition);
    doc.setFont("helvetica", "normal");
    yPosition += 5;

    const sellerLines = formatPartyBlock(invoice.seller);
    sellerLines.forEach((line) => {
      doc.text(line, margin + 5, yPosition);
      yPosition += 4;
    });

    yPosition += 2;

    doc.setFont("helvetica", "bold");
    doc.text("TO (Buyer):", margin, yPosition);
    doc.setFont("helvetica", "normal");
    yPosition += 5;

    const buyerLines = formatPartyBlock(invoice.buyer);
    buyerLines.forEach((line) => {
      doc.text(line, margin + 5, yPosition);
      yPosition += 4;
    });

    yPosition += 8;

    // ====== ADDITIONAL INFO ======
    if (invoice.referenceNumber) {
      doc.setFontSize(fontSize - 1);
      doc.text(`Purchase Order / Reference: ${invoice.referenceNumber}`, margin, yPosition);
      yPosition += 6;
    }

    if (invoice.paymentTerms) {
      doc.text(`Payment Terms: ${invoice.paymentTerms}`, margin, yPosition);
      yPosition += 6;
    }

    yPosition += 4;

    // ====== LINE ITEMS TABLE ======
    doc.setFontSize(fontSize - 1);
    doc.setFont("helvetica", "bold");

    const tableConfig = {
      startY: yPosition,
      head: [
        ["Description", "Qty", "Unit Price", "Net Amount", "VAT Rate", "VAT", "Gross"],
      ],
      body: invoice.lineItems.map((item) => [
        item.description.substring(0, 40), // truncate long descriptions
        item.quantity.toString(),
        formatCurrency(item.unitPrice),
        formatCurrency(item.netAmount),
        `${item.vatRate}%`,
        formatCurrency(item.vatAmount),
        formatCurrency(item.grossAmount),
      ]),
      columnStyles: {
        0: { cellWidth: 35 },
        1: { halign: "right", cellWidth: 10 },
        2: { halign: "right", cellWidth: 18 },
        3: { halign: "right", cellWidth: 18 },
        4: { halign: "right", cellWidth: 12 },
        5: { halign: "right", cellWidth: 18 },
        6: { halign: "right", cellWidth: 18 },
      },
      theme: "grid" as const,
      didDrawPage: (data: any) => {
        // Adjust styles
        doc.setFont("helvetica", "bold");
        doc.setFontSize(fontSize - 1);
      },
    };

    // Type assertion for autoTable compatibility
    (doc as any).autoTable?.(tableConfig);

    // Get final Y position after table
    if ((doc as any).lastAutoTable) {
      yPosition = (doc as any).lastAutoTable.finalY + 8;
    } else {
      yPosition += invoice.lineItems.length * 6 + 15;
    }

    // ====== TOTALS SECTION ======
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);

    const totalLabelX = margin + contentWidth - 80;
    const totalValueX = margin + contentWidth - 20;

    doc.text("Subtotal (Net):", totalLabelX, yPosition);
    doc.text(formatCurrency(invoice.totalNetAmount), totalValueX, yPosition, {
      align: "right",
    });
    yPosition += 6;

    doc.text(`Total VAT:`, totalLabelX, yPosition);
    doc.text(formatCurrency(invoice.totalVATAmount), totalValueX, yPosition, {
      align: "right",
    });
    yPosition += 6;

    // Total due in bold
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fontSize + 1);
    doc.text("TOTAL DUE:", totalLabelX, yPosition);
    doc.text(formatCurrency(invoice.totalGrossAmount), totalValueX, yPosition, {
      align: "right",
    });
    yPosition += 10;

    // ====== FOOTER ======
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize - 2);

    if (invoice.notes) {
      yPosition += 4;
      doc.text("Notes:", margin, yPosition);
      yPosition += 4;
      const noteLines = doc.splitTextToSize(invoice.notes, contentWidth - 10);
      noteLines.forEach((line: string) => {
        doc.text(line, margin + 5, yPosition);
        yPosition += 4;
      });
    }

    // Add page number at bottom
    const pageCount = (doc as any).internal.pages.length - 1;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize - 2);
    doc.text(
      `Page 1 of ${pageCount}`,
      margin,
      doc.internal.pageSize.getHeight() - 10
    );

    // Generate PDF as Uint8Array
    const pdfBytes = doc.output("arraybuffer") as ArrayBuffer;
    const pdf = new Uint8Array(pdfBytes);

    return {
      success: true,
      pdf,
      filename: `invoice-${invoice.invoiceNumber}.pdf`,
      mimeType: "application/pdf",
      generatedAt: new Date(),
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: "PDF generation failed",
      details: errorMessage,
    };
  }
}

/**
 * Format a Party (seller/buyer) into readable lines
 */
function formatPartyBlock(party: {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  vatNumber?: string;
}): string[] {
  const lines: string[] = [];
  lines.push(party.name);
  lines.push(party.address);
  lines.push(`${party.postalCode} ${party.city}`);
  lines.push(party.country);
  if (party.vatNumber) {
    lines.push(`VAT ID: ${party.vatNumber}`);
  }
  return lines;
}

/**
 * Validate invoice data for mandatory Article 226 fields
 */
function validateInvoice(
  invoice: Invoice
): GenerationError | null {
  const errors: string[] = [];

  // Check mandatory fields
  if (!invoice.invoiceNumber || invoice.invoiceNumber.trim() === "") {
    errors.push("Invoice number is required");
  }

  if (!invoice.invoiceDate) {
    errors.push("Invoice date is required");
  }

  if (!invoice.seller.vatNumber) {
    errors.push("Seller VAT number is mandatory per Article 226");
  }

  if (!invoice.buyer.name) {
    errors.push("Buyer name is required");
  }

  if (!invoice.buyer.address) {
    errors.push("Buyer address is required");
  }

  if (invoice.lineItems.length === 0) {
    errors.push("At least one line item is required");
  }

  // Check line item requirements
  for (let i = 0; i < invoice.lineItems.length; i++) {
    const item = invoice.lineItems[i];
    if (!item.description || item.description.trim() === "") {
      errors.push(`Line item ${i + 1}: Description is required`);
    }
    if (item.quantity < 0) {
      errors.push(`Line item ${i + 1}: Quantity must be non-negative`);
    }
    if (item.vatRate < 0 || item.vatRate > 100) {
      errors.push(`Line item ${i + 1}: VAT rate must be between 0-100%`);
    }
  }

  // Check totals are positive
  if (invoice.totalNetAmount < 0) {
    errors.push("Total net amount cannot be negative");
  }

  if (invoice.totalGrossAmount < invoice.totalNetAmount) {
    errors.push("Total gross amount must be >= total net amount");
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: "Invoice validation failed",
      details: errors.join("; "),
    };
  }

  return null;
}
