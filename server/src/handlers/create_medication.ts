
import { db } from '../db';
import { medicationsTable } from '../db/schema';
import { type CreateMedicationInput, type Medication } from '../schema';

export const createMedication = async (input: CreateMedicationInput): Promise<Medication> => {
  try {
    // Insert medication record
    const result = await db.insert(medicationsTable)
      .values({
        name: input.name,
        generic_name: input.generic_name,
        strength: input.strength,
        dosage_form: input.dosage_form,
        manufacturer: input.manufacturer,
        barcode: input.barcode,
        price: input.price.toString(), // Convert number to string for numeric column
        stock_quantity: input.stock_quantity,
        min_stock_level: input.min_stock_level,
        expiry_date: input.expiry_date?.toISOString().split('T')[0] || null, // Convert Date to YYYY-MM-DD string
        description: input.description
      })
      .returning()
      .execute();

    // Convert numeric and date fields back to proper types before returning
    const medication = result[0];
    return {
      ...medication,
      price: parseFloat(medication.price), // Convert string back to number
      expiry_date: medication.expiry_date ? new Date(medication.expiry_date) : null // Convert string back to Date
    };
  } catch (error) {
    console.error('Medication creation failed:', error);
    throw error;
  }
};
