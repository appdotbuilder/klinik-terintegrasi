
import { db } from '../db';
import { patientsTable } from '../db/schema';
import { type CreatePatientInput, type Patient } from '../schema';
import { desc } from 'drizzle-orm';

const generateMedicalRecordNumber = async (): Promise<string> => {
  // Get the highest existing MRN number
  const lastPatient = await db.select({ medical_record_number: patientsTable.medical_record_number })
    .from(patientsTable)
    .orderBy(desc(patientsTable.id))
    .limit(1)
    .execute();

  let nextNumber = 1;
  
  if (lastPatient.length > 0) {
    const lastMRN = lastPatient[0].medical_record_number;
    const numberPart = lastMRN.replace('MRN', '');
    nextNumber = parseInt(numberPart) + 1;
  }

  return `MRN${nextNumber.toString().padStart(6, '0')}`;
};

export const createPatient = async (input: CreatePatientInput): Promise<Patient> => {
  try {
    // Generate unique medical record number
    const medicalRecordNumber = await generateMedicalRecordNumber();

    // Insert patient record - convert Date to string for date column
    const result = await db.insert(patientsTable)
      .values({
        medical_record_number: medicalRecordNumber,
        full_name: input.full_name,
        date_of_birth: input.date_of_birth.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD string
        gender: input.gender,
        phone: input.phone,
        email: input.email,
        address: input.address,
        emergency_contact: input.emergency_contact,
        emergency_phone: input.emergency_phone,
        blood_type: input.blood_type,
        allergies: input.allergies
      })
      .returning()
      .execute();

    // Convert date_of_birth back to Date object before returning
    const patient = result[0];
    return {
      ...patient,
      date_of_birth: new Date(patient.date_of_birth)
    };
  } catch (error) {
    console.error('Patient creation failed:', error);
    throw error;
  }
};
