
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { prescriptionsTable, patientsTable, usersTable } from '../db/schema';
import { getPrescriptions } from '../handlers/get_prescriptions';

describe('getPrescriptions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should fetch all prescriptions when no filters provided', async () => {
    // Create test user (doctor)
    const [doctor] = await db.insert(usersTable)
      .values({
        email: 'doctor@test.com',
        password_hash: 'hash123',
        full_name: 'Dr. Test',
        role: 'doctor'
      })
      .returning()
      .execute();

    // Create test patient
    const [patient] = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN001',
        full_name: 'Test Patient',
        date_of_birth: '1990-01-01',
        gender: 'male'
      })
      .returning()
      .execute();

    // Create test prescriptions
    await db.insert(prescriptionsTable)
      .values([
        {
          patient_id: patient.id,
          prescribed_by: doctor.id,
          status: 'pending',
          total_amount: '150.50'
        },
        {
          patient_id: patient.id,
          prescribed_by: doctor.id,
          status: 'dispensed',
          total_amount: '75.25'
        }
      ])
      .execute();

    const result = await getPrescriptions();

    expect(result).toHaveLength(2);
    expect(result[0].total_amount).toEqual(150.50);
    expect(result[1].total_amount).toEqual(75.25);
    expect(typeof result[0].total_amount).toBe('number');
    expect(result[0].patient_id).toEqual(patient.id);
    expect(result[0].prescribed_by).toEqual(doctor.id);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should filter prescriptions by patient ID', async () => {
    // Create test users
    const [doctor] = await db.insert(usersTable)
      .values({
        email: 'doctor@test.com',
        password_hash: 'hash123',
        full_name: 'Dr. Test',
        role: 'doctor'
      })
      .returning()
      .execute();

    // Create test patients
    const [patient1] = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN001',
        full_name: 'Patient One',
        date_of_birth: '1990-01-01',
        gender: 'male'
      })
      .returning()
      .execute();

    const [patient2] = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN002',
        full_name: 'Patient Two',
        date_of_birth: '1985-05-15',
        gender: 'female'
      })
      .returning()
      .execute();

    // Create prescriptions for both patients
    await db.insert(prescriptionsTable)
      .values([
        {
          patient_id: patient1.id,
          prescribed_by: doctor.id,
          status: 'pending',
          total_amount: '100.00'
        },
        {
          patient_id: patient2.id,
          prescribed_by: doctor.id,
          status: 'pending',
          total_amount: '200.00'
        }
      ])
      .execute();

    const result = await getPrescriptions(patient1.id);

    expect(result).toHaveLength(1);
    expect(result[0].patient_id).toEqual(patient1.id);
    expect(result[0].total_amount).toEqual(100.00);
    expect(typeof result[0].total_amount).toBe('number');
  });

  it('should filter prescriptions by status', async () => {
    // Create test user
    const [doctor] = await db.insert(usersTable)
      .values({
        email: 'doctor@test.com',
        password_hash: 'hash123',
        full_name: 'Dr. Test',
        role: 'doctor'
      })
      .returning()
      .execute();

    // Create test patient
    const [patient] = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN001',
        full_name: 'Test Patient',
        date_of_birth: '1990-01-01',
        gender: 'male'
      })
      .returning()
      .execute();

    // Create prescriptions with different statuses
    await db.insert(prescriptionsTable)
      .values([
        {
          patient_id: patient.id,
          prescribed_by: doctor.id,
          status: 'pending',
          total_amount: '50.00'
        },
        {
          patient_id: patient.id,
          prescribed_by: doctor.id,
          status: 'dispensed',
          total_amount: '75.00'
        },
        {
          patient_id: patient.id,
          prescribed_by: doctor.id,
          status: 'cancelled',
          total_amount: '25.00'
        }
      ])
      .execute();

    const result = await getPrescriptions(undefined, 'dispensed');

    expect(result).toHaveLength(1);
    expect(result[0].status).toEqual('dispensed');
    expect(result[0].total_amount).toEqual(75.00);
    expect(typeof result[0].total_amount).toBe('number');
  });

  it('should filter prescriptions by both patient ID and status', async () => {
    // Create test user
    const [doctor] = await db.insert(usersTable)
      .values({
        email: 'doctor@test.com',
        password_hash: 'hash123',
        full_name: 'Dr. Test',
        role: 'doctor'
      })
      .returning()
      .execute();

    // Create test patients
    const [patient1] = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN001',
        full_name: 'Patient One',
        date_of_birth: '1990-01-01',
        gender: 'male'
      })
      .returning()
      .execute();

    const [patient2] = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN002',
        full_name: 'Patient Two',
        date_of_birth: '1985-05-15',
        gender: 'female'
      })
      .returning()
      .execute();

    // Create multiple prescriptions
    await db.insert(prescriptionsTable)
      .values([
        {
          patient_id: patient1.id,
          prescribed_by: doctor.id,
          status: 'pending',
          total_amount: '30.00'
        },
        {
          patient_id: patient1.id,
          prescribed_by: doctor.id,
          status: 'dispensed',
          total_amount: '40.00'
        },
        {
          patient_id: patient2.id,
          prescribed_by: doctor.id,
          status: 'pending',
          total_amount: '50.00'
        }
      ])
      .execute();

    const result = await getPrescriptions(patient1.id, 'pending');

    expect(result).toHaveLength(1);
    expect(result[0].patient_id).toEqual(patient1.id);
    expect(result[0].status).toEqual('pending');
    expect(result[0].total_amount).toEqual(30.00);
    expect(typeof result[0].total_amount).toBe('number');
  });

  it('should return empty array when no prescriptions match filters', async () => {
    // Create test user
    const [doctor] = await db.insert(usersTable)
      .values({
        email: 'doctor@test.com',
        password_hash: 'hash123',
        full_name: 'Dr. Test',
        role: 'doctor'
      })
      .returning()
      .execute();

    // Create test patient
    const [patient] = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN001',
        full_name: 'Test Patient',
        date_of_birth: '1990-01-01',
        gender: 'male'
      })
      .returning()
      .execute();

    // Create prescription with different status
    await db.insert(prescriptionsTable)
      .values({
        patient_id: patient.id,
        prescribed_by: doctor.id,
        status: 'pending',
        total_amount: '100.00'
      })
      .execute();

    const result = await getPrescriptions(patient.id, 'dispensed');

    expect(result).toHaveLength(0);
  });

  it('should handle nullable fields correctly', async () => {
    // Create test user
    const [doctor] = await db.insert(usersTable)
      .values({
        email: 'doctor@test.com',
        password_hash: 'hash123',
        full_name: 'Dr. Test',
        role: 'doctor'
      })
      .returning()
      .execute();

    // Create test patient
    const [patient] = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN001',
        full_name: 'Test Patient',
        date_of_birth: '1990-01-01',
        gender: 'male'
      })
      .returning()
      .execute();

    // Create prescription with nullable fields set to null
    await db.insert(prescriptionsTable)
      .values({
        patient_id: patient.id,
        prescribed_by: doctor.id,
        medical_record_id: null,
        dispensed_by: null,
        status: 'pending',
        dispensed_date: null,
        total_amount: '125.75',
        notes: null
      })
      .execute();

    const result = await getPrescriptions();

    expect(result).toHaveLength(1);
    expect(result[0].medical_record_id).toBeNull();
    expect(result[0].dispensed_by).toBeNull();
    expect(result[0].dispensed_date).toBeNull();
    expect(result[0].notes).toBeNull();
    expect(result[0].total_amount).toEqual(125.75);
    expect(typeof result[0].total_amount).toBe('number');
  });
});
