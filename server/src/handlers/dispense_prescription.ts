
import { db } from '../db';
import { prescriptionsTable, prescriptionItemsTable, medicationsTable } from '../db/schema';
import { type Prescription } from '../schema';
import { eq, SQL } from 'drizzle-orm';

export const dispensePrescription = async (id: number, dispensedBy: number): Promise<Prescription> => {
  try {
    // Start transaction for atomic operations
    const result = await db.transaction(async (tx) => {
      // Check if prescription exists and is pending
      const prescriptions = await tx.select()
        .from(prescriptionsTable)
        .where(eq(prescriptionsTable.id, id))
        .execute();

      if (prescriptions.length === 0) {
        throw new Error('Prescription not found');
      }

      const prescription = prescriptions[0];
      if (prescription.status !== 'pending') {
        throw new Error(`Cannot dispense prescription with status: ${prescription.status}`);
      }

      // Get prescription items with medication details
      const prescriptionItems = await tx.select({
        medication_id: prescriptionItemsTable.medication_id,
        quantity: prescriptionItemsTable.quantity,
        stock_quantity: medicationsTable.stock_quantity
      })
        .from(prescriptionItemsTable)
        .innerJoin(medicationsTable, eq(prescriptionItemsTable.medication_id, medicationsTable.id))
        .where(eq(prescriptionItemsTable.prescription_id, id))
        .execute();

      // Check stock availability for all items
      for (const item of prescriptionItems) {
        if (item.stock_quantity < item.quantity) {
          throw new Error(`Insufficient stock for medication ID ${item.medication_id}. Required: ${item.quantity}, Available: ${item.stock_quantity}`);
        }
      }

      // Update medication stock quantities
      for (const item of prescriptionItems) {
        await tx.update(medicationsTable)
          .set({
            stock_quantity: item.stock_quantity - item.quantity,
            updated_at: new Date()
          })
          .where(eq(medicationsTable.id, item.medication_id))
          .execute();
      }

      // Update prescription status
      const updatedPrescriptions = await tx.update(prescriptionsTable)
        .set({
          status: 'dispensed',
          dispensed_by: dispensedBy,
          dispensed_date: new Date(),
          updated_at: new Date()
        })
        .where(eq(prescriptionsTable.id, id))
        .returning()
        .execute();

      return updatedPrescriptions[0];
    });

    // Convert numeric fields back to numbers
    return {
      ...result,
      total_amount: parseFloat(result.total_amount)
    };
  } catch (error) {
    console.error('Prescription dispensing failed:', error);
    throw error;
  }
};
