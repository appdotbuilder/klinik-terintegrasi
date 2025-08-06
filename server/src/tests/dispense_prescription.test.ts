
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, patientsTable, prescriptionsTable, prescriptionItemsTable, medicationsTable } from '../db/schema';
import { dispensePrescription } from '../handlers/dispense_prescription';
import { eq } from 'drizzle-orm';

describe('dispensePrescription', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let doctorId: number;
  let pharmacistId: number;
  let patientId: number;
  let medicationId: number;
  let prescriptionId: number;

  beforeEach(async () => {
    // Create test users
    const doctors = await db.insert(usersTable)
      .values({
        email: 'doctor@test.com',
        password_hash: 'hashed_password',
        full_name: 'Dr. Test',
        role: 'doctor',
        is_active: true
      })
      .returning()
      .execute();
    doctorId = doctors[0].id;

    const pharmacists = await db.insert(usersTable)
      .values({
        email: 'pharmacist@test.com',
        password_hash: 'hashed_password',
        full_name: 'Pharmacist Test',
        role: 'pharmacist',
        is_active: true
      })
      .returning()
      .execute();
    pharmacistId = pharmacists[0].id;

    // Create test patient - use string for date_of_birth to match date column type
    const patients = await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN001',
        full_name: 'Test Patient',
        date_of_birth: '1990-01-01',
        gender: 'male',
        phone: '1234567890'
      })
      .returning()
      .execute();
    patientId = patients[0].id;

    // Create test medication with stock
    const medications = await db.insert(medicationsTable)
      .values({
        name: 'Test Medicine',
        dosage_form: 'tablet',
        price: '10.50',
        stock_quantity: 100,
        min_stock_level: 10
      })
      .returning()
      .execute();
    medicationId = medications[0].id;

    // Create test prescription
    const prescriptions = await db.insert(prescriptionsTable)
      .values({
        patient_id: patientId,
        prescribed_by: doctorId,
        status: 'pending',
        total_amount: '52.50'
      })
      .returning()
      .execute();
    prescriptionId = prescriptions[0].id;

    // Create prescription item
    await db.insert(prescriptionItemsTable)
      .values({
        prescription_id: prescriptionId,
        medication_id: medicationId,
        quantity: 5,
        dosage: '10mg',
        frequency: 'twice daily',
        duration: '7 days',
        unit_price: '10.50',
        total_price: '52.50'
      })
      .execute();
  });

  it('should dispense prescription successfully', async () => {
    const result = await dispensePrescription(prescriptionId, pharmacistId);

    // Verify prescription update
    expect(result.id).toEqual(prescriptionId);
    expect(result.status).toEqual('dispensed');
    expect(result.dispensed_by).toEqual(pharmacistId);
    expect(result.dispensed_date).toBeInstanceOf(Date);
    expect(typeof result.total_amount).toBe('number');
    expect(result.total_amount).toEqual(52.5);
  });

  it('should update medication stock quantity', async () => {
    await dispensePrescription(prescriptionId, pharmacistId);

    // Check medication stock was reduced
    const medications = await db.select()
      .from(medicationsTable)
      .where(eq(medicationsTable.id, medicationId))
      .execute();

    expect(medications).toHaveLength(1);
    expect(medications[0].stock_quantity).toEqual(95); // 100 - 5
  });

  it('should save dispensed prescription to database', async () => {
    await dispensePrescription(prescriptionId, pharmacistId);

    const prescriptions = await db.select()
      .from(prescriptionsTable)
      .where(eq(prescriptionsTable.id, prescriptionId))
      .execute();

    expect(prescriptions).toHaveLength(1);
    expect(prescriptions[0].status).toEqual('dispensed');
    expect(prescriptions[0].dispensed_by).toEqual(pharmacistId);
    expect(prescriptions[0].dispensed_date).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent prescription', async () => {
    expect(dispensePrescription(99999, pharmacistId))
      .rejects.toThrow(/prescription not found/i);
  });

  it('should throw error for already dispensed prescription', async () => {
    // First dispense the prescription
    await dispensePrescription(prescriptionId, pharmacistId);

    // Try to dispense again
    expect(dispensePrescription(prescriptionId, pharmacistId))
      .rejects.toThrow(/cannot dispense prescription with status/i);
  });

  it('should throw error for insufficient stock', async () => {
    // Update medication stock to insufficient amount
    await db.update(medicationsTable)
      .set({ stock_quantity: 2 }) // Less than required 5
      .where(eq(medicationsTable.id, medicationId))
      .execute();

    expect(dispensePrescription(prescriptionId, pharmacistId))
      .rejects.toThrow(/insufficient stock/i);
  });

  it('should handle cancelled prescription', async () => {
    // Update prescription status to cancelled
    await db.update(prescriptionsTable)
      .set({ status: 'cancelled' })
      .where(eq(prescriptionsTable.id, prescriptionId))
      .execute();

    expect(dispensePrescription(prescriptionId, pharmacistId))
      .rejects.toThrow(/cannot dispense prescription with status: cancelled/i);
  });

  it('should handle multiple prescription items', async () => {
    // Create second medication
    const secondMedications = await db.insert(medicationsTable)
      .values({
        name: 'Second Medicine',
        dosage_form: 'capsule',
        price: '15.00',
        stock_quantity: 50,
        min_stock_level: 5
      })
      .returning()
      .execute();
    
    // Add second prescription item
    await db.insert(prescriptionItemsTable)
      .values({
        prescription_id: prescriptionId,
        medication_id: secondMedications[0].id,
        quantity: 3,
        dosage: '5mg',
        frequency: 'once daily',
        duration: '10 days',
        unit_price: '15.00',
        total_price: '45.00'
      })
      .execute();

    // Update total amount
    await db.update(prescriptionsTable)
      .set({ total_amount: '97.50' }) // 52.50 + 45.00
      .where(eq(prescriptionsTable.id, prescriptionId))
      .execute();

    await dispensePrescription(prescriptionId, pharmacistId);

    // Check both medications stock were updated
    const firstMed = await db.select()
      .from(medicationsTable)
      .where(eq(medicationsTable.id, medicationId))
      .execute();
    
    const secondMed = await db.select()
      .from(medicationsTable)
      .where(eq(medicationsTable.id, secondMedications[0].id))
      .execute();

    expect(firstMed[0].stock_quantity).toEqual(95); // 100 - 5
    expect(secondMed[0].stock_quantity).toEqual(47); // 50 - 3
  });
});
