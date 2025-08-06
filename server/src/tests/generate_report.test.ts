
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { 
  patientsTable, 
  invoicesTable, 
  medicationsTable, 
  queueTable,
  usersTable,
  medicalRecordsTable,
  labTestsTable,
  radiologyExamsTable
} from '../db/schema';
import { type ReportRequest } from '../schema';
import { generateReport } from '../handlers/generate_report';

// Test data setup helpers
const createTestUser = async () => {
  const result = await db.insert(usersTable)
    .values({
      email: 'doctor@test.com',
      password_hash: 'hashed_password',
      full_name: 'Dr. Test',
      role: 'doctor'
    })
    .returning()
    .execute();
  return result[0];
};

const createTestPatient = async () => {
  const result = await db.insert(patientsTable)
    .values({
      medical_record_number: 'MRN001',
      full_name: 'Test Patient',
      date_of_birth: '1990-01-01', // Convert Date to string
      gender: 'male',
      phone: '123456789'
    })
    .returning()
    .execute();
  return result[0];
};

describe('generateReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate patient summary report', async () => {
    // Create test patients
    await createTestPatient();
    
    const femalePatient = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN002',
        full_name: 'Female Patient',
        date_of_birth: '1985-05-15', // Convert Date to string
        gender: 'female',
        email: 'female@test.com'
      })
      .returning()
      .execute();

    const input: ReportRequest = {
      report_type: 'patient_summary',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31'),
      format: 'pdf'
    };

    const result = await generateReport(input);

    expect(result.reportUrl).toContain('/reports/');
    expect(result.fileName).toContain('patient_summary_');
    expect(result.fileName).toContain('.pdf');
  });

  it('should generate financial summary report', async () => {
    // Create test data
    const patient = await createTestPatient();
    const user = await createTestUser();

    await db.insert(invoicesTable)
      .values({
        invoice_number: 'INV001',
        patient_id: patient.id,
        cashier_id: user.id,
        total_amount: '100.00',
        discount_amount: '10.00',
        tax_amount: '5.00',
        final_amount: '95.00',
        payment_status: 'paid'
      })
      .execute();

    await db.insert(invoicesTable)
      .values({
        invoice_number: 'INV002',
        patient_id: patient.id,
        total_amount: '200.00',
        discount_amount: '0.00',
        tax_amount: '10.00',
        final_amount: '210.00',
        payment_status: 'pending'
      })
      .execute();

    const input: ReportRequest = {
      report_type: 'financial_summary',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31'),
      format: 'excel'
    };

    const result = await generateReport(input);

    expect(result.reportUrl).toContain('/reports/');
    expect(result.fileName).toContain('financial_summary_');
    expect(result.fileName).toContain('.excel');
  });

  it('should generate inventory report', async () => {
    // Create test medications
    await db.insert(medicationsTable)
      .values({
        name: 'Test Medicine 1',
        dosage_form: 'tablet',
        price: '25.50',
        stock_quantity: 50,
        min_stock_level: 10
      })
      .execute();

    // Low stock medication
    await db.insert(medicationsTable)
      .values({
        name: 'Low Stock Medicine',
        dosage_form: 'capsule',
        price: '15.75',
        stock_quantity: 5,
        min_stock_level: 10
      })
      .execute();

    const input: ReportRequest = {
      report_type: 'inventory_report',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31'),
      format: 'pdf'
    };

    const result = await generateReport(input);

    expect(result.reportUrl).toContain('/reports/');
    expect(result.fileName).toContain('inventory_report_');
    expect(result.fileName).toContain('.pdf');
  });

  it('should generate appointment report', async () => {
    // Create test data
    const patient = await createTestPatient();

    await db.insert(queueTable)
      .values({
        patient_id: patient.id,
        queue_number: 1,
        queue_date: '2024-06-01', // Convert Date to string
        status: 'completed',
        priority: 0
      })
      .execute();

    await db.insert(queueTable)
      .values({
        patient_id: patient.id,
        queue_number: 2,
        queue_date: '2024-06-01', // Convert Date to string
        status: 'waiting',
        priority: 1
      })
      .execute();

    const input: ReportRequest = {
      report_type: 'appointment_report',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31'),
      format: 'excel'
    };

    const result = await generateReport(input);

    expect(result.reportUrl).toContain('/reports/');
    expect(result.fileName).toContain('appointment_report_');
    expect(result.fileName).toContain('.excel');
  });

  it('should generate medical statistics report', async () => {
    // Create prerequisite data
    const patient = await createTestPatient();
    const doctor = await createTestUser();

    // Create medical record
    const medicalRecord = await db.insert(medicalRecordsTable)
      .values({
        patient_id: patient.id,
        doctor_id: doctor.id,
        chief_complaint: 'Test complaint',
        diagnosis: 'Test diagnosis'
      })
      .returning()
      .execute();

    // Create lab test
    await db.insert(labTestsTable)
      .values({
        patient_id: patient.id,
        medical_record_id: medicalRecord[0].id,
        test_name: 'Blood Test',
        test_type: 'Hematology',
        ordered_by: doctor.id
      })
      .execute();

    // Create radiology exam
    await db.insert(radiologyExamsTable)
      .values({
        patient_id: patient.id,
        medical_record_id: medicalRecord[0].id,
        exam_type: 'X-Ray',
        body_part: 'Chest',
        ordered_by: doctor.id
      })
      .execute();

    const input: ReportRequest = {
      report_type: 'medical_statistics',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31'),
      format: 'pdf'
    };

    const result = await generateReport(input);

    expect(result.reportUrl).toContain('/reports/');
    expect(result.fileName).toContain('medical_statistics_');
    expect(result.fileName).toContain('.pdf');
  });

  it('should handle date range filtering', async () => {
    // Create test data with specific dates
    const oldDate = new Date('2023-06-01');
    const recentDate = new Date('2024-06-01');
    
    // Create patients on different dates by updating created_at manually
    const patient1 = await createTestPatient();
    const patient2 = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN002',
        full_name: 'Recent Patient',
        date_of_birth: '1988-03-10', // Convert Date to string
        gender: 'female'
      })
      .returning()
      .execute();

    // Manually update created_at dates using sql template
    await db.execute(sql`UPDATE patients SET created_at = ${oldDate.toISOString()} WHERE id = ${patient1.id}`);
    await db.execute(sql`UPDATE patients SET created_at = ${recentDate.toISOString()} WHERE id = ${patient2[0].id}`);

    const input: ReportRequest = {
      report_type: 'patient_summary',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31'),
      format: 'pdf'
    };

    const result = await generateReport(input);

    expect(result.reportUrl).toContain('/reports/');
    expect(result.fileName).toContain('patient_summary_');
  });

  it('should throw error for unsupported report type', async () => {
    const input: ReportRequest = {
      report_type: 'patient_summary', // Will be cast to invalid type
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31'),
      format: 'pdf'
    };

    // Manually override the report type to test error handling
    const invalidInput = { ...input, report_type: 'invalid_type' as any };

    await expect(generateReport(invalidInput)).rejects.toThrow(/unsupported report type/i);
  });

  it('should handle empty data sets gracefully', async () => {
    // Generate report with no data in database
    const input: ReportRequest = {
      report_type: 'financial_summary',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31'),
      format: 'excel'
    };

    const result = await generateReport(input);

    expect(result.reportUrl).toContain('/reports/');
    expect(result.fileName).toContain('financial_summary_');
    expect(result.fileName).toContain('.excel');
  });
});
