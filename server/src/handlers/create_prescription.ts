
import { db } from '../db';
import { prescriptionsTable, prescriptionItemsTable, medicationsTable, patientsTable, usersTable } from '../db/schema';
import { type CreatePrescriptionInput, type Prescription } from '../schema';
import { eq, inArray } from 'drizzle-orm';

export const createPrescription = async (input: CreatePrescriptionInput): Promise<Prescription> => {
  try {
    // Verify patient exists
    const patient = await db.select()
      .from(patientsTable)
      .where(eq(patientsTable.id, input.patient_id))
      .execute();

    if (patient.length === 0) {
      throw new Error(`Patient with id ${input.patient_id} not found`);
    }

    // Verify prescribing user exists
    const prescriber = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.prescribed_by))
      .execute();

    if (prescriber.length === 0) {
      throw new Error(`User with id ${input.prescribed_by} not found`);
    }

    // Verify all medications exist and get their prices
    const medicationIds = input.items.map(item => item.medication_id);
    const medications = await db.select()
      .from(medicationsTable)
      .where(inArray(medicationsTable.id, medicationIds))
      .execute();

    if (medications.length !== medicationIds.length) {
      const foundIds = medications.map(med => med.id);
      const missingIds = medicationIds.filter(id => !foundIds.includes(id));
      throw new Error(`Medication with id ${missingIds[0]} not found`);
    }

    // Calculate total amount
    let totalAmount = 0;
    const prescriptionItemsData = input.items.map(item => {
      const medication = medications.find(med => med.id === item.medication_id);
      const unitPrice = parseFloat(medication!.price);
      const totalPrice = unitPrice * item.quantity;
      totalAmount += totalPrice;

      return {
        medication_id: item.medication_id,
        quantity: item.quantity,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        instructions: item.instructions,
        unit_price: unitPrice.toString(),
        total_price: totalPrice.toString()
      };
    });

    // Create prescription
    const prescriptionResult = await db.insert(prescriptionsTable)
      .values({
        patient_id: input.patient_id,
        medical_record_id: input.medical_record_id,
        prescribed_by: input.prescribed_by,
        total_amount: totalAmount.toString(),
        notes: input.notes
      })
      .returning()
      .execute();

    const prescription = prescriptionResult[0];

    // Create prescription items
    const prescriptionItemsWithId = prescriptionItemsData.map(item => ({
      ...item,
      prescription_id: prescription.id
    }));

    await db.insert(prescriptionItemsTable)
      .values(prescriptionItemsWithId)
      .execute();

    // Return prescription with proper numeric conversions
    return {
      ...prescription,
      total_amount: parseFloat(prescription.total_amount)
    };
  } catch (error) {
    console.error('Prescription creation failed:', error);
    throw error;
  }
};
