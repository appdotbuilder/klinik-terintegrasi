
import { db } from '../db';
import { servicesTable } from '../db/schema';
import { type Service } from '../schema';
import { eq, and, SQL } from 'drizzle-orm';

export const getServices = async (category?: string, active?: boolean): Promise<Service[]> => {
  try {
    // Collect conditions for filtering
    const conditions: SQL<unknown>[] = [];

    if (category) {
      conditions.push(eq(servicesTable.category, category));
    }

    if (active !== undefined) {
      conditions.push(eq(servicesTable.is_active, active));
    }

    // Build query with conditions
    const results = conditions.length > 0
      ? await db.select()
          .from(servicesTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .execute()
      : await db.select()
          .from(servicesTable)
          .execute();

    // Convert numeric fields from string to number
    return results.map(service => ({
      ...service,
      price: parseFloat(service.price)
    }));
  } catch (error) {
    console.error('Get services failed:', error);
    throw error;
  }
};
