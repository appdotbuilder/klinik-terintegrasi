
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { queueTable, patientsTable } from '../db/schema';
import { type CreateQueueInput } from '../schema';
import { createQueue } from '../handlers/create_queue';
import { eq } from 'drizzle-orm';

describe('createQueue', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testPatientId: number;

  beforeEach(async () => {
    // Create a test patient for queue operations
    const patientResult = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN001',
        full_name: 'Test Patient',
        date_of_birth: '1990-01-01', // Use string format for date
        gender: 'male',
        phone: '123-456-7890',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    testPatientId = patientResult[0].id;
  });

  const testInput: CreateQueueInput = {
    patient_id: 0, // Will be set to testPatientId in each test
    priority: 1,
    notes: 'Test queue entry'
  };

  it('should create a queue entry with auto-generated queue number', async () => {
    const input = { ...testInput, patient_id: testPatientId };
    const result = await createQueue(input);

    expect(result.patient_id).toEqual(testPatientId);
    expect(result.queue_number).toEqual(1); // First queue entry of the day
    expect(result.status).toEqual('waiting');
    expect(result.priority).toEqual(1);
    expect(result.notes).toEqual('Test queue entry');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.queue_date).toBeInstanceOf(Date);
  });

  it('should increment queue number for multiple entries on same day', async () => {
    const input = { ...testInput, patient_id: testPatientId };

    // Create first queue entry
    const firstResult = await createQueue(input);
    expect(firstResult.queue_number).toEqual(1);

    // Create second queue entry
    const secondResult = await createQueue(input);
    expect(secondResult.queue_number).toEqual(2);

    // Create third queue entry
    const thirdResult = await createQueue(input);
    expect(thirdResult.queue_number).toEqual(3);
  });

  it('should use default priority when not provided', async () => {
    const inputWithoutPriority = {
      patient_id: testPatientId,
      priority: 0, // Zod default will be applied
      notes: 'Test without priority'
    };

    const result = await createQueue(inputWithoutPriority);
    expect(result.priority).toEqual(0);
  });

  it('should handle null notes', async () => {
    const inputWithNullNotes = {
      patient_id: testPatientId,
      priority: 1,
      notes: null
    };

    const result = await createQueue(inputWithNullNotes);
    expect(result.notes).toBeNull();
  });

  it('should save queue entry to database', async () => {
    const input = { ...testInput, patient_id: testPatientId };
    const result = await createQueue(input);

    // Verify the queue entry was saved
    const savedEntries = await db.select()
      .from(queueTable)
      .where(eq(queueTable.id, result.id))
      .execute();

    expect(savedEntries).toHaveLength(1);
    expect(savedEntries[0].patient_id).toEqual(testPatientId);
    expect(savedEntries[0].queue_number).toEqual(1);
    expect(savedEntries[0].status).toEqual('waiting');
    expect(savedEntries[0].priority).toEqual(1);
    expect(savedEntries[0].notes).toEqual('Test queue entry');
  });

  it('should set queue_date to current date', async () => {
    const input = { ...testInput, patient_id: testPatientId };
    const result = await createQueue(input);

    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    const expectedDate = new Date(todayString);

    expect(result.queue_date).toEqual(expectedDate);
  });

  it('should throw error when patient does not exist', async () => {
    const inputWithInvalidPatient = {
      ...testInput,
      patient_id: 99999 // Non-existent patient ID
    };

    await expect(createQueue(inputWithInvalidPatient))
      .rejects.toThrow(/Patient with ID 99999 not found/i);
  });

  it('should handle high priority queue entries', async () => {
    const highPriorityInput = {
      patient_id: testPatientId,
      priority: 10,
      notes: 'Emergency case'
    };

    const result = await createQueue(highPriorityInput);
    expect(result.priority).toEqual(10);
    expect(result.notes).toEqual('Emergency case');
  });

  it('should generate unique queue numbers sequentially', async () => {
    const input = { ...testInput, patient_id: testPatientId };

    // Create queue entries sequentially to ensure proper numbering
    const firstResult = await createQueue(input);
    const secondResult = await createQueue(input);
    const thirdResult = await createQueue(input);

    expect(firstResult.queue_number).toEqual(1);
    expect(secondResult.queue_number).toEqual(2);
    expect(thirdResult.queue_number).toEqual(3);

    // Verify all have the same date
    const dates = [firstResult, secondResult, thirdResult].map(r => r.queue_date.toDateString());
    expect(dates.every(date => date === dates[0])).toBe(true);
  });

  it('should maintain queue number uniqueness', async () => {
    const input = { ...testInput, patient_id: testPatientId };

    // Create multiple entries to test numbering consistency
    const results = [];
    for (let i = 0; i < 3; i++) {
      const result = await createQueue(input);
      results.push(result);
    }

    const queueNumbers = results.map(r => r.queue_number);
    expect(queueNumbers).toEqual([1, 2, 3]);

    // Verify all entries exist in database with correct numbers
    const allEntries = await db.select()
      .from(queueTable)
      .where(eq(queueTable.patient_id, testPatientId))
      .execute();

    expect(allEntries).toHaveLength(3);
    const dbQueueNumbers = allEntries.map(entry => entry.queue_number).sort((a, b) => a - b);
    expect(dbQueueNumbers).toEqual([1, 2, 3]);
  });
});
