
import { db } from '../db';
import { medicationsTable } from '../db/schema';
import { type Medication } from '../schema';
import { eq } from 'drizzle-orm';

export const updateMedicationStock = async (id: number, quantity: number, operation: 'add' | 'subtract'): Promise<Medication> => {
  try {
    // First, get the current medication to ensure it exists and get current stock
    const existingMedications = await db.select()
      .from(medicationsTable)
      .where(eq(medicationsTable.id, id))
      .execute();

    if (existingMedications.length === 0) {
      throw new Error(`Medication with id ${id} not found`);
    }

    const currentMedication = existingMedications[0];
    const currentStock = currentMedication.stock_quantity;

    // Calculate new stock quantity based on operation
    let newStockQuantity: number;
    if (operation === 'add') {
      newStockQuantity = currentStock + quantity;
    } else if (operation === 'subtract') {
      newStockQuantity = currentStock - quantity;
      
      // Prevent negative stock
      if (newStockQuantity < 0) {
        throw new Error(`Insufficient stock. Current: ${currentStock}, Requested: ${quantity}`);
      }
    } else {
      throw new Error('Invalid operation. Must be "add" or "subtract"');
    }

    // Update the medication stock
    const result = await db.update(medicationsTable)
      .set({
        stock_quantity: newStockQuantity,
        updated_at: new Date()
      })
      .where(eq(medicationsTable.id, id))
      .returning()
      .execute();

    const updatedMedication = result[0];

    // Convert fields back to proper types for the schema
    return {
      ...updatedMedication,
      price: parseFloat(updatedMedication.price),
      expiry_date: updatedMedication.expiry_date ? new Date(updatedMedication.expiry_date) : null
    };
  } catch (error) {
    console.error('Medication stock update failed:', error);
    throw error;
  }
};
