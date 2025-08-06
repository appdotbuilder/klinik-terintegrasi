
import { db } from '../db';
import { invoicesTable } from '../db/schema';
import { type Invoice, paymentMethodEnum } from '../schema';
import { eq } from 'drizzle-orm';

export const processPayment = async (invoiceId: number, paymentMethod: string, cashierId: number): Promise<Invoice> => {
  try {
    // Validate payment method
    const validPaymentMethods = paymentMethodEnum.options;
    if (!validPaymentMethods.includes(paymentMethod as any)) {
      throw new Error(`Invalid payment method: ${paymentMethod}`);
    }

    // Check if invoice exists and is in pending status
    const existingInvoices = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, invoiceId))
      .execute();

    if (existingInvoices.length === 0) {
      throw new Error(`Invoice with id ${invoiceId} not found`);
    }

    const existingInvoice = existingInvoices[0];
    if (existingInvoice.payment_status !== 'pending') {
      throw new Error(`Invoice ${invoiceId} is already ${existingInvoice.payment_status}`);
    }

    // Update invoice with payment information
    const result = await db.update(invoicesTable)
      .set({
        payment_status: 'paid',
        payment_method: paymentMethod as any,
        payment_date: new Date(),
        cashier_id: cashierId,
        updated_at: new Date()
      })
      .where(eq(invoicesTable.id, invoiceId))
      .returning()
      .execute();

    const updatedInvoice = result[0];
    
    // Convert numeric fields back to numbers
    return {
      ...updatedInvoice,
      total_amount: parseFloat(updatedInvoice.total_amount),
      discount_amount: parseFloat(updatedInvoice.discount_amount),
      tax_amount: parseFloat(updatedInvoice.tax_amount),
      final_amount: parseFloat(updatedInvoice.final_amount)
    };
  } catch (error) {
    console.error('Payment processing failed:', error);
    throw error;
  }
};
