
import { db } from '../db';
import { invoicesTable } from '../db/schema';
import { type Invoice } from '../schema';
import { eq, and, SQL } from 'drizzle-orm';

export const getInvoices = async (patientId?: number, status?: string): Promise<Invoice[]> => {
  try {
    // Build conditions array for optional filtering
    const conditions: SQL<unknown>[] = [];

    if (patientId !== undefined) {
      conditions.push(eq(invoicesTable.patient_id, patientId));
    }

    if (status) {
      conditions.push(eq(invoicesTable.payment_status, status as any));
    }

    // Build final query with conditions
    const results = conditions.length === 0
      ? await db.select().from(invoicesTable).execute()
      : await db.select().from(invoicesTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .execute();

    // Convert numeric fields back to numbers
    return results.map(invoice => ({
      ...invoice,
      total_amount: parseFloat(invoice.total_amount),
      discount_amount: parseFloat(invoice.discount_amount),
      tax_amount: parseFloat(invoice.tax_amount),
      final_amount: parseFloat(invoice.final_amount)
    }));
  } catch (error) {
    console.error('Get invoices failed:', error);
    throw error;
  }
};
