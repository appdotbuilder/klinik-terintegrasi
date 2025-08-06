
import { db } from '../db';
import { prescriptionsTable } from '../db/schema';
import { type Prescription } from '../schema';
import { eq, and, type SQL } from 'drizzle-orm';

export const getPrescriptions = async (patientId?: number, status?: string): Promise<Prescription[]> => {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (patientId !== undefined) {
      conditions.push(eq(prescriptionsTable.patient_id, patientId));
    }

    if (status) {
      conditions.push(eq(prescriptionsTable.status, status as any));
    }

    // Execute query with or without conditions
    const results = conditions.length > 0
      ? await db.select()
          .from(prescriptionsTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .execute()
      : await db.select()
          .from(prescriptionsTable)
          .execute();

    // Convert numeric fields back to numbers
    return results.map(prescription => ({
      ...prescription,
      total_amount: parseFloat(prescription.total_amount)
    }));
  } catch (error) {
    console.error('Failed to fetch prescriptions:', error);
    throw error;
  }
};
