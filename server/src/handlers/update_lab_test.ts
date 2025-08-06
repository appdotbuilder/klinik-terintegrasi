
import { db } from '../db';
import { labTestsTable } from '../db/schema';
import { type LabTest } from '../schema';
import { eq } from 'drizzle-orm';

export const updateLabTest = async (
  id: number, 
  updates: Partial<{ status: string; technician_id: number; results: string; }>
): Promise<LabTest> => {
  try {
    // Prepare update values
    const updateValues: Record<string, any> = {
      updated_at: new Date()
    };

    if (updates.status !== undefined) {
      updateValues['status'] = updates.status;
      
      // Set completed_at when status is completed
      if (updates.status === 'completed') {
        updateValues['completed_at'] = new Date();
      }
    }

    if (updates.technician_id !== undefined) {
      updateValues['technician_id'] = updates.technician_id;
    }

    if (updates.results !== undefined) {
      updateValues['results'] = updates.results;
    }

    // Update lab test record
    const result = await db.update(labTestsTable)
      .set(updateValues)
      .where(eq(labTestsTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Lab test with id ${id} not found`);
    }

    // Return the updated record (no numeric conversions needed for this table)
    return result[0];
  } catch (error) {
    console.error('Lab test update failed:', error);
    throw error;
  }
};
