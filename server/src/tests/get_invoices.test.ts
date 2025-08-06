
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { invoicesTable, patientsTable, usersTable } from '../db/schema';
import { getInvoices } from '../handlers/get_invoices';

// Test data setup
const testPatient1 = {
  medical_record_number: 'MRN001',
  full_name: 'John Doe',
  date_of_birth: '1990-01-01',
  gender: 'male' as const,
  phone: '+1234567890',
  email: 'john@example.com',
  address: '123 Main St',
  emergency_contact: 'Jane Doe',
  emergency_phone: '+1234567891',
  blood_type: 'A+',
  allergies: null
};

const testPatient2 = {
  medical_record_number: 'MRN002',
  full_name: 'Jane Smith',
  date_of_birth: '1985-05-15',
  gender: 'female' as const,
  phone: '+1234567892',
  email: 'jane@example.com',
  address: '456 Oak St',
  emergency_contact: 'John Smith',
  emergency_phone: '+1234567893',
  blood_type: 'B+',
  allergies: null
};

const testCashier = {
  email: 'cashier@hospital.com',
  password_hash: 'hashed_password',
  full_name: 'Jane Smith',
  role: 'cashier' as const
};

const testInvoice1 = {
  invoice_number: 'INV001',
  patient_id: 1,
  cashier_id: 1,
  total_amount: '150.00',
  discount_amount: '15.00',
  tax_amount: '13.50',
  final_amount: '148.50',
  payment_status: 'pending' as const,
  payment_method: null,
  payment_date: null,
  notes: 'Test invoice 1'
};

const testInvoice2 = {
  invoice_number: 'INV002',
  patient_id: 2,
  cashier_id: 1,
  total_amount: '275.00',
  discount_amount: '0.00',
  tax_amount: '27.50',
  final_amount: '302.50',
  payment_status: 'paid' as const,
  payment_method: 'cash' as const,
  payment_date: new Date(),
  notes: 'Test invoice 2'
};

describe('getInvoices', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all invoices when no filters are provided', async () => {
    // Create test data
    await db.insert(patientsTable).values(testPatient1).execute();
    await db.insert(patientsTable).values(testPatient2).execute();
    await db.insert(usersTable).values(testCashier).execute();
    await db.insert(invoicesTable).values(testInvoice1).execute();
    await db.insert(invoicesTable).values(testInvoice2).execute();

    const result = await getInvoices();

    expect(result).toHaveLength(2);
    
    // Verify first invoice
    const invoice1 = result.find(inv => inv.invoice_number === 'INV001');
    expect(invoice1).toBeDefined();
    expect(invoice1!.patient_id).toBe(1);
    expect(invoice1!.total_amount).toBe(150);
    expect(invoice1!.discount_amount).toBe(15);
    expect(invoice1!.tax_amount).toBe(13.5);
    expect(invoice1!.final_amount).toBe(148.5);
    expect(invoice1!.payment_status).toBe('pending');
    expect(typeof invoice1!.total_amount).toBe('number');
    expect(typeof invoice1!.final_amount).toBe('number');

    // Verify second invoice
    const invoice2 = result.find(inv => inv.invoice_number === 'INV002');
    expect(invoice2).toBeDefined();
    expect(invoice2!.payment_status).toBe('paid');
    expect(invoice2!.payment_method).toBe('cash');
  });

  it('should filter invoices by patient ID', async () => {
    // Create test data
    await db.insert(patientsTable).values(testPatient1).execute();
    await db.insert(patientsTable).values(testPatient2).execute();
    await db.insert(usersTable).values(testCashier).execute();
    await db.insert(invoicesTable).values(testInvoice1).execute();
    await db.insert(invoicesTable).values(testInvoice2).execute();

    const result = await getInvoices(1);

    expect(result).toHaveLength(1);
    expect(result[0].patient_id).toBe(1);
    expect(result[0].invoice_number).toBe('INV001');
    expect(result[0].total_amount).toBe(150);
    expect(typeof result[0].total_amount).toBe('number');
  });

  it('should filter invoices by payment status', async () => {
    // Create test data
    await db.insert(patientsTable).values(testPatient1).execute();
    await db.insert(patientsTable).values(testPatient2).execute();
    await db.insert(usersTable).values(testCashier).execute();
    await db.insert(invoicesTable).values(testInvoice1).execute();
    await db.insert(invoicesTable).values(testInvoice2).execute();

    const result = await getInvoices(undefined, 'paid');

    expect(result).toHaveLength(1);
    expect(result[0].payment_status).toBe('paid');
    expect(result[0].invoice_number).toBe('INV002');
    expect(result[0].final_amount).toBe(302.5);
    expect(typeof result[0].final_amount).toBe('number');
  });

  it('should filter invoices by both patient ID and status', async () => {
    // Create test data
    await db.insert(patientsTable).values(testPatient1).execute();
    await db.insert(patientsTable).values(testPatient2).execute();
    await db.insert(usersTable).values(testCashier).execute();
    
    // Create additional invoice for patient 1 with 'paid' status
    const additionalInvoice = {
      ...testInvoice1,
      invoice_number: 'INV003',
      payment_status: 'paid' as const,
      payment_method: 'credit_card' as const,
      payment_date: new Date()
    };

    await db.insert(invoicesTable).values(testInvoice1).execute();
    await db.insert(invoicesTable).values(testInvoice2).execute();
    await db.insert(invoicesTable).values(additionalInvoice).execute();

    const result = await getInvoices(1, 'paid');

    expect(result).toHaveLength(1);
    expect(result[0].patient_id).toBe(1);
    expect(result[0].payment_status).toBe('paid');
    expect(result[0].invoice_number).toBe('INV003');
  });

  it('should return empty array when no invoices match filters', async () => {
    // Create test data
    await db.insert(patientsTable).values(testPatient1).execute();
    await db.insert(usersTable).values(testCashier).execute();
    await db.insert(invoicesTable).values(testInvoice1).execute();

    const result = await getInvoices(999, 'paid');

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should return empty array when no invoices exist', async () => {
    const result = await getInvoices();

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });
});
