
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { medicalRecordsTable, patientsTable, usersTable } from '../db/schema';
import { type CreateMedicalRecordInput } from '../schema';
import { createMedicalRecord } from '../handlers/create_medical_record';
import { eq } from 'drizzle-orm';

describe('createMedicalRecord', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let patientId: number;
  let doctorId: number;

  const setupTestData = async () => {
    // Create a test patient
    const patientResult = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN-001',
        full_name: 'Test Patient',
        date_of_birth: '1990-01-01', // Use string format for date column
        gender: 'male',
        phone: '123-456-7890',
        email: 'patient@test.com'
      })
      .returning()
      .execute();
    
    patientId = patientResult[0].id;

    // Create a test doctor
    const doctorResult = await db.insert(usersTable)
      .values({
        email: 'doctor@test.com',
        password_hash: 'hashedpassword',
        full_name: 'Dr. Test',
        role: 'doctor',
        is_active: true
      })
      .returning()
      .execute();
    
    doctorId = doctorResult[0].id;
  };

  const testInput: CreateMedicalRecordInput = {
    patient_id: 0, // Will be set in tests
    doctor_id: 0, // Will be set in tests
    chief_complaint: 'Patient has chest pain',
    present_illness: 'Chest pain started 2 hours ago, sharp and constant',
    physical_examination: 'BP: 120/80, HR: 75, no abnormal findings',
    diagnosis: 'Acute chest pain, rule out cardiac cause',
    treatment_plan: 'ECG, chest X-ray, cardiac enzymes',
    prescription: 'Aspirin 325mg once daily',
    notes: 'Patient advised to return if symptoms worsen'
  };

  it('should create a medical record with all fields', async () => {
    await setupTestData();
    
    const input = { ...testInput, patient_id: patientId, doctor_id: doctorId };
    const result = await createMedicalRecord(input);

    expect(result.patient_id).toEqual(patientId);
    expect(result.doctor_id).toEqual(doctorId);
    expect(result.chief_complaint).toEqual('Patient has chest pain');
    expect(result.present_illness).toEqual('Chest pain started 2 hours ago, sharp and constant');
    expect(result.physical_examination).toEqual('BP: 120/80, HR: 75, no abnormal findings');
    expect(result.diagnosis).toEqual('Acute chest pain, rule out cardiac cause');
    expect(result.treatment_plan).toEqual('ECG, chest X-ray, cardiac enzymes');
    expect(result.prescription).toEqual('Aspirin 325mg once daily');
    expect(result.notes).toEqual('Patient advised to return if symptoms worsen');
    expect(result.id).toBeDefined();
    expect(result.visit_date).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a medical record with required fields only', async () => {
    await setupTestData();
    
    const minimalInput: CreateMedicalRecordInput = {
      patient_id: patientId,
      doctor_id: doctorId,
      chief_complaint: 'Headache',
      present_illness: null,
      physical_examination: null,
      diagnosis: 'Tension headache',
      treatment_plan: null,
      prescription: null,
      notes: null
    };

    const result = await createMedicalRecord(minimalInput);

    expect(result.patient_id).toEqual(patientId);
    expect(result.doctor_id).toEqual(doctorId);
    expect(result.chief_complaint).toEqual('Headache');
    expect(result.diagnosis).toEqual('Tension headache');
    expect(result.present_illness).toBeNull();
    expect(result.physical_examination).toBeNull();
    expect(result.treatment_plan).toBeNull();
    expect(result.prescription).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.id).toBeDefined();
  });

  it('should save medical record to database', async () => {
    await setupTestData();
    
    const input = { ...testInput, patient_id: patientId, doctor_id: doctorId };
    const result = await createMedicalRecord(input);

    const medicalRecords = await db.select()
      .from(medicalRecordsTable)
      .where(eq(medicalRecordsTable.id, result.id))
      .execute();

    expect(medicalRecords).toHaveLength(1);
    expect(medicalRecords[0].patient_id).toEqual(patientId);
    expect(medicalRecords[0].doctor_id).toEqual(doctorId);
    expect(medicalRecords[0].chief_complaint).toEqual('Patient has chest pain');
    expect(medicalRecords[0].diagnosis).toEqual('Acute chest pain, rule out cardiac cause');
    expect(medicalRecords[0].visit_date).toBeInstanceOf(Date);
  });

  it('should fail when patient does not exist', async () => {
    await setupTestData();
    
    const input = { ...testInput, patient_id: 99999, doctor_id: doctorId };
    
    expect(createMedicalRecord(input)).rejects.toThrow(/foreign key constraint/i);
  });

  it('should fail when doctor does not exist', async () => {
    await setupTestData();
    
    const input = { ...testInput, patient_id: patientId, doctor_id: 99999 };
    
    expect(createMedicalRecord(input)).rejects.toThrow(/foreign key constraint/i);
  });
});
