
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { radiologyExamsTable, patientsTable, medicalRecordsTable, usersTable } from '../db/schema';
import { type CreateRadiologyExamInput } from '../schema';
import { createRadiologyExam } from '../handlers/create_radiology_exam';
import { eq } from 'drizzle-orm';

// Test data setup
let testPatient: any;
let testDoctor: any;
let testMedicalRecord: any;

const testInput: CreateRadiologyExamInput = {
  patient_id: 0, // Will be set in beforeEach
  medical_record_id: null, // Will be set in some tests
  exam_type: 'X-Ray',
  body_part: 'Chest',
  ordered_by: 0 // Will be set in beforeEach
};

describe('createRadiologyExam', () => {
  beforeEach(async () => {
    await createDB();

    // Create test patient
    const patientResult = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN001',
        full_name: 'John Doe',
        date_of_birth: '1990-01-01',
        gender: 'male'
      })
      .returning()
      .execute();
    testPatient = patientResult[0];

    // Create test doctor
    const doctorResult = await db.insert(usersTable)
      .values({
        email: 'doctor@test.com',
        password_hash: 'hash123',
        full_name: 'Dr. Smith',
        role: 'doctor'
      })
      .returning()
      .execute();
    testDoctor = doctorResult[0];

    // Create test medical record
    const medicalRecordResult = await db.insert(medicalRecordsTable)
      .values({
        patient_id: testPatient.id,
        doctor_id: testDoctor.id,
        chief_complaint: 'Test complaint',
        diagnosis: 'Test diagnosis'
      })
      .returning()
      .execute();
    testMedicalRecord = medicalRecordResult[0];

    // Update test input with created IDs
    testInput.patient_id = testPatient.id;
    testInput.ordered_by = testDoctor.id;
  });

  afterEach(resetDB);

  it('should create a radiology exam', async () => {
    const result = await createRadiologyExam(testInput);

    // Basic field validation
    expect(result.patient_id).toEqual(testPatient.id);
    expect(result.medical_record_id).toBeNull();
    expect(result.exam_type).toEqual('X-Ray');
    expect(result.body_part).toEqual('Chest');
    expect(result.status).toEqual('ordered');
    expect(result.ordered_by).toEqual(testDoctor.id);
    expect(result.radiologist_id).toBeNull();
    expect(result.findings).toBeNull();
    expect(result.impression).toBeNull();
    expect(result.recommendations).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.ordered_at).toBeInstanceOf(Date);
    expect(result.completed_at).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create radiology exam with medical record ID', async () => {
    const inputWithMedicalRecord = {
      ...testInput,
      medical_record_id: testMedicalRecord.id
    };

    const result = await createRadiologyExam(inputWithMedicalRecord);

    expect(result.medical_record_id).toEqual(testMedicalRecord.id);
    expect(result.patient_id).toEqual(testPatient.id);
    expect(result.exam_type).toEqual('X-Ray');
    expect(result.body_part).toEqual('Chest');
    expect(result.ordered_by).toEqual(testDoctor.id);
  });

  it('should save radiology exam to database', async () => {
    const result = await createRadiologyExam(testInput);

    // Query using proper drizzle syntax
    const radiologyExams = await db.select()
      .from(radiologyExamsTable)
      .where(eq(radiologyExamsTable.id, result.id))
      .execute();

    expect(radiologyExams).toHaveLength(1);
    expect(radiologyExams[0].patient_id).toEqual(testPatient.id);
    expect(radiologyExams[0].exam_type).toEqual('X-Ray');
    expect(radiologyExams[0].body_part).toEqual('Chest');
    expect(radiologyExams[0].status).toEqual('ordered');
    expect(radiologyExams[0].ordered_by).toEqual(testDoctor.id);
    expect(radiologyExams[0].ordered_at).toBeInstanceOf(Date);
    expect(radiologyExams[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent patient', async () => {
    const invalidInput = {
      ...testInput,
      patient_id: 999999
    };

    await expect(createRadiologyExam(invalidInput)).rejects.toThrow(/patient with id 999999 not found/i);
  });

  it('should throw error for non-existent doctor', async () => {
    const invalidInput = {
      ...testInput,
      ordered_by: 999999
    };

    await expect(createRadiologyExam(invalidInput)).rejects.toThrow(/doctor with id 999999 not found/i);
  });

  it('should throw error for non-existent medical record', async () => {
    const invalidInput = {
      ...testInput,
      medical_record_id: 999999
    };

    await expect(createRadiologyExam(invalidInput)).rejects.toThrow(/medical record with id 999999 not found/i);
  });

  it('should handle different exam types and body parts', async () => {
    const mriInput = {
      ...testInput,
      exam_type: 'MRI',
      body_part: 'Brain'
    };

    const result = await createRadiologyExam(mriInput);

    expect(result.exam_type).toEqual('MRI');
    expect(result.body_part).toEqual('Brain');
    expect(result.status).toEqual('ordered');
  });
});
