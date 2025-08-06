
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { labTestsTable, patientsTable, usersTable } from '../db/schema';
import { updateLabTest } from '../handlers/update_lab_test';
import { eq } from 'drizzle-orm';

describe('updateLabTest', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testPatientId: number;
  let testDoctorId: number;
  let testTechnicianId: number;
  let testLabTestId: number;

  beforeEach(async () => {
    // Create test patient
    const patientResult = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN001',
        full_name: 'Test Patient',
        date_of_birth: '1990-01-01',
        gender: 'male',
        phone: '123-456-7890',
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
        password_hash: 'hashed_password',
        full_name: 'Dr. Test',
        role: 'doctor'
      })
      .returning()
      .execute();
    testDoctorId = doctorResult[0].id;

    // Create test technician
    const technicianResult = await db.insert(usersTable)
      .values({
        email: 'tech@test.com',
        password_hash: 'hashed_password',
        full_name: 'Lab Tech',
        role: 'lab_technician'
      })
      .returning()
      .execute();
    testTechnicianId = technicianResult[0].id;

    // Create test lab test
    const labTestResult = await db.insert(labTestsTable)
      .values({
        patient_id: testPatientId,
        test_name: 'Blood Test',
        test_type: 'Hematology',
        ordered_by: testDoctorId,
        reference_values: 'Normal: 4.5-5.5'
      })
      .returning()
      .execute();
    testLabTestId = labTestResult[0].id;
  });

  it('should update lab test status', async () => {
    const result = await updateLabTest(testLabTestId, {
      status: 'in_progress'
    });

    expect(result.id).toEqual(testLabTestId);
    expect(result.status).toEqual('in_progress');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.completed_at).toBeNull();
  });

  it('should update technician and results', async () => {
    const result = await updateLabTest(testLabTestId, {
      technician_id: testTechnicianId,
      results: 'WBC: 5.2, RBC: 4.8'
    });

    expect(result.technician_id).toEqual(testTechnicianId);
    expect(result.results).toEqual('WBC: 5.2, RBC: 4.8');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should set completed_at when status is completed', async () => {
    const result = await updateLabTest(testLabTestId, {
      status: 'completed',
      technician_id: testTechnicianId,
      results: 'All values normal'
    });

    expect(result.status).toEqual('completed');
    expect(result.technician_id).toEqual(testTechnicianId);
    expect(result.results).toEqual('All values normal');
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should persist changes to database', async () => {
    await updateLabTest(testLabTestId, {
      status: 'completed',
      technician_id: testTechnicianId,
      results: 'Test completed successfully'
    });

    const savedTest = await db.select()
      .from(labTestsTable)
      .where(eq(labTestsTable.id, testLabTestId))
      .execute();

    expect(savedTest).toHaveLength(1);
    expect(savedTest[0].status).toEqual('completed');
    expect(savedTest[0].technician_id).toEqual(testTechnicianId);
    expect(savedTest[0].results).toEqual('Test completed successfully');
    expect(savedTest[0].completed_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent lab test', async () => {
    await expect(updateLabTest(99999, { status: 'completed' }))
      .rejects.toThrow(/Lab test with id 99999 not found/);
  });

  it('should update only provided fields', async () => {
    const result = await updateLabTest(testLabTestId, {
      results: 'Partial results'
    });

    expect(result.results).toEqual('Partial results');
    expect(result.status).toEqual('ordered'); // Should remain unchanged
    expect(result.technician_id).toBeNull(); // Should remain unchanged
    expect(result.completed_at).toBeNull(); // Should remain null since status not completed
  });

  it('should not set completed_at when status is not completed', async () => {
    const result = await updateLabTest(testLabTestId, {
      status: 'cancelled'
    });

    expect(result.status).toEqual('cancelled');
    expect(result.completed_at).toBeNull();
  });
});
