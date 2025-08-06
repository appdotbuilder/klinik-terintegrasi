
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  patientsTable, 
  queueTable, 
  labTestsTable, 
  radiologyExamsTable, 
  medicationsTable, 
  invoicesTable,
  usersTable 
} from '../db/schema';
import { getDashboardStats } from '../handlers/get_dashboard_stats';

describe('getDashboardStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero stats when no data exists', async () => {
    const stats = await getDashboardStats();

    expect(stats.totalPatients).toBe(0);
    expect(stats.todayQueue).toBe(0);
    expect(stats.pendingLabTests).toBe(0);
    expect(stats.pendingRadiology).toBe(0);
    expect(stats.lowStockMedications).toBe(0);
    expect(stats.unpaidInvoices).toBe(0);
    expect(stats.todayRevenue).toBe(0);
  });

  it('should count total patients correctly', async () => {
    // Create test patients
    await db.insert(patientsTable).values([
      {
        medical_record_number: 'MRN001',
        full_name: 'Patient One',
        date_of_birth: '1990-01-01',
        gender: 'male',
        phone: '1234567890',
        email: 'patient1@test.com',
        address: '123 Main St',
        emergency_contact: 'Emergency Contact',
        emergency_phone: '0987654321',
        blood_type: 'O+',
        allergies: 'None'
      },
      {
        medical_record_number: 'MRN002',
        full_name: 'Patient Two',
        date_of_birth: '1985-05-15',
        gender: 'female',
        phone: '1234567891',
        email: 'patient2@test.com',
        address: '456 Oak Ave',
        emergency_contact: 'Emergency Contact 2',
        emergency_phone: '0987654322',
        blood_type: 'A+',
        allergies: 'Penicillin'
      }
    ]).execute();

    const stats = await getDashboardStats();
    expect(stats.totalPatients).toBe(2);
  });

  it('should count today queue entries correctly', async () => {
    // Create test patient
    const patientResult = await db.insert(patientsTable).values({
      medical_record_number: 'MRN001',
      full_name: 'Patient One',
      date_of_birth: '1990-01-01',
      gender: 'male',
      phone: '1234567890',
      email: 'patient1@test.com',
      address: '123 Main St',
      emergency_contact: 'Emergency Contact',
      emergency_phone: '0987654321',
      blood_type: 'O+',
      allergies: 'None'
    }).returning().execute();

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Create queue entries - one for today, one for yesterday
    await db.insert(queueTable).values([
      {
        patient_id: patientResult[0].id,
        queue_number: 1,
        queue_date: today.toISOString().split('T')[0], // Today's date
        status: 'waiting',
        priority: 0,
        notes: 'Today queue'
      },
      {
        patient_id: patientResult[0].id,
        queue_number: 2,
        queue_date: yesterday.toISOString().split('T')[0], // Yesterday's date
        status: 'waiting',
        priority: 0,
        notes: 'Yesterday queue'
      }
    ]).execute();

    const stats = await getDashboardStats();
    expect(stats.todayQueue).toBe(1);
  });

  it('should count pending lab tests and radiology exams correctly', async () => {
    // Create test patient and doctor
    const patientResult = await db.insert(patientsTable).values({
      medical_record_number: 'MRN001',
      full_name: 'Patient One',
      date_of_birth: '1990-01-01',
      gender: 'male',
      phone: '1234567890',
      email: 'patient1@test.com',
      address: '123 Main St',
      emergency_contact: 'Emergency Contact',
      emergency_phone: '0987654321',
      blood_type: 'O+',
      allergies: 'None'
    }).returning().execute();

    const doctorResult = await db.insert(usersTable).values({
      email: 'doctor@test.com',
      password_hash: 'hashedpassword',
      full_name: 'Dr. Test',
      role: 'doctor',
      is_active: true
    }).returning().execute();

    // Create lab tests with different statuses
    await db.insert(labTestsTable).values([
      {
        patient_id: patientResult[0].id,
        test_name: 'Blood Test',
        test_type: 'Hematology',
        status: 'ordered',
        ordered_by: doctorResult[0].id,
        technician_id: null,
        results: null,
        reference_values: 'Normal ranges',
        notes: null
      },
      {
        patient_id: patientResult[0].id,
        test_name: 'Urine Test',
        test_type: 'Urinalysis',
        status: 'completed',
        ordered_by: doctorResult[0].id,
        technician_id: null,
        results: 'Normal',
        reference_values: 'Normal ranges',
        notes: null
      }
    ]).execute();

    // Create radiology exams with different statuses
    await db.insert(radiologyExamsTable).values([
      {
        patient_id: patientResult[0].id,
        exam_type: 'X-Ray',
        body_part: 'Chest',
        status: 'ordered',
        ordered_by: doctorResult[0].id,
        radiologist_id: null,
        findings: null,
        impression: null,
        recommendations: null
      },
      {
        patient_id: patientResult[0].id,
        exam_type: 'CT Scan',
        body_part: 'Head',
        status: 'in_progress',
        ordered_by: doctorResult[0].id,
        radiologist_id: null,
        findings: null,
        impression: null,
        recommendations: null
      }
    ]).execute();

    const stats = await getDashboardStats();
    expect(stats.pendingLabTests).toBe(1);
    expect(stats.pendingRadiology).toBe(1);
  });

  it('should count low stock medications correctly', async () => {
    // Create medications with different stock levels
    await db.insert(medicationsTable).values([
      {
        name: 'Low Stock Medicine',
        generic_name: 'Generic Low',
        strength: '10mg',
        dosage_form: 'Tablet',
        manufacturer: 'Test Pharma',
        barcode: 'BAR001',
        price: '10.50',
        stock_quantity: 5,
        min_stock_level: 10,
        expiry_date: '2025-12-31',
        description: 'Low stock medication'
      },
      {
        name: 'Normal Stock Medicine',
        generic_name: 'Generic Normal',
        strength: '20mg',
        dosage_form: 'Capsule',
        manufacturer: 'Test Pharma',
        barcode: 'BAR002',
        price: '15.75',
        stock_quantity: 50,
        min_stock_level: 10,
        expiry_date: '2025-12-31',
        description: 'Normal stock medication'
      }
    ]).execute();

    const stats = await getDashboardStats();
    expect(stats.lowStockMedications).toBe(1);
  });

  it('should count unpaid invoices and calculate today revenue correctly', async () => {
    // Create test patient and cashier
    const patientResult = await db.insert(patientsTable).values({
      medical_record_number: 'MRN001',
      full_name: 'Patient One',
      date_of_birth: '1990-01-01',
      gender: 'male',
      phone: '1234567890',
      email: 'patient1@test.com',
      address: '123 Main St',
      emergency_contact: 'Emergency Contact',
      emergency_phone: '0987654321',
      blood_type: 'O+',
      allergies: 'None'
    }).returning().execute();

    const cashierResult = await db.insert(usersTable).values({
      email: 'cashier@test.com',
      password_hash: 'hashedpassword',
      full_name: 'Cashier Test',
      role: 'cashier',
      is_active: true
    }).returning().execute();

    const today = new Date();

    // Create invoices with different statuses
    await db.insert(invoicesTable).values([
      {
        invoice_number: 'INV001',
        patient_id: patientResult[0].id,
        cashier_id: cashierResult[0].id,
        total_amount: '100.00',
        discount_amount: '0.00',
        tax_amount: '10.00',
        final_amount: '110.00',
        payment_status: 'pending',
        payment_method: null,
        payment_date: null,
        notes: 'Unpaid invoice'
      },
      {
        invoice_number: 'INV002',
        patient_id: patientResult[0].id,
        cashier_id: cashierResult[0].id,
        total_amount: '200.00',
        discount_amount: '20.00',
        tax_amount: '18.00',
        final_amount: '198.00',
        payment_status: 'paid',
        payment_method: 'cash',
        payment_date: today,
        notes: 'Paid today'
      },
      {
        invoice_number: 'INV003',
        patient_id: patientResult[0].id,
        cashier_id: cashierResult[0].id,
        total_amount: '150.00',
        discount_amount: '0.00',
        tax_amount: '15.00',
        final_amount: '165.00',
        payment_status: 'paid',
        payment_method: 'credit_card',
        payment_date: new Date(today.getTime() - 24 * 60 * 60 * 1000), // Yesterday
        notes: 'Paid yesterday'
      }
    ]).execute();

    const stats = await getDashboardStats();
    expect(stats.unpaidInvoices).toBe(1);
    expect(typeof stats.todayRevenue).toBe('number');
    expect(stats.todayRevenue).toBe(198.00);
  });
});
