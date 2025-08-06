
import { db } from '../db';
import { labTestsTable } from '../db/schema';
import { type LabTest } from '../schema';
import { eq, and, type SQL } from 'drizzle-orm';

export const getLabTests = async (patientId?: number, status?: string): Promise<LabTest[]> => {
  try {
    // Build conditions array for optional filters
    const conditions: SQL<unknown>[] = [];

    if (patientId !== undefined) {
      conditions.push(eq(labTestsTable.patient_id, patientId));
    }

    if (status !== undefined) {
      conditions.push(eq(labTestsTable.status, status as any));
    }

    // Build query with conditional where clause
    const results = conditions.length > 0
      ? await db.select().from(labTestsTable).where(and(...conditions)).execute()
      : await db.select().from(labTestsTable).execute();

    // Return results with proper type conversions
    // No numeric columns in lab_tests table, so no conversion needed
    return results;
  } catch (error) {
    console.error('Failed to fetch lab tests:', error);
    throw error;
  }
};
