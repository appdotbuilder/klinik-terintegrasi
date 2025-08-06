
import { db } from '../db';
import { radiologyExamsTable, patientsTable, medicalRecordsTable, usersTable } from '../db/schema';
import { type CreateRadiologyExamInput, type RadiologyExam } from '../schema';
import { eq } from 'drizzle-orm';

export const createRadiologyExam = async (input: CreateRadiologyExamInput): Promise<RadiologyExam> => {
  try {
    // Verify patient exists
    const patient = await db.select()
      .from(patientsTable)
      .where(eq(patientsTable.id, input.patient_id))
      .execute();
    
    if (patient.length === 0) {
      throw new Error(`Patient with id ${input.patient_id} not found`);
    }

    // Verify ordering doctor exists
    const doctor = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.ordered_by))
      .execute();
    
    if (doctor.length === 0) {
      throw new Error(`Doctor with id ${input.ordered_by} not found`);
    }

    // Verify medical record exists if provided
    if (input.medical_record_id) {
      const medicalRecord = await db.select()
        .from(medicalRecordsTable)
        .where(eq(medicalRecordsTable.id, input.medical_record_id))
        .execute();
      
      if (medicalRecord.length === 0) {
        throw new Error(`Medical record with id ${input.medical_record_id} not found`);
      }
    }

    // Insert radiology exam record
    const result = await db.insert(radiologyExamsTable)
      .values({
        patient_id: input.patient_id,
        medical_record_id: input.medical_record_id,
        exam_type: input.exam_type,
        body_part: input.body_part,
        ordered_by: input.ordered_by
      })
      .returning()
      .execute();

    const radiologyExam = result[0];
    return radiologyExam;
  } catch (error) {
    console.error('Radiology exam creation failed:', error);
    throw error;
  }
};
