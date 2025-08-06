
import { db } from '../db';
import { queueTable } from '../db/schema';
import { type Queue } from '../schema';
import { eq } from 'drizzle-orm';

export const updateQueueStatus = async (id: number, status: 'waiting' | 'in_progress' | 'completed' | 'cancelled'): Promise<Queue> => {
  try {
    // Update queue status with timestamp
    const result = await db.update(queueTable)
      .set({ 
        status,
        updated_at: new Date()
      })
      .where(eq(queueTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Queue entry with id ${id} not found`);
    }

    // Convert date string back to Date object for queue_date
    const queueEntry = result[0];
    return {
      ...queueEntry,
      queue_date: new Date(queueEntry.queue_date)
    };
  } catch (error) {
    console.error('Queue status update failed:', error);
    throw error;
  }
};
