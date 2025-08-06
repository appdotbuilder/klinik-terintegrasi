
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { labTestsTable, usersTable, patientsTable, medicalRecordsTable } from '../db/schema';
import { type CreateLabTestInput } from '../schema';
import { createLabTest } from '../handlers/create_lab_test';
import { eq } from 'drizzle-orm';

describe('createLabTest', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let patientId: number;
  let doctorId: number;
  let medicalRecordId: number;

  beforeEach(async () => {
    // Create test patient
    const patientResult = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MR001',
        full_name: 'Test Patient',
        date_of_birth: '1990-01-01',
        gender: 'male',
        phone: '1234567890',
        email: 'patient@test.com',
        address: '123 Test St',
        emergency_contact: 'Emergency Contact',
        emergency_phone: '0987654321',
        blood_type: 'O+',
        allergies: 'None'
      })
      .returning()
      .execute();
    patientId = patientResult[0].id;

    // Create test doctor
    const doctorResult = await db.insert(usersTable)
      .values({
        email: 'doctor@test.com',
        password_hash: 'hashed_password',
        full_name: 'Dr. Test Doctor',
        role: 'doctor'
      })
      .returning()
      .execute();
    doctorId = doctorResult[0].id;

    // Create test medical record
    const medicalRecordResult = await db.insert(medicalRecordsTable)
      .values({
        patient_id: patientId,
        doctor_id: doctorId,
        chief_complaint: 'Test complaint',
        diagnosis: 'Test diagnosis'
      })
      .returning()
      .execute();
    medicalRecordId = medicalRecordResult[0].id;
  });

  const testInput: CreateLabTestInput = {
    patient_id: 0, // Will be set in beforeEach
    medical_record_id: 0, // Will be set in beforeEach
    test_name: 'Complete Blood Count',
    test_type: 'Hematology',
    ordered_by: 0, // Will be set in beforeEach
    reference_values: 'Normal ranges: WBC 4.5-11.0, RBC 4.2-5.4',
    notes: 'Routine lab work'
  };

  it('should create a lab test', async () => {
    const input = {
      ...testInput,
      patient_id: patientId,
      medical_record_id: medicalRecordId,
      ordered_by: doctorId
    };

    const result = await createLabTest(input);

    // Basic field validation
    expect(result.test_name).toEqual('Complete Blood Count');
    expect(result.test_type).toEqual('Hematology');
    expect(result.patient_id).toEqual(patientId);
    expect(result.medical_record_id).toEqual(medicalRecordId);
    expect(result.ordered_by).toEqual(doctorId);
    expect(result.reference_values).toEqual('Normal ranges: WBC 4.5-11.0, RBC 4.2-5.4');
    expect(result.notes).toEqual('Routine lab work');
    expect(result.status).toEqual('ordered');
    expect(result.id).toBeDefined();
    expect(result.ordered_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.technician_id).toBeNull();
    expect(result.results).toBeNull();
    expect(result.completed_at).toBeNull();
  });

  it('should save lab test to database', async () => {
    const input = {
      ...testInput,
      patient_id: patientId,
      medical_record_id: medicalRecordId,
      ordered_by: doctorId
    };

    const result = await createLabTest(input);

    const labTests = await db.select()
      .from(labTestsTable)
      .where(eq(labTestsTable.id, result.id))
      .execute();

    expect(labTests).toHaveLength(1);
    expect(labTests[0].test_name).toEqual('Complete Blood Count');
    expect(labTests[0].test_type).toEqual('Hematology');
    expect(labTests[0].patient_id).toEqual(patientId);
    expect(labTests[0].medical_record_id).toEqual(medicalRecordId);
    expect(labTests[0].ordered_by).toEqual(doctorId);
    expect(labTests[0].status).toEqual('ordered');
    expect(labTests[0].ordered_at).toBeInstanceOf(Date);
  });

  it('should create lab test without medical record', async () => {
    const input = {
      ...testInput,
      patient_id: patientId,
      medical_record_id: null,
      ordered_by: doctorId
    };

    const result = await createLabTest(input);

    expect(result.patient_id).toEqual(patientId);
    expect(result.medical_record_id).toBeNull();
    expect(result.ordered_by).toEqual(doctorId);
    expect(result.test_name).toEqual('Complete Blood Count');
    expect(result.status).toEqual('ordered');
  });

  it('should create lab test with minimal required fields', async () => {
    const input: CreateLabTestInput = {
      patient_id: patientId,
      medical_record_id: null,
      test_name: 'Basic Metabolic Panel',
      test_type: 'Chemistry',
      ordered_by: doctorId,
      reference_values: null,
      notes: null
    };

    const result = await createLabTest(input);

    expect(result.test_name).toEqual('Basic Metabolic Panel');
    expect(result.test_type).toEqual('Chemistry');
    expect(result.reference_values).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.status).toEqual('ordered');
  });

  it('should fail when patient does not exist', async () => {
    const input = {
      ...testInput,
      patient_id: 99999,
      medical_record_id: medicalRecordId,
      ordered_by: doctorId
    };

    await expect(createLabTest(input)).rejects.toThrow(/foreign key constraint/i);
  });

  it('should fail when ordering doctor does not exist', async () => {
    const input = {
      ...testInput,
      patient_id: patientId,
      medical_record_id: medicalRecordId,
      ordered_by: 99999
    };

    await expect(createLabTest(input)).rejects.toThrow(/foreign key constraint/i);
  });

  it('should fail when medical record does not exist', async () => {
    const input = {
      ...testInput,
      patient_id: patientId,
      medical_record_id: 99999,
      ordered_by: doctorId
    };

    await expect(createLabTest(input)).rejects.toThrow(/foreign key constraint/i);
  });
});
