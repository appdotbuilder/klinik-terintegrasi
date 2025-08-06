
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { queueTable, patientsTable } from '../db/schema';
import { getQueue } from '../handlers/get_queue';

describe('getQueue', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no queue entries exist', async () => {
    const result = await getQueue();
    expect(result).toEqual([]);
  });

  it('should return queue entries for today by default', async () => {
    // Create a test patient first
    const patientResult = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN001',
        full_name: 'Test Patient',
        date_of_birth: '1990-01-01',
        gender: 'male',
        phone: '1234567890',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const patient = patientResult[0];
    const today = new Date().toISOString().split('T')[0];

    // Create queue entries for today
    await db.insert(queueTable)
      .values([
        {
          patient_id: patient.id,
          queue_number: 1,
          queue_date: today,
          status: 'waiting',
          priority: 0,
          notes: 'First patient'
        },
        {
          patient_id: patient.id,
          queue_number: 2,
          queue_date: today,
          status: 'waiting',
          priority: 1,
          notes: 'Second patient'
        }
      ])
      .execute();

    const result = await getQueue();

    expect(result).toHaveLength(2);
    expect(result[0].queue_number).toBe(1);
    expect(result[0].patient_id).toBe(patient.id);
    expect(result[0].status).toBe('waiting');
    expect(result[0].priority).toBe(0);
    expect(result[0].notes).toBe('First patient');
    expect(result[0].queue_date).toBeInstanceOf(Date);
    expect(result[0].queue_date.toISOString().split('T')[0]).toBe(today);

    expect(result[1].queue_number).toBe(2);
    expect(result[1].patient_id).toBe(patient.id);
    expect(result[1].status).toBe('waiting');
    expect(result[1].priority).toBe(1);
    expect(result[1].notes).toBe('Second patient');
  });

  it('should return queue entries for specific date', async () => {
    // Create a test patient
    const patientResult = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN002',
        full_name: 'Another Patient',
        date_of_birth: '1985-05-15',
        gender: 'female'
      })
      .returning()
      .execute();

    const patient = patientResult[0];
    const specificDate = '2024-01-15';

    // Create queue entry for specific date
    await db.insert(queueTable)
      .values({
        patient_id: patient.id,
        queue_number: 5,
        queue_date: specificDate,
        status: 'in_progress',
        priority: 2,
        notes: 'Urgent case'
      })
      .execute();

    const result = await getQueue('2024-01-15');

    expect(result).toHaveLength(1);
    expect(result[0].queue_number).toBe(5);
    expect(result[0].status).toBe('in_progress');
    expect(result[0].priority).toBe(2);
    expect(result[0].notes).toBe('Urgent case');
    expect(result[0].queue_date).toBeInstanceOf(Date);
    expect(result[0].queue_date.toISOString().split('T')[0]).toBe(specificDate);
  });

  it('should return queue entries ordered by queue number', async () => {
    // Create a test patient
    const patientResult = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN003',
        full_name: 'Order Test Patient',
        date_of_birth: '1992-08-20',
        gender: 'male'
      })
      .returning()
      .execute();

    const patient = patientResult[0];
    const today = new Date().toISOString().split('T')[0];

    // Create queue entries in random order
    await db.insert(queueTable)
      .values([
        {
          patient_id: patient.id,
          queue_number: 3,
          queue_date: today,
          status: 'waiting',
          priority: 0
        },
        {
          patient_id: patient.id,
          queue_number: 1,
          queue_date: today,
          status: 'completed',
          priority: 0
        },
        {
          patient_id: patient.id,
          queue_number: 2,
          queue_date: today,
          status: 'in_progress',
          priority: 1
        }
      ])
      .execute();

    const result = await getQueue();

    expect(result).toHaveLength(3);
    expect(result[0].queue_number).toBe(1);
    expect(result[0].status).toBe('completed');
    expect(result[1].queue_number).toBe(2);
    expect(result[1].status).toBe('in_progress');
    expect(result[2].queue_number).toBe(3);
    expect(result[2].status).toBe('waiting');
  });

  it('should not return queue entries from different dates', async () => {
    // Create a test patient
    const patientResult = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN004',
        full_name: 'Date Filter Patient',
        date_of_birth: '1988-03-10',
        gender: 'female'
      })
      .returning()
      .execute();

    const patient = patientResult[0];
    const today = new Date().toISOString().split('T')[0];
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Create queue entries for different dates
    await db.insert(queueTable)
      .values([
        {
          patient_id: patient.id,
          queue_number: 1,
          queue_date: today,
          status: 'waiting',
          priority: 0
        },
        {
          patient_id: patient.id,
          queue_number: 1,
          queue_date: yesterdayStr,
          status: 'completed',
          priority: 0
        }
      ])
      .execute();

    const result = await getQueue();

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('waiting');
    expect(result[0].queue_date.toISOString().split('T')[0]).toBe(today);
  });

  it('should include all required Queue schema fields', async () => {
    // Create a test patient
    const patientResult = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN005',
        full_name: 'Schema Test Patient',
        date_of_birth: '1995-12-25',
        gender: 'male'
      })
      .returning()
      .execute();

    const patient = patientResult[0];
    const today = new Date().toISOString().split('T')[0];

    await db.insert(queueTable)
      .values({
        patient_id: patient.id,
        queue_number: 10,
        queue_date: today,
        status: 'cancelled',
        priority: 3,
        notes: 'Patient cancelled appointment'
      })
      .execute();

    const result = await getQueue();

    expect(result).toHaveLength(1);
    const queueEntry = result[0];
    
    expect(queueEntry.id).toBeDefined();
    expect(typeof queueEntry.id).toBe('number');
    expect(queueEntry.patient_id).toBe(patient.id);
    expect(queueEntry.queue_number).toBe(10);
    expect(queueEntry.queue_date).toBeInstanceOf(Date);
    expect(queueEntry.status).toBe('cancelled');
    expect(queueEntry.priority).toBe(3);
    expect(queueEntry.notes).toBe('Patient cancelled appointment');
    expect(queueEntry.created_at).toBeInstanceOf(Date);
    expect(queueEntry.updated_at).toBeInstanceOf(Date);
  });
});
