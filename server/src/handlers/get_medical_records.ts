
import { db } from '../db';
import { medicalRecordsTable, patientsTable, usersTable } from '../db/schema';
import { type MedicalRecord } from '../schema';
import { eq } from 'drizzle-orm';

export const getMedicalRecords = async (patientId?: number): Promise<MedicalRecord[]> => {
  try {
    // Build the base query with joins
    const baseQuery = db.select()
      .from(medicalRecordsTable)
      .innerJoin(patientsTable, eq(medicalRecordsTable.patient_id, patientsTable.id))
      .innerJoin(usersTable, eq(medicalRecordsTable.doctor_id, usersTable.id));

    // Execute query with or without patient filter
    const results = patientId !== undefined
      ? await baseQuery.where(eq(medicalRecordsTable.patient_id, patientId)).execute()
      : await baseQuery.execute();

    // Transform joined results back to MedicalRecord objects
    return results.map(result => ({
      id: result.medical_records.id,
      patient_id: result.medical_records.patient_id,
      doctor_id: result.medical_records.doctor_id,
      visit_date: result.medical_records.visit_date,
      chief_complaint: result.medical_records.chief_complaint,
      present_illness: result.medical_records.present_illness,
      physical_examination: result.medical_records.physical_examination,
      diagnosis: result.medical_records.diagnosis,
      treatment_plan: result.medical_records.treatment_plan,
      prescription: result.medical_records.prescription,
      notes: result.medical_records.notes,
      created_at: result.medical_records.created_at,
      updated_at: result.medical_records.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch medical records:', error);
    throw error;
  }
};
