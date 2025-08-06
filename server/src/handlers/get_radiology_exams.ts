
import { db } from '../db';
import { radiologyExamsTable } from '../db/schema';
import { type RadiologyExam } from '../schema';
import { eq, and, SQL } from 'drizzle-orm';

export const getRadiologyExams = async (patientId?: number, status?: string): Promise<RadiologyExam[]> => {
  try {
    // Build conditions array for filters
    const conditions: SQL<unknown>[] = [];

    if (patientId !== undefined) {
      conditions.push(eq(radiologyExamsTable.patient_id, patientId));
    }

    if (status !== undefined) {
      conditions.push(eq(radiologyExamsTable.status, status as any));
    }

    // Execute query with or without conditions
    const results = conditions.length === 0
      ? await db.select().from(radiologyExamsTable).execute()
      : await db.select()
          .from(radiologyExamsTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .execute();

    return results;
  } catch (error) {
    console.error('Get radiology exams failed:', error);
    throw error;
  }
};
