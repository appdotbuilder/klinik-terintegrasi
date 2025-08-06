
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { patientsTable, queueTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { updateQueueStatus } from '../handlers/update_queue_status';

describe('updateQueueStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update queue status successfully', async () => {
    // Create a patient first
    const patientResult = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN001',
        full_name: 'Test Patient',
        date_of_birth: '1990-01-01', // Use string format for date column
        gender: 'male'
      })
      .returning()
      .execute();

    // Create a queue entry
    const queueResult = await db.insert(queueTable)
      .values({
        patient_id: patientResult[0].id,
        queue_number: 1,
        queue_date: '2024-01-15', // Use string format for date column
        status: 'waiting',
        priority: 0
      })
      .returning()
      .execute();

    const queueId = queueResult[0].id;

    // Update queue status to in_progress
    const updatedQueue = await updateQueueStatus(queueId, 'in_progress');

    // Verify the update
    expect(updatedQueue.id).toEqual(queueId);
    expect(updatedQueue.status).toEqual('in_progress');
    expect(updatedQueue.patient_id).toEqual(patientResult[0].id);
    expect(updatedQueue.queue_number).toEqual(1);
    expect(updatedQueue.queue_date).toBeInstanceOf(Date);
    expect(updatedQueue.updated_at).toBeInstanceOf(Date);
  });

  it('should persist status change in database', async () => {
    // Create a patient first
    const patientResult = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN002',
        full_name: 'Another Patient',
        date_of_birth: '1985-05-15', // Use string format for date column
        gender: 'female'
      })
      .returning()
      .execute();

    // Create a queue entry
    const queueResult = await db.insert(queueTable)
      .values({
        patient_id: patientResult[0].id,
        queue_number: 2,
        queue_date: '2024-01-15', // Use string format for date column
        status: 'waiting',
        priority: 1
      })
      .returning()
      .execute();

    const queueId = queueResult[0].id;

    // Update to completed
    await updateQueueStatus(queueId, 'completed');

    // Verify in database
    const queueEntries = await db.select()
      .from(queueTable)
      .where(eq(queueTable.id, queueId))
      .execute();

    expect(queueEntries).toHaveLength(1);
    expect(queueEntries[0].status).toEqual('completed');
    expect(queueEntries[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update queue status to cancelled', async () => {
    // Create a patient first
    const patientResult = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN003',
        full_name: 'Cancelled Patient',
        date_of_birth: '1992-03-10', // Use string format for date column
        gender: 'male'
      })
      .returning()
      .execute();

    // Create a queue entry
    const queueResult = await db.insert(queueTable)
      .values({
        patient_id: patientResult[0].id,
        queue_number: 3,
        queue_date: '2024-01-15', // Use string format for date column
        status: 'in_progress',
        priority: 0,
        notes: 'Initial notes'
      })
      .returning()
      .execute();

    const queueId = queueResult[0].id;

    // Update to cancelled
    const updatedQueue = await updateQueueStatus(queueId, 'cancelled');

    // Verify the update preserves other fields
    expect(updatedQueue.status).toEqual('cancelled');
    expect(updatedQueue.notes).toEqual('Initial notes');
    expect(updatedQueue.priority).toEqual(0);
    expect(updatedQueue.queue_number).toEqual(3);
    expect(updatedQueue.queue_date).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent queue entry', async () => {
    await expect(updateQueueStatus(999, 'completed')).rejects.toThrow(/queue entry with id 999 not found/i);
  });

  it('should update timestamp correctly', async () => {
    // Create a patient first
    const patientResult = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN004',
        full_name: 'Timestamp Patient',
        date_of_birth: '1988-12-25', // Use string format for date column
        gender: 'female'
      })
      .returning()
      .execute();

    // Create a queue entry
    const queueResult = await db.insert(queueTable)
      .values({
        patient_id: patientResult[0].id,
        queue_number: 4,
        queue_date: '2024-01-15', // Use string format for date column
        status: 'waiting',
        priority: 0
      })
      .returning()
      .execute();

    const queueId = queueResult[0].id;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Update status
    const updatedQueue = await updateQueueStatus(queueId, 'completed');

    // Verify updated_at is more recent than created_at
    expect(updatedQueue.updated_at.getTime()).toBeGreaterThan(updatedQueue.created_at.getTime());
    expect(updatedQueue.queue_date).toBeInstanceOf(Date);
  });
});
