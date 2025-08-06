
import { db } from '../db';
import { medicalRecordsTable } from '../db/schema';
import { type CreateMedicalRecordInput, type MedicalRecord } from '../schema';

export const createMedicalRecord = async (input: CreateMedicalRecordInput): Promise<MedicalRecord> => {
  try {
    // Insert medical record
    const result = await db.insert(medicalRecordsTable)
      .values({
        patient_id: input.patient_id,
        doctor_id: input.doctor_id,
        chief_complaint: input.chief_complaint,
        present_illness: input.present_illness,
        physical_examination: input.physical_examination,
        diagnosis: input.diagnosis,
        treatment_plan: input.treatment_plan,
        prescription: input.prescription,
        notes: input.notes
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Medical record creation failed:', error);
    throw error;
  }
};
