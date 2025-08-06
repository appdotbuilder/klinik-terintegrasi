
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { patientsTable } from '../db/schema';
import { type CreatePatientInput } from '../schema';
import { getPatients } from '../handlers/get_patients';

const testPatient1: CreatePatientInput = {
  full_name: 'John Doe',
  date_of_birth: new Date('1985-06-15'),
  gender: 'male',
  phone: '+1-555-0123',
  email: 'john.doe@example.com',
  address: '123 Main St, Anytown, AT 12345',
  emergency_contact: 'Jane Doe',
  emergency_phone: '+1-555-0124',
  blood_type: 'O+',
  allergies: 'Peanuts, shellfish'
};

const testPatient2: CreatePatientInput = {
  full_name: 'Alice Smith',
  date_of_birth: new Date('1990-12-03'),
  gender: 'female',
  phone: null,
  email: null,
  address: null,
  emergency_contact: null,
  emergency_phone: null,
  blood_type: null,
  allergies: null
};

describe('getPatients', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no patients exist', async () => {
    const result = await getPatients();
    
    expect(result).toEqual([]);
  });

  it('should return all patients', async () => {
    // Create test patients - use string format for date columns
    await db.insert(patientsTable)
      .values([
        {
          medical_record_number: 'MRN001',
          full_name: testPatient1.full_name,
          date_of_birth: '1985-06-15', // Use string format for date column
          gender: testPatient1.gender,
          phone: testPatient1.phone,
          email: testPatient1.email,
          address: testPatient1.address,
          emergency_contact: testPatient1.emergency_contact,
          emergency_phone: testPatient1.emergency_phone,
          blood_type: testPatient1.blood_type,
          allergies: testPatient1.allergies
        },
        {
          medical_record_number: 'MRN002',
          full_name: testPatient2.full_name,
          date_of_birth: '1990-12-03', // Use string format for date column
          gender: testPatient2.gender,
          phone: testPatient2.phone,
          email: testPatient2.email,
          address: testPatient2.address,
          emergency_contact: testPatient2.emergency_contact,
          emergency_phone: testPatient2.emergency_phone,
          blood_type: testPatient2.blood_type,
          allergies: testPatient2.allergies
        }
      ])
      .execute();

    const result = await getPatients();

    expect(result).toHaveLength(2);

    // Check first patient
    const patient1 = result.find(p => p.full_name === 'John Doe');
    expect(patient1).toBeDefined();
    expect(patient1?.medical_record_number).toEqual('MRN001');
    expect(patient1?.gender).toEqual('male');
    expect(patient1?.phone).toEqual('+1-555-0123');
    expect(patient1?.email).toEqual('john.doe@example.com');
    expect(patient1?.blood_type).toEqual('O+');
    expect(patient1?.date_of_birth).toEqual(new Date('1985-06-15'));
    expect(patient1?.created_at).toBeInstanceOf(Date);
    expect(patient1?.updated_at).toBeInstanceOf(Date);

    // Check second patient with null values
    const patient2 = result.find(p => p.full_name === 'Alice Smith');
    expect(patient2).toBeDefined();
    expect(patient2?.medical_record_number).toEqual('MRN002');
    expect(patient2?.gender).toEqual('female');
    expect(patient2?.phone).toBeNull();
    expect(patient2?.email).toBeNull();
    expect(patient2?.address).toBeNull();
    expect(patient2?.emergency_contact).toBeNull();
    expect(patient2?.emergency_phone).toBeNull();
    expect(patient2?.blood_type).toBeNull();
    expect(patient2?.allergies).toBeNull();
    expect(patient2?.date_of_birth).toEqual(new Date('1990-12-03'));
    expect(patient2?.created_at).toBeInstanceOf(Date);
    expect(patient2?.updated_at).toBeInstanceOf(Date);
  });

  it('should handle patients with mixed nullable field values', async () => {
    // Create patient with some null and some non-null values
    await db.insert(patientsTable)
      .values({
        medical_record_number: 'MRN003',
        full_name: 'Bob Johnson',
        date_of_birth: '1978-03-22', // Use string format for date column
        gender: 'male',
        phone: '+1-555-0125',
        email: null,
        address: '456 Oak Ave',
        emergency_contact: null,
        emergency_phone: '+1-555-0126',
        blood_type: 'B-',
        allergies: null
      })
      .execute();

    const result = await getPatients();

    expect(result).toHaveLength(1);
    const patient = result[0];
    expect(patient.full_name).toEqual('Bob Johnson');
    expect(patient.phone).toEqual('+1-555-0125');
    expect(patient.email).toBeNull();
    expect(patient.address).toEqual('456 Oak Ave');
    expect(patient.emergency_contact).toBeNull();
    expect(patient.emergency_phone).toEqual('+1-555-0126');
    expect(patient.blood_type).toEqual('B-');
    expect(patient.allergies).toBeNull();
    expect(patient.date_of_birth).toEqual(new Date('1978-03-22'));
    expect(patient.created_at).toBeInstanceOf(Date);
    expect(patient.updated_at).toBeInstanceOf(Date);
  });
});
