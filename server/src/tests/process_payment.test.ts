
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { invoicesTable, patientsTable, usersTable } from '../db/schema';
import { processPayment } from '../handlers/process_payment';
import { eq } from 'drizzle-orm';

describe('processPayment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should process payment for a pending invoice', async () => {
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

    // Create test cashier
    const cashierResult = await db.insert(usersTable)
      .values({
        email: 'cashier@test.com',
        password_hash: 'hashed_password',
        full_name: 'Jane Cashier',
        role: 'cashier'
      })
      .returning()
      .execute();

    // Create test invoice
    const invoiceResult = await db.insert(invoicesTable)
      .values({
        invoice_number: 'INV-001',
        patient_id: patientResult[0].id,
        total_amount: '100.00',
        discount_amount: '0.00',
        tax_amount: '10.00',
        final_amount: '110.00',
        payment_status: 'pending'
      })
      .returning()
      .execute();

    const result = await processPayment(
      invoiceResult[0].id,
      'cash',
      cashierResult[0].id
    );

    // Verify payment processing
    expect(result.id).toEqual(invoiceResult[0].id);
    expect(result.payment_status).toEqual('paid');
    expect(result.payment_method).toEqual('cash');
    expect(result.cashier_id).toEqual(cashierResult[0].id);
    expect(result.payment_date).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Verify numeric fields are converted correctly
    expect(typeof result.total_amount).toBe('number');
    expect(result.total_amount).toEqual(100);
    expect(typeof result.final_amount).toBe('number');
    expect(result.final_amount).toEqual(110);
  });

  it('should update invoice in database', async () => {
    // Create test patient
    const patientResult = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN002',
        full_name: 'Jane Smith',
        date_of_birth: '1985-05-15',
        gender: 'female'
      })
      .returning()
      .execute();

    // Create test cashier
    const cashierResult = await db.insert(usersTable)
      .values({
        email: 'cashier2@test.com',
        password_hash: 'hashed_password',
        full_name: 'Bob Cashier',
        role: 'cashier'
      })
      .returning()
      .execute();

    // Create test invoice
    const invoiceResult = await db.insert(invoicesTable)
      .values({
        invoice_number: 'INV-002',
        patient_id: patientResult[0].id,
        total_amount: '250.50',
        discount_amount: '25.50',
        tax_amount: '22.50',
        final_amount: '247.50',
        payment_status: 'pending'
      })
      .returning()
      .execute();

    await processPayment(invoiceResult[0].id, 'credit_card', cashierResult[0].id);

    // Verify database update
    const invoices = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, invoiceResult[0].id))
      .execute();

    expect(invoices).toHaveLength(1);
    const updatedInvoice = invoices[0];
    expect(updatedInvoice.payment_status).toEqual('paid');
    expect(updatedInvoice.payment_method).toEqual('credit_card');
    expect(updatedInvoice.cashier_id).toEqual(cashierResult[0].id);
    expect(updatedInvoice.payment_date).toBeInstanceOf(Date);
    expect(updatedInvoice.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent invoice', async () => {
    const nonExistentId = 99999;

    await expect(processPayment(nonExistentId, 'cash', 1))
      .rejects.toThrow(/Invoice with id .* not found/i);
  });

  it('should throw error for invalid payment method', async () => {
    // Create test patient and invoice
    const patientResult = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN003',
        full_name: 'Test Patient',
        date_of_birth: '1980-01-01',
        gender: 'male'
      })
      .returning()
      .execute();

    const invoiceResult = await db.insert(invoicesTable)
      .values({
        invoice_number: 'INV-003',
        patient_id: patientResult[0].id,
        total_amount: '50.00',
        discount_amount: '0.00',
        tax_amount: '5.00',
        final_amount: '55.00',
        payment_status: 'pending'
      })
      .returning()
      .execute();

    await expect(processPayment(invoiceResult[0].id, 'bitcoin', 1))
      .rejects.toThrow(/Invalid payment method: bitcoin/i);
  });

  it('should throw error for already paid invoice', async () => {
    // Create test patient
    const patientResult = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN004',
        full_name: 'Already Paid Patient',
        date_of_birth: '1975-12-31',
        gender: 'female'
      })
      .returning()
      .execute();

    // Create cashier
    const cashierResult = await db.insert(usersTable)
      .values({
        email: 'cashier3@test.com',
        password_hash: 'hashed_password',
        full_name: 'Carol Cashier',
        role: 'cashier'
      })
      .returning()
      .execute();

    // Create already paid invoice
    const invoiceResult = await db.insert(invoicesTable)
      .values({
        invoice_number: 'INV-004',
        patient_id: patientResult[0].id,
        cashier_id: cashierResult[0].id,
        total_amount: '75.25',
        discount_amount: '0.00',
        tax_amount: '7.53',
        final_amount: '82.78',
        payment_status: 'paid',
        payment_method: 'cash',
        payment_date: new Date()
      })
      .returning()
      .execute();

    await expect(processPayment(invoiceResult[0].id, 'debit_card', cashierResult[0].id))
      .rejects.toThrow(/Invoice .* is already paid/i);
  });
});
