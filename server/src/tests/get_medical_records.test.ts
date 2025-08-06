
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, patientsTable, medicalRecordsTable } from '../db/schema';
import { getMedicalRecords } from '../handlers/get_medical_records';

describe('getMedicalRecords', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no medical records exist', async () => {
    const result = await getMedicalRecords();
    expect(result).toEqual([]);
  });

  it('should fetch all medical records when no patient filter is provided', async () => {
    // Create prerequisite data
    const doctorResult = await db.insert(usersTable)
      .values({
        email: 'doctor@test.com',
        password_hash: 'hashedpassword',
        full_name: 'Dr. Smith',
        role: 'doctor'
      })
      .returning()
      .execute();

    const patientResult = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN001',
        full_name: 'John Doe',
        date_of_birth: '1990-01-01', // String format for date column
        gender: 'male'
      })
      .returning()
      .execute();

    const secondPatientResult = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN002',
        full_name: 'Jane Smith',
        date_of_birth: '1985-05-15', // String format for date column
        gender: 'female'
      })
      .returning()
      .execute();

    // Create medical records
    await db.insert(medicalRecordsTable)
      .values([
        {
          patient_id: patientResult[0].id,
          doctor_id: doctorResult[0].id,
          chief_complaint: 'Headache',
          diagnosis: 'Tension headache'
        },
        {
          patient_id: secondPatientResult[0].id,
          doctor_id: doctorResult[0].id,
          chief_complaint: 'Fever',
          diagnosis: 'Viral infection'
        }
      ])
      .execute();

    const result = await getMedicalRecords();

    expect(result).toHaveLength(2);
    expect(result[0].chief_complaint).toEqual('Headache');
    expect(result[0].diagnosis).toEqual('Tension headache');
    expect(result[0].patient_id).toEqual(patientResult[0].id);
    expect(result[0].doctor_id).toEqual(doctorResult[0].id);
    expect(result[0].id).toBeDefined();
    expect(result[0].visit_date).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    expect(result[1].chief_complaint).toEqual('Fever');
    expect(result[1].diagnosis).toEqual('Viral infection');
    expect(result[1].patient_id).toEqual(secondPatientResult[0].id);
  });

  it('should filter medical records by patient ID when provided', async () => {
    // Create prerequisite data
    const doctorResult = await db.insert(usersTable)
      .values({
        email: 'doctor@test.com',
        password_hash: 'hashedpassword',
        full_name: 'Dr. Smith',
        role: 'doctor'
      })
      .returning()
      .execute();

    const patientResult = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN001',
        full_name: 'John Doe',
        date_of_birth: '1990-01-01', // String format for date column
        gender: 'male'
      })
      .returning()
      .execute();

    const secondPatientResult = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN002',
        full_name: 'Jane Smith',
        date_of_birth: '1985-05-15', // String format for date column
        gender: 'female'
      })
      .returning()
      .execute();

    // Create medical records for both patients
    await db.insert(medicalRecordsTable)
      .values([
        {
          patient_id: patientResult[0].id,
          doctor_id: doctorResult[0].id,
          chief_complaint: 'Headache',
          diagnosis: 'Tension headache'
        },
        {
          patient_id: patientResult[0].id,
          doctor_id: doctorResult[0].id,
          chief_complaint: 'Back pain',
          diagnosis: 'Muscle strain'
        },
        {
          patient_id: secondPatientResult[0].id,
          doctor_id: doctorResult[0].id,
          chief_complaint: 'Fever',
          diagnosis: 'Viral infection'
        }
      ])
      .execute();

    const result = await getMedicalRecords(patientResult[0].id);

    expect(result).toHaveLength(2);
    expect(result[0].patient_id).toEqual(patientResult[0].id);
    expect(result[1].patient_id).toEqual(patientResult[0].id);
    expect(result[0].chief_complaint).toEqual('Headache');
    expect(result[1].chief_complaint).toEqual('Back pain');

    // Verify that records for the second patient are not included
    const hasSecondPatientRecord = result.some(record => 
      record.patient_id === secondPatientResult[0].id
    );
    expect(hasSecondPatientRecord).toBe(false);
  });

  it('should return empty array when filtering by non-existent patient', async () => {
    // Create some data first
    const doctorResult = await db.insert(usersTable)
      .values({
        email: 'doctor@test.com',
        password_hash: 'hashedpassword',
        full_name: 'Dr. Smith',
        role: 'doctor'
      })
      .returning()
      .execute();

    const patientResult = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN001',
        full_name: 'John Doe',
        date_of_birth: '1990-01-01', // String format for date column
        gender: 'male'
      })
      .returning()
      .execute();

    await db.insert(medicalRecordsTable)
      .values({
        patient_id: patientResult[0].id,
        doctor_id: doctorResult[0].id,
        chief_complaint: 'Headache',
        diagnosis: 'Tension headache'
      })
      .execute();

    const result = await getMedicalRecords(99999); // Non-existent patient ID

    expect(result).toEqual([]);
  });

  it('should include all required medical record fields', async () => {
    // Create prerequisite data
    const doctorResult = await db.insert(usersTable)
      .values({
        email: 'doctor@test.com',
        password_hash: 'hashedpassword',
        full_name: 'Dr. Smith',
        role: 'doctor'
      })
      .returning()
      .execute();

    const patientResult = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN001',
        full_name: 'John Doe',
        date_of_birth: '1990-01-01', // String format for date column
        gender: 'male'
      })
      .returning()
      .execute();

    // Create medical record with all fields
    await db.insert(medicalRecordsTable)
      .values({
        patient_id: patientResult[0].id,
        doctor_id: doctorResult[0].id,
        chief_complaint: 'Severe headache',
        present_illness: 'Started 3 days ago',
        physical_examination: 'Normal vital signs',
        diagnosis: 'Migraine',
        treatment_plan: 'Rest and medication',
        prescription: 'Ibuprofen 400mg',
        notes: 'Follow up in 1 week'
      })
      .execute();

    const result = await getMedicalRecords();

    expect(result).toHaveLength(1);
    const record = result[0];
    
    // Verify all fields are present
    expect(record.id).toBeDefined();
    expect(record.patient_id).toEqual(patientResult[0].id);
    expect(record.doctor_id).toEqual(doctorResult[0].id);
    expect(record.visit_date).toBeInstanceOf(Date);
    expect(record.chief_complaint).toEqual('Severe headache');
    expect(record.present_illness).toEqual('Started 3 days ago');
    expect(record.physical_examination).toEqual('Normal vital signs');
    expect(record.diagnosis).toEqual('Migraine');
    expect(record.treatment_plan).toEqual('Rest and medication');
    expect(record.prescription).toEqual('Ibuprofen 400mg');
    expect(record.notes).toEqual('Follow up in 1 week');
    expect(record.created_at).toBeInstanceOf(Date);
    expect(record.updated_at).toBeInstanceOf(Date);
  });
});
