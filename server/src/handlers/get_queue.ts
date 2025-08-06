
import { db } from '../db';
import { queueTable, patientsTable } from '../db/schema';
import { type Queue } from '../schema';
import { eq } from 'drizzle-orm';

export const getQueue = async (date?: string): Promise<Queue[]> => {
  try {
    // Use today's date if no date provided
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // Query queue entries with patient information for the specified date
    const results = await db.select()
      .from(queueTable)
      .innerJoin(patientsTable, eq(queueTable.patient_id, patientsTable.id))
      .where(eq(queueTable.queue_date, targetDate))
      .orderBy(queueTable.queue_number)
      .execute();

    // Map results to Queue schema format
    return results.map(result => ({
      id: result.queue.id,
      patient_id: result.queue.patient_id,
      queue_number: result.queue.queue_number,
      queue_date: new Date(result.queue.queue_date), // Convert string to Date
      status: result.queue.status,
      priority: result.queue.priority,
      notes: result.queue.notes,
      created_at: result.queue.created_at,
      updated_at: result.queue.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch queue:', error);
    throw error;
  }
};
