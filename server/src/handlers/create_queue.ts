
import { db } from '../db';
import { queueTable, patientsTable } from '../db/schema';
import { type CreateQueueInput, type Queue } from '../schema';
import { eq, max } from 'drizzle-orm';

export const createQueue = async (input: CreateQueueInput): Promise<Queue> => {
  try {
    // First verify that the patient exists
    const existingPatient = await db.select()
      .from(patientsTable)
      .where(eq(patientsTable.id, input.patient_id))
      .execute();

    if (existingPatient.length === 0) {
      throw new Error(`Patient with ID ${input.patient_id} not found`);
    }

    // Get the current date in YYYY-MM-DD format
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];

    // Use a serializable transaction to ensure atomic queue number generation
    const result = await db.transaction(async (tx) => {
      // Lock the table and find the highest queue number for today
      const maxQueueResult = await tx.select({ maxNumber: max(queueTable.queue_number) })
        .from(queueTable)
        .where(eq(queueTable.queue_date, todayString))
        .execute();

      // Generate next queue number (start from 1 if no queues exist for today)
      const nextQueueNumber = (maxQueueResult[0]?.maxNumber || 0) + 1;

      // Insert the queue entry
      const insertResult = await tx.insert(queueTable)
        .values({
          patient_id: input.patient_id,
          queue_number: nextQueueNumber,
          queue_date: todayString,
          status: 'waiting',
          priority: input.priority || 0,
          notes: input.notes || null
        })
        .returning()
        .execute();

      return insertResult[0];
    });

    // Convert the date string back to Date object for the Queue type
    return {
      ...result,
      queue_date: new Date(result.queue_date)
    };
  } catch (error) {
    console.error('Queue creation failed:', error);
    throw error;
  }
};
