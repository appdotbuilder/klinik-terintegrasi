
import { db } from '../db';
import { radiologyExamsTable } from '../db/schema';
import { type RadiologyExam } from '../schema';
import { eq } from 'drizzle-orm';

export const updateRadiologyExam = async (
  id: number, 
  updates: Partial<{ 
    status: string; 
    radiologist_id: number; 
    findings: string; 
    impression: string; 
    recommendations: string; 
  }>
): Promise<RadiologyExam> => {
  try {
    // Prepare update data
    const updateData: any = {
      ...updates,
      updated_at: new Date()
    };

    // Set completed_at timestamp if status is being changed to completed
    if (updates.status === 'completed') {
      updateData.completed_at = new Date();
    }

    // Update the radiology exam
    const result = await db.update(radiologyExamsTable)
      .set(updateData)
      .where(eq(radiologyExamsTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Radiology exam with id ${id} not found`);
    }

    const exam = result[0];
    
    // Return with proper type conversions
    return {
      ...exam,
      status: exam.status as any // Enum type conversion
    };
  } catch (error) {
    console.error('Radiology exam update failed:', error);
    throw error;
  }
};
