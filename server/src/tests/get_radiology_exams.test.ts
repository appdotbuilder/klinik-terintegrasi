
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { patientsTable, usersTable, radiologyExamsTable } from '../db/schema';
import { getRadiologyExams } from '../handlers/get_radiology_exams';

describe('getRadiologyExams', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create test data
  const createTestData = async () => {
    // Create test patient
    const patientResult = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN001',
        full_name: 'John Doe',
        date_of_birth: '1990-01-01', // Use string format for date columns
        gender: 'male',
        phone: '1234567890',
        email: 'john@example.com'
      })
      .returning()
      .execute();
    const patient = patientResult[0];

    // Create test doctor
    const doctorResult = await db.insert(usersTable)
      .values({
        email: 'doctor@test.com',
        password_hash: 'hashedpassword',
        full_name: 'Dr. Smith',
        role: 'doctor'
      })
      .returning()
      .execute();
    const doctor = doctorResult[0];

    // Create test radiologist
    const radiologistResult = await db.insert(usersTable)
      .values({
        email: 'radiologist@test.com',
        password_hash: 'hashedpassword',
        full_name: 'Dr. Johnson',
        role: 'radiologist'
      })
      .returning()
      .execute();
    const radiologist = radiologistResult[0];

    return { patient, doctor, radiologist };
  };

  it('should return all radiology exams when no filters provided', async () => {
    const { patient, doctor, radiologist } = await createTestData();

    // Create test radiology exams
    await db.insert(radiologyExamsTable)
      .values([
        {
          patient_id: patient.id,
          exam_type: 'X-Ray',
          body_part: 'Chest',
          ordered_by: doctor.id,
          radiologist_id: radiologist.id,
          status: 'completed',
          findings: 'Normal chest X-ray',
          impression: 'No abnormalities detected'
        },
        {
          patient_id: patient.id,
          exam_type: 'CT Scan',
          body_part: 'Head',
          ordered_by: doctor.id,
          status: 'ordered'
        }
      ])
      .execute();

    const results = await getRadiologyExams();

    expect(results).toHaveLength(2);
    expect(results[0].exam_type).toEqual('X-Ray');
    expect(results[0].body_part).toEqual('Chest');
    expect(results[0].status).toEqual('completed');
    expect(results[0].findings).toEqual('Normal chest X-ray');
    expect(results[0].impression).toEqual('No abnormalities detected');
    expect(results[1].exam_type).toEqual('CT Scan');
    expect(results[1].body_part).toEqual('Head');
    expect(results[1].status).toEqual('ordered');
  });

  it('should filter radiology exams by patient ID', async () => {
    const { patient, doctor } = await createTestData();

    // Create another patient
    const anotherPatientResult = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN002',
        full_name: 'Jane Doe',
        date_of_birth: '1985-06-15', // Use string format
        gender: 'female'
      })
      .returning()
      .execute();
    const anotherPatient = anotherPatientResult[0];

    // Create radiology exams for both patients
    await db.insert(radiologyExamsTable)
      .values([
        {
          patient_id: patient.id,
          exam_type: 'X-Ray',
          body_part: 'Chest',
          ordered_by: doctor.id,
          status: 'completed'
        },
        {
          patient_id: anotherPatient.id,
          exam_type: 'MRI',
          body_part: 'Brain',
          ordered_by: doctor.id,
          status: 'ordered'
        }
      ])
      .execute();

    const results = await getRadiologyExams(patient.id);

    expect(results).toHaveLength(1);
    expect(results[0].patient_id).toEqual(patient.id);
    expect(results[0].exam_type).toEqual('X-Ray');
    expect(results[0].body_part).toEqual('Chest');
  });

  it('should filter radiology exams by status', async () => {
    const { patient, doctor } = await createTestData();

    // Create radiology exams with different statuses
    await db.insert(radiologyExamsTable)
      .values([
        {
          patient_id: patient.id,
          exam_type: 'X-Ray',
          body_part: 'Chest',
          ordered_by: doctor.id,
          status: 'completed'
        },
        {
          patient_id: patient.id,
          exam_type: 'CT Scan',
          body_part: 'Abdomen',
          ordered_by: doctor.id,
          status: 'ordered'
        },
        {
          patient_id: patient.id,
          exam_type: 'MRI',
          body_part: 'Spine',
          ordered_by: doctor.id,
          status: 'in_progress'
        }
      ])
      .execute();

    const results = await getRadiologyExams(undefined, 'completed');

    expect(results).toHaveLength(1);
    expect(results[0].status).toEqual('completed');
    expect(results[0].exam_type).toEqual('X-Ray');
  });

  it('should filter radiology exams by both patient ID and status', async () => {
    const { patient, doctor } = await createTestData();

    // Create another patient
    const anotherPatientResult = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN003',
        full_name: 'Bob Smith',
        date_of_birth: '1980-12-01', // Use string format
        gender: 'male'
      })
      .returning()
      .execute();
    const anotherPatient = anotherPatientResult[0];

    // Create multiple radiology exams
    await db.insert(radiologyExamsTable)
      .values([
        {
          patient_id: patient.id,
          exam_type: 'X-Ray',
          body_part: 'Chest',
          ordered_by: doctor.id,
          status: 'completed'
        },
        {
          patient_id: patient.id,
          exam_type: 'CT Scan',
          body_part: 'Head',
          ordered_by: doctor.id,
          status: 'ordered'
        },
        {
          patient_id: anotherPatient.id,
          exam_type: 'MRI',
          body_part: 'Brain',
          ordered_by: doctor.id,
          status: 'completed'
        }
      ])
      .execute();

    const results = await getRadiologyExams(patient.id, 'completed');

    expect(results).toHaveLength(1);
    expect(results[0].patient_id).toEqual(patient.id);
    expect(results[0].status).toEqual('completed');
    expect(results[0].exam_type).toEqual('X-Ray');
  });

  it('should return empty array when no exams match filters', async () => {
    const { patient, doctor } = await createTestData();

    // Create exam with different status
    await db.insert(radiologyExamsTable)
      .values({
        patient_id: patient.id,
        exam_type: 'X-Ray',
        body_part: 'Chest',
        ordered_by: doctor.id,
        status: 'ordered'
      })
      .execute();

    const results = await getRadiologyExams(patient.id, 'completed');

    expect(results).toHaveLength(0);
  });

  it('should return all required fields in correct format', async () => {
    const { patient, doctor, radiologist } = await createTestData();

    await db.insert(radiologyExamsTable)
      .values({
        patient_id: patient.id,
        medical_record_id: null,
        exam_type: 'X-Ray',
        body_part: 'Chest',
        ordered_by: doctor.id,
        radiologist_id: radiologist.id,
        status: 'completed',
        findings: 'Normal findings',
        impression: 'No abnormalities',
        recommendations: 'Follow up in 6 months'
      })
      .execute();

    const results = await getRadiologyExams();

    expect(results).toHaveLength(1);
    const exam = results[0];

    // Verify all required fields are present
    expect(exam.id).toBeDefined();
    expect(exam.patient_id).toEqual(patient.id);
    expect(exam.medical_record_id).toBeNull();
    expect(exam.exam_type).toEqual('X-Ray');
    expect(exam.body_part).toEqual('Chest');
    expect(exam.status).toEqual('completed');
    expect(exam.ordered_by).toEqual(doctor.id);
    expect(exam.radiologist_id).toEqual(radiologist.id);
    expect(exam.findings).toEqual('Normal findings');
    expect(exam.impression).toEqual('No abnormalities');
    expect(exam.recommendations).toEqual('Follow up in 6 months');
    expect(exam.ordered_at).toBeInstanceOf(Date);
    expect(exam.completed_at).toBeNull();
    expect(exam.created_at).toBeInstanceOf(Date);
    expect(exam.updated_at).toBeInstanceOf(Date);
  });
});
