
import { db } from '../db';
import { medicationsTable } from '../db/schema';
import { type Medication } from '../schema';
import { lte } from 'drizzle-orm';

export const getMedications = async (lowStock?: boolean): Promise<Medication[]> => {
  try {
    let results;

    // Execute different queries based on filter
    if (lowStock === true) {
      results = await db.select()
        .from(medicationsTable)
        .where(lte(medicationsTable.stock_quantity, medicationsTable.min_stock_level))
        .execute();
    } else {
      results = await db.select()
        .from(medicationsTable)
        .execute();
    }

    // Convert fields to match the schema types
    return results.map(medication => ({
      ...medication,
      price: parseFloat(medication.price), // Convert numeric string to number
      expiry_date: medication.expiry_date ? new Date(medication.expiry_date) : null // Convert date string to Date object
    }));
  } catch (error) {
    console.error('Failed to get medications:', error);
    throw error;
  }
};
