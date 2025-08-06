
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { patientsTable, usersTable, medicationsTable, prescriptionsTable, prescriptionItemsTable } from '../db/schema';
import { type CreatePrescriptionInput } from '../schema';
import { createPrescription } from '../handlers/create_prescription';
import { eq } from 'drizzle-orm';

describe('createPrescription', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testPatientId: number;
  let testDoctorId: number;
  let testMedicationId1: number;
  let testMedicationId2: number;

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
        address: '123 Test St',
        emergency_contact: 'Emergency Contact',
        emergency_phone: '987-654-3210',
        blood_type: 'O+',
        allergies: 'None'
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
        role: 'doctor',
        is_active: true
      })
      .returning()
      .execute();
    testDoctorId = doctorResult[0].id;

    // Create test medications
    const medication1Result = await db.insert(medicationsTable)
      .values({
        name: 'Amoxicillin',
        generic_name: 'Amoxicillin',
        strength: '500mg',
        dosage_form: 'Tablet',
        manufacturer: 'Test Pharma',
        barcode: '123456789',
        price: '10.50',
        stock_quantity: 100,
        min_stock_level: 10,
        expiry_date: '2025-12-31',
        description: 'Antibiotic medication'
      })
      .returning()
      .execute();
    testMedicationId1 = medication1Result[0].id;

    const medication2Result = await db.insert(medicationsTable)
      .values({
        name: 'Ibuprofen',
        generic_name: 'Ibuprofen',
        strength: '200mg',
        dosage_form: 'Tablet',
        manufacturer: 'Generic Pharma',
        barcode: '987654321',
        price: '5.25',
        stock_quantity: 200,
        min_stock_level: 20,
        expiry_date: '2025-06-30',
        description: 'Pain relief medication'
      })
      .returning()
      .execute();
    testMedicationId2 = medication2Result[0].id;
  });

  const testInput: CreatePrescriptionInput = {
    patient_id: 0, // Will be set dynamically
    medical_record_id: null,
    prescribed_by: 0, // Will be set dynamically
    items: [
      {
        medication_id: 0, // Will be set dynamically
        quantity: 30,
        dosage: '500mg',
        frequency: 'Three times daily',
        duration: '10 days',
        instructions: 'Take with food'
      },
      {
        medication_id: 0, // Will be set dynamically
        quantity: 20,
        dosage: '200mg',
        frequency: 'Twice daily as needed',
        duration: '7 days',
        instructions: 'Take for pain relief'
      }
    ],
    notes: 'Patient has mild infection and pain'
  };

  it('should create a prescription with multiple items', async () => {
    const input = {
      ...testInput,
      patient_id: testPatientId,
      prescribed_by: testDoctorId,
      items: [
        {
          ...testInput.items[0],
          medication_id: testMedicationId1
        },
        {
          ...testInput.items[1],
          medication_id: testMedicationId2
        }
      ]
    };

    const result = await createPrescription(input);

    // Verify prescription fields
    expect(result.patient_id).toEqual(testPatientId);
    expect(result.medical_record_id).toBeNull();
    expect(result.prescribed_by).toEqual(testDoctorId);
    expect(result.dispensed_by).toBeNull();
    expect(result.status).toEqual('pending');
    expect(result.prescription_date).toBeInstanceOf(Date);
    expect(result.dispensed_date).toBeNull();
    expect(result.total_amount).toEqual(420); // (10.50 * 30) + (5.25 * 20) = 315 + 105 = 420
    expect(result.notes).toEqual('Patient has mild infection and pain');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(typeof result.total_amount).toBe('number');
  });

  it('should save prescription to database', async () => {
    const input = {
      ...testInput,
      patient_id: testPatientId,
      prescribed_by: testDoctorId,
      items: [
        {
          ...testInput.items[0],
          medication_id: testMedicationId1
        }
      ]
    };

    const result = await createPrescription(input);

    // Verify prescription in database
    const prescriptions = await db.select()
      .from(prescriptionsTable)
      .where(eq(prescriptionsTable.id, result.id))
      .execute();

    expect(prescriptions).toHaveLength(1);
    expect(prescriptions[0].patient_id).toEqual(testPatientId);
    expect(prescriptions[0].prescribed_by).toEqual(testDoctorId);
    expect(parseFloat(prescriptions[0].total_amount)).toEqual(315); // 10.50 * 30
    expect(prescriptions[0].status).toEqual('pending');
  });

  it('should create prescription items in database', async () => {
    const input = {
      ...testInput,
      patient_id: testPatientId,
      prescribed_by: testDoctorId,
      items: [
        {
          ...testInput.items[0],
          medication_id: testMedicationId1
        },
        {
          ...testInput.items[1],
          medication_id: testMedicationId2
        }
      ]
    };

    const result = await createPrescription(input);

    // Verify prescription items in database
    const prescriptionItems = await db.select()
      .from(prescriptionItemsTable)
      .where(eq(prescriptionItemsTable.prescription_id, result.id))
      .execute();

    expect(prescriptionItems).toHaveLength(2);
    
    // Check first item
    const item1 = prescriptionItems.find(item => item.medication_id === testMedicationId1);
    expect(item1).toBeDefined();
    expect(item1!.quantity).toEqual(30);
    expect(item1!.dosage).toEqual('500mg');
    expect(item1!.frequency).toEqual('Three times daily');
    expect(item1!.duration).toEqual('10 days');
    expect(item1!.instructions).toEqual('Take with food');
    expect(parseFloat(item1!.unit_price)).toEqual(10.50);
    expect(parseFloat(item1!.total_price)).toEqual(315);

    // Check second item
    const item2 = prescriptionItems.find(item => item.medication_id === testMedicationId2);
    expect(item2).toBeDefined();
    expect(item2!.quantity).toEqual(20);
    expect(item2!.dosage).toEqual('200mg');
    expect(parseFloat(item2!.unit_price)).toEqual(5.25);
    expect(parseFloat(item2!.total_price)).toEqual(105);
  });

  it('should throw error when patient does not exist', async () => {
    const input = {
      ...testInput,
      patient_id: 99999,
      prescribed_by: testDoctorId,
      items: [
        {
          ...testInput.items[0],
          medication_id: testMedicationId1
        }
      ]
    };

    await expect(createPrescription(input)).rejects.toThrow(/patient with id 99999 not found/i);
  });

  it('should throw error when prescriber does not exist', async () => {
    const input = {
      ...testInput,
      patient_id: testPatientId,
      prescribed_by: 99999,
      items: [
        {
          ...testInput.items[0],
          medication_id: testMedicationId1
        }
      ]
    };

    await expect(createPrescription(input)).rejects.toThrow(/user with id 99999 not found/i);
  });

  it('should throw error when medication does not exist', async () => {
    const input = {
      ...testInput,
      patient_id: testPatientId,
      prescribed_by: testDoctorId,
      items: [
        {
          ...testInput.items[0],
          medication_id: 99999
        }
      ]
    };

    await expect(createPrescription(input)).rejects.toThrow(/medication with id 99999 not found/i);
  });

  it('should calculate total amount correctly for single item', async () => {
    const input = {
      ...testInput,
      patient_id: testPatientId,
      prescribed_by: testDoctorId,
      items: [
        {
          ...testInput.items[0],
          medication_id: testMedicationId1,
          quantity: 10
        }
      ]
    };

    const result = await createPrescription(input);

    expect(result.total_amount).toEqual(105); // 10.50 * 10
  });
});
