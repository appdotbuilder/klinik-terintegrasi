
import { db } from '../db';
import { invoicesTable, invoiceItemsTable, patientsTable } from '../db/schema';
import { type CreateInvoiceInput, type Invoice } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const createInvoice = async (input: CreateInvoiceInput): Promise<Invoice> => {
  try {
    // Verify patient exists
    const patient = await db.select()
      .from(patientsTable)
      .where(eq(patientsTable.id, input.patient_id))
      .execute();

    if (patient.length === 0) {
      throw new Error(`Patient with ID ${input.patient_id} not found`);
    }

    // Generate unique invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Calculate totals from items
    const totalAmount = input.items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price);
    }, 0);

    const finalAmount = totalAmount - input.discount_amount + input.tax_amount;

    // Create invoice record
    const invoiceResult = await db.insert(invoicesTable)
      .values({
        invoice_number: invoiceNumber,
        patient_id: input.patient_id,
        total_amount: totalAmount.toString(),
        discount_amount: input.discount_amount.toString(),
        tax_amount: input.tax_amount.toString(),
        final_amount: finalAmount.toString(),
        notes: input.notes
      })
      .returning()
      .execute();

    const invoice = invoiceResult[0];

    // Create invoice items
    const itemsData = input.items.map(item => ({
      invoice_id: invoice.id,
      item_type: item.item_type,
      item_id: item.item_id,
      description: item.description,
      quantity: item.quantity.toString(),
      unit_price: item.unit_price.toString(),
      total_price: (item.quantity * item.unit_price).toString()
    }));

    await db.insert(invoiceItemsTable)
      .values(itemsData)
      .execute();

    // Convert numeric fields back to numbers
    return {
      ...invoice,
      total_amount: parseFloat(invoice.total_amount),
      discount_amount: parseFloat(invoice.discount_amount),
      tax_amount: parseFloat(invoice.tax_amount),
      final_amount: parseFloat(invoice.final_amount)
    };
  } catch (error) {
    console.error('Invoice creation failed:', error);
    throw error;
  }
};

async function generateInvoiceNumber(): Promise<string> {
  // Get the last invoice to determine next number
  const lastInvoice = await db.select()
    .from(invoicesTable)
    .orderBy(desc(invoicesTable.id))
    .limit(1)
    .execute();

  let nextNumber = 1;
  if (lastInvoice.length > 0) {
    // Extract number from last invoice number (format: INV000001)
    const lastNumber = lastInvoice[0].invoice_number.replace('INV', '');
    nextNumber = parseInt(lastNumber) + 1;
  }

  // Format as INV000001
  return `INV${nextNumber.toString().padStart(6, '0')}`;
}
