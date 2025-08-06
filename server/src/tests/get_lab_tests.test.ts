
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, patientsTable, labTestsTable } from '../db/schema';
import { getLabTests } from '../handlers/get_lab_tests';

describe('getLabTests', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all lab tests when no filters provided', async () => {
    // Create prerequisite data
    const doctor = await db.insert(usersTable)
      .values({
        email: 'doctor@test.com',
        password_hash: 'hash123',
        full_name: 'Dr. Test',
        role: 'doctor'
      })
      .returning()
      .execute();

    const patient = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN001',
        full_name: 'John Doe',
        date_of_birth: '1990-01-01',
        gender: 'male'
      })
      .returning()
      .execute();

    // Create lab tests
    await db.insert(labTestsTable)
      .values([
        {
          patient_id: patient[0].id,
          test_name: 'Blood Test',
          test_type: 'Hematology',
          ordered_by: doctor[0].id,
          status: 'ordered'
        },
        {
          patient_id: patient[0].id,
          test_name: 'Urine Test',
          test_type: 'Clinical Chemistry',
          ordered_by: doctor[0].id,
          status: 'completed'
        }
      ])
      .execute();

    const results = await getLabTests();

    expect(results).toHaveLength(2);
    expect(results[0].test_name).toEqual('Blood Test');
    expect(results[0].test_type).toEqual('Hematology');
    expect(results[0].status).toEqual('ordered');
    expect(results[0].patient_id).toEqual(patient[0].id);
    expect(results[0].ordered_by).toEqual(doctor[0].id);
    expect(results[0].id).toBeDefined();
    expect(results[0].ordered_at).toBeInstanceOf(Date);
    expect(results[0].created_at).toBeInstanceOf(Date);
  });

  it('should filter lab tests by patient ID', async () => {
    // Create prerequisite data
    const doctor = await db.insert(usersTable)
      .values({
        email: 'doctor@test.com',
        password_hash: 'hash123',
        full_name: 'Dr. Test',
        role: 'doctor'
      })
      .returning()
      .execute();

    const patients = await db.insert(patientsTable)
      .values([
        {
          medical_record_number: 'MRN001',
          full_name: 'John Doe',
          date_of_birth: '1990-01-01',
          gender: 'male'
        },
        {
          medical_record_number: 'MRN002',
          full_name: 'Jane Smith',
          date_of_birth: '1985-05-15',
          gender: 'female'
        }
      ])
      .returning()
      .execute();

    // Create lab tests for both patients
    await db.insert(labTestsTable)
      .values([
        {
          patient_id: patients[0].id,
          test_name: 'Blood Test',
          test_type: 'Hematology',
          ordered_by: doctor[0].id,
          status: 'ordered'
        },
        {
          patient_id: patients[1].id,
          test_name: 'X-Ray',
          test_type: 'Imaging',
          ordered_by: doctor[0].id,
          status: 'completed'
        }
      ])
      .execute();

    const results = await getLabTests(patients[0].id);

    expect(results).toHaveLength(1);
    expect(results[0].test_name).toEqual('Blood Test');
    expect(results[0].patient_id).toEqual(patients[0].id);
  });

  it('should filter lab tests by status', async () => {
    // Create prerequisite data
    const doctor = await db.insert(usersTable)
      .values({
        email: 'doctor@test.com',
        password_hash: 'hash123',
        full_name: 'Dr. Test',
        role: 'doctor'
      })
      .returning()
      .execute();

    const patient = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN001',
        full_name: 'John Doe',
        date_of_birth: '1990-01-01',
        gender: 'male'
      })
      .returning()
      .execute();

    // Create lab tests with different statuses
    await db.insert(labTestsTable)
      .values([
        {
          patient_id: patient[0].id,
          test_name: 'Blood Test',
          test_type: 'Hematology',
          ordered_by: doctor[0].id,
          status: 'ordered'
        },
        {
          patient_id: patient[0].id,
          test_name: 'Urine Test',
          test_type: 'Clinical Chemistry',
          ordered_by: doctor[0].id,
          status: 'completed'
        },
        {
          patient_id: patient[0].id,
          test_name: 'Culture Test',
          test_type: 'Microbiology',
          ordered_by: doctor[0].id,
          status: 'in_progress'
        }
      ])
      .execute();

    const results = await getLabTests(undefined, 'completed');

    expect(results).toHaveLength(1);
    expect(results[0].test_name).toEqual('Urine Test');
    expect(results[0].status).toEqual('completed');
  });

  it('should filter lab tests by both patient ID and status', async () => {
    // Create prerequisite data
    const doctor = await db.insert(usersTable)
      .values({
        email: 'doctor@test.com',
        password_hash: 'hash123',
        full_name: 'Dr. Test',
        role: 'doctor'
      })
      .returning()
      .execute();

    const patients = await db.insert(patientsTable)
      .values([
        {
          medical_record_number: 'MRN001',
          full_name: 'John Doe',
          date_of_birth: '1990-01-01',
          gender: 'male'
        },
        {
          medical_record_number: 'MRN002',
          full_name: 'Jane Smith',
          date_of_birth: '1985-05-15',
          gender: 'female'
        }
      ])
      .returning()
      .execute();

    // Create multiple lab tests
    await db.insert(labTestsTable)
      .values([
        {
          patient_id: patients[0].id,
          test_name: 'Blood Test',
          test_type: 'Hematology',
          ordered_by: doctor[0].id,
          status: 'completed'
        },
        {
          patient_id: patients[0].id,
          test_name: 'Urine Test',
          test_type: 'Clinical Chemistry',
          ordered_by: doctor[0].id,
          status: 'ordered'
        },
        {
          patient_id: patients[1].id,
          test_name: 'X-Ray',
          test_type: 'Imaging',
          ordered_by: doctor[0].id,
          status: 'completed'
        }
      ])
      .execute();

    const results = await getLabTests(patients[0].id, 'completed');

    expect(results).toHaveLength(1);
    expect(results[0].test_name).toEqual('Blood Test');
    expect(results[0].patient_id).toEqual(patients[0].id);
    expect(results[0].status).toEqual('completed');
  });

  it('should return empty array when no lab tests match filters', async () => {
    const results = await getLabTests(999, 'completed');

    expect(results).toHaveLength(0);
    expect(Array.isArray(results)).toBe(true);
  });

  it('should handle nullable fields correctly', async () => {
    // Create prerequisite data
    const doctor = await db.insert(usersTable)
      .values({
        email: 'doctor@test.com',
        password_hash: 'hash123',
        full_name: 'Dr. Test',
        role: 'doctor'
      })
      .returning()
      .execute();

    const patient = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN001',
        full_name: 'John Doe',
        date_of_birth: '1990-01-01',
        gender: 'male'
      })
      .returning()
      .execute();

    // Create lab test with nullable fields
    await db.insert(labTestsTable)
      .values({
        patient_id: patient[0].id,
        test_name: 'Blood Test',
        test_type: 'Hematology',
        ordered_by: doctor[0].id,
        status: 'ordered',
        medical_record_id: null,
        technician_id: null,
        results: null,
        reference_values: 'Normal: 4.5-5.5 million/mcL',
        notes: null,
        completed_at: null
      })
      .execute();

    const results = await getLabTests();

    expect(results).toHaveLength(1);
    expect(results[0].medical_record_id).toBeNull();
    expect(results[0].technician_id).toBeNull();
    expect(results[0].results).toBeNull();
    expect(results[0].reference_values).toEqual('Normal: 4.5-5.5 million/mcL');
    expect(results[0].notes).toBeNull();
    expect(results[0].completed_at).toBeNull();
  });
});
