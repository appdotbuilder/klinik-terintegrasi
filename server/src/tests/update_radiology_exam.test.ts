
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { radiologyExamsTable, usersTable, patientsTable } from '../db/schema';
import { updateRadiologyExam } from '../handlers/update_radiology_exam';
import { eq } from 'drizzle-orm';

describe('updateRadiologyExam', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testPatientId: number;
  let testDoctorId: number;
  let testRadiologistId: number;
  let testExamId: number;

  beforeEach(async () => {
    // Create test patient
    const patientResult = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN001',
        full_name: 'Test Patient',
        date_of_birth: '1990-01-01', // Use string for date column
        gender: 'male',
        phone: '1234567890',
        email: 'patient@test.com',
        address: '123 Test St'
      })
      .returning()
      .execute();
    testPatientId = patientResult[0].id;

    // Create test doctor
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
    testDoctorId = doctorResult[0].id;

    // Create test radiologist
    const radiologistResult = await db.insert(usersTable)
      .values({
        email: 'radiologist@test.com',
        password_hash: 'hashedpassword',
        full_name: 'Radiologist Test',
        role: 'radiologist',
        is_active: true
      })
      .returning()
      .execute();
    testRadiologistId = radiologistResult[0].id;

    // Create test radiology exam
    const examResult = await db.insert(radiologyExamsTable)
      .values({
        patient_id: testPatientId,
        exam_type: 'X-Ray',
        body_part: 'Chest',
        ordered_by: testDoctorId,
        status: 'ordered'
      })
      .returning()
      .execute();
    testExamId = examResult[0].id;
  });

  it('should update radiology exam status', async () => {
    const updates = {
      status: 'in_progress'
    };

    const result = await updateRadiologyExam(testExamId, updates);

    expect(result.id).toEqual(testExamId);
    expect(result.status).toEqual('in_progress');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update radiology exam with findings', async () => {
    const updates = {
      status: 'completed',
      radiologist_id: testRadiologistId,
      findings: 'Clear chest X-ray with no abnormalities',
      impression: 'Normal chest radiograph',
      recommendations: 'No follow-up needed'
    };

    const result = await updateRadiologyExam(testExamId, updates);

    expect(result.status).toEqual('completed');
    expect(result.radiologist_id).toEqual(testRadiologistId);
    expect(result.findings).toEqual('Clear chest X-ray with no abnormalities');
    expect(result.impression).toEqual('Normal chest radiograph');
    expect(result.recommendations).toEqual('No follow-up needed');
    expect(result.completed_at).toBeInstanceOf(Date);
  });

  it('should set completed_at when status is completed', async () => {
    const updates = {
      status: 'completed'
    };

    const result = await updateRadiologyExam(testExamId, updates);

    expect(result.status).toEqual('completed');
    expect(result.completed_at).toBeInstanceOf(Date);
  });

  it('should save updates to database', async () => {
    const updates = {
      status: 'completed',
      findings: 'Test findings'
    };

    await updateRadiologyExam(testExamId, updates);

    const exams = await db.select()
      .from(radiologyExamsTable)
      .where(eq(radiologyExamsTable.id, testExamId))
      .execute();

    expect(exams).toHaveLength(1);
    expect(exams[0].status).toEqual('completed');
    expect(exams[0].findings).toEqual('Test findings');
    expect(exams[0].completed_at).toBeInstanceOf(Date);
    expect(exams[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent exam', async () => {
    const updates = {
      status: 'completed'
    };

    expect(updateRadiologyExam(99999, updates)).rejects.toThrow(/not found/i);
  });

  it('should update only provided fields', async () => {
    const updates = {
      findings: 'Partial findings only'
    };

    const result = await updateRadiologyExam(testExamId, updates);

    expect(result.findings).toEqual('Partial findings only');
    expect(result.status).toEqual('ordered'); // Should remain unchanged
    expect(result.impression).toBeNull(); // Should remain unchanged
  });
});
