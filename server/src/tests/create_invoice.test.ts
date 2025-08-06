
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { invoicesTable, invoiceItemsTable, patientsTable } from '../db/schema';
import { type CreateInvoiceInput } from '../schema';
import { createInvoice } from '../handlers/create_invoice';
import { eq } from 'drizzle-orm';

// Test patient data
const testPatient = {
  medical_record_number: 'MRN001',
  full_name: 'John Doe',
  date_of_birth: '1990-01-01',
  gender: 'male' as const,
  phone: '123-456-7890',
  email: 'john@example.com',
  address: '123 Main St',
  emergency_contact: 'Jane Doe',
  emergency_phone: '098-765-4321',
  blood_type: 'O+',
  allergies: 'None'
};

// Test invoice input
const testInput: CreateInvoiceInput = {
  patient_id: 1, // Will be set after patient creation
  items: [
    {
      item_type: 'service',
      item_id: 1,
      description: 'Medical Consultation',
      quantity: 1,
      unit_price: 100.00
    },
    {
      item_type: 'medication',
      item_id: 2,
      description: 'Paracetamol 500mg',
      quantity: 2,
      unit_price: 15.50
    }
  ],
  discount_amount: 10.00,
  tax_amount: 13.10,
  notes: 'Test invoice'
};

describe('createInvoice', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an invoice with items', async () => {
    // Create test patient first
    const patientResult = await db.insert(patientsTable)
      .values(testPatient)
      .returning()
      .execute();

    const patient = patientResult[0];
    testInput.patient_id = patient.id;

    const result = await createInvoice(testInput);

    // Verify invoice fields
    expect(result.patient_id).toEqual(patient.id);
    expect(result.invoice_number).toMatch(/^INV\d{6}$/);
    expect(result.total_amount).toEqual(131.00); // 100 + (2 * 15.50)
    expect(result.discount_amount).toEqual(10.00);
    expect(result.tax_amount).toEqual(13.10);
    expect(result.final_amount).toEqual(134.10); // 131 - 10 + 13.10
    expect(result.payment_status).toEqual('pending');
    expect(result.notes).toEqual('Test invoice');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save invoice and items to database', async () => {
    // Create test patient
    const patientResult = await db.insert(patientsTable)
      .values(testPatient)
      .returning()
      .execute();

    const patient = patientResult[0];
    testInput.patient_id = patient.id;

    const result = await createInvoice(testInput);

    // Verify invoice in database
    const invoices = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, result.id))
      .execute();

    expect(invoices).toHaveLength(1);
    const invoice = invoices[0];
    expect(invoice.patient_id).toEqual(patient.id);
    expect(parseFloat(invoice.total_amount)).toEqual(131.00);
    expect(parseFloat(invoice.final_amount)).toEqual(134.10);

    // Verify invoice items in database
    const items = await db.select()
      .from(invoiceItemsTable)
      .where(eq(invoiceItemsTable.invoice_id, result.id))
      .execute();

    expect(items).toHaveLength(2);
    
    // Check first item
    const firstItem = items.find(item => item.description === 'Medical Consultation');
    expect(firstItem).toBeDefined();
    expect(parseFloat(firstItem!.unit_price)).toEqual(100.00);
    expect(parseFloat(firstItem!.quantity)).toEqual(1);
    expect(parseFloat(firstItem!.total_price)).toEqual(100.00);

    // Check second item
    const secondItem = items.find(item => item.description === 'Paracetamol 500mg');
    expect(secondItem).toBeDefined();
    expect(parseFloat(secondItem!.unit_price)).toEqual(15.50);
    expect(parseFloat(secondItem!.quantity)).toEqual(2);
    expect(parseFloat(secondItem!.total_price)).toEqual(31.00);
  });

  it('should generate sequential invoice numbers', async () => {
    // Create test patient
    const patientResult = await db.insert(patientsTable)
      .values(testPatient)
      .returning()
      .execute();

    const patient = patientResult[0];
    testInput.patient_id = patient.id;

    // Create first invoice
    const firstInvoice = await createInvoice(testInput);
    expect(firstInvoice.invoice_number).toEqual('INV000001');

    // Create second invoice
    const secondInvoice = await createInvoice(testInput);
    expect(secondInvoice.invoice_number).toEqual('INV000002');
  });

  it('should throw error for non-existent patient', async () => {
    testInput.patient_id = 999; // Non-existent patient ID

    await expect(createInvoice(testInput)).rejects.toThrow(/Patient with ID 999 not found/i);
  });

  it('should handle zero discount and tax', async () => {
    // Create test patient
    const patientResult = await db.insert(patientsTable)
      .values(testPatient)
      .returning()
      .execute();

    const patient = patientResult[0];

    const inputWithZeroDiscountAndTax: CreateInvoiceInput = {
      patient_id: patient.id,
      items: [
        {
          item_type: 'service',
          item_id: 1,
          description: 'Basic Service',
          quantity: 1,
          unit_price: 50.00
        }
      ],
      discount_amount: 0,
      tax_amount: 0,
      notes: null
    };

    const result = await createInvoice(inputWithZeroDiscountAndTax);

    expect(result.total_amount).toEqual(50.00);
    expect(result.discount_amount).toEqual(0);
    expect(result.tax_amount).toEqual(0);
    expect(result.final_amount).toEqual(50.00);
  });
});
