
import { db } from '../db';
import { labTestsTable } from '../db/schema';
import { type CreateLabTestInput, type LabTest } from '../schema';

export const createLabTest = async (input: CreateLabTestInput): Promise<LabTest> => {
  try {
    // Insert lab test record
    const result = await db.insert(labTestsTable)
      .values({
        patient_id: input.patient_id,
        medical_record_id: input.medical_record_id,
        test_name: input.test_name,
        test_type: input.test_type,
        ordered_by: input.ordered_by,
        reference_values: input.reference_values,
        notes: input.notes
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Lab test creation failed:', error);
    throw error;
  }
};
