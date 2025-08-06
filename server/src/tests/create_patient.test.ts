
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { patientsTable } from '../db/schema';
import { type CreatePatientInput } from '../schema';
import { createPatient } from '../handlers/create_patient';
import { eq } from 'drizzle-orm';

const testInput: CreatePatientInput = {
  full_name: 'John Doe',
  date_of_birth: new Date('1990-01-15'),
  gender: 'male',
  phone: '+1234567890',
  email: 'john.doe@example.com',
  address: '123 Main St, City, State 12345',
  emergency_contact: 'Jane Doe',
  emergency_phone: '+1987654321',
  blood_type: 'A+',
  allergies: 'Penicillin, Peanuts'
};

const minimalInput: CreatePatientInput = {
  full_name: 'Jane Smith',
  date_of_birth: new Date('1985-07-20'),
  gender: 'female',
  phone: null,
  email: null,
  address: null,
  emergency_contact: null,
  emergency_phone: null,
  blood_type: null,
  allergies: null
};

describe('createPatient', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a patient with all fields', async () => {
    const result = await createPatient(testInput);

    expect(result.full_name).toEqual('John Doe');
    expect(result.date_of_birth).toEqual(new Date('1990-01-15'));
    expect(result.gender).toEqual('male');
    expect(result.phone).toEqual('+1234567890');
    expect(result.email).toEqual('john.doe@example.com');
    expect(result.address).toEqual('123 Main St, City, State 12345');
    expect(result.emergency_contact).toEqual('Jane Doe');
    expect(result.emergency_phone).toEqual('+1987654321');
    expect(result.blood_type).toEqual('A+');
    expect(result.allergies).toEqual('Penicillin, Peanuts');
    expect(result.id).toBeDefined();
    expect(result.medical_record_number).toMatch(/^MRN\d{6}$/);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a patient with minimal required fields', async () => {
    const result = await createPatient(minimalInput);

    expect(result.full_name).toEqual('Jane Smith');
    expect(result.date_of_birth).toEqual(new Date('1985-07-20'));
    expect(result.gender).toEqual('female');
    expect(result.phone).toBeNull();
    expect(result.email).toBeNull();
    expect(result.address).toBeNull();
    expect(result.emergency_contact).toBeNull();
    expect(result.emergency_phone).toBeNull();
    expect(result.blood_type).toBeNull();
    expect(result.allergies).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.medical_record_number).toMatch(/^MRN\d{6}$/);
  });

  it('should save patient to database', async () => {
    const result = await createPatient(testInput);

    const patients = await db.select()
      .from(patientsTable)
      .where(eq(patientsTable.id, result.id))
      .execute();

    expect(patients).toHaveLength(1);
    expect(patients[0].full_name).toEqual('John Doe');
    expect(patients[0].medical_record_number).toEqual(result.medical_record_number);
    expect(patients[0].gender).toEqual('male');
    expect(patients[0].phone).toEqual('+1234567890');
    expect(patients[0].created_at).toBeInstanceOf(Date);
    
    // Date is stored as string in DB, so compare string representation
    expect(patients[0].date_of_birth).toEqual('1990-01-15');
  });

  it('should generate unique medical record numbers', async () => {
    const patient1 = await createPatient(testInput);
    const patient2 = await createPatient(minimalInput);

    expect(patient1.medical_record_number).not.toEqual(patient2.medical_record_number);
    expect(patient1.medical_record_number).toMatch(/^MRN\d{6}$/);
    expect(patient2.medical_record_number).toMatch(/^MRN\d{6}$/);

    // Extract and compare numbers
    const number1 = parseInt(patient1.medical_record_number.replace('MRN', ''));
    const number2 = parseInt(patient2.medical_record_number.replace('MRN', ''));
    expect(number2).toEqual(number1 + 1);
  });

  it('should generate sequential medical record numbers starting from MRN000001', async () => {
    const patient1 = await createPatient(testInput);
    const patient2 = await createPatient(minimalInput);
    
    expect(patient1.medical_record_number).toEqual('MRN000001');
    expect(patient2.medical_record_number).toEqual('MRN000002');
  });

  it('should handle date of birth correctly', async () => {
    const dateOfBirth = new Date('1992-12-25');
    const input = { ...testInput, date_of_birth: dateOfBirth };
    
    const result = await createPatient(input);
    
    expect(result.date_of_birth).toEqual(dateOfBirth);
    
    // Verify in database - date is stored as string
    const dbPatient = await db.select()
      .from(patientsTable)
      .where(eq(patientsTable.id, result.id))
      .execute();
    
    expect(dbPatient[0].date_of_birth).toEqual('1992-12-25');
  });

  it('should convert date types correctly between input and output', async () => {
    const result = await createPatient(testInput);
    
    // Verify return type has Date object
    expect(result.date_of_birth).toBeInstanceOf(Date);
    expect(typeof result.date_of_birth).toBe('object');
    
    // Verify database stores as string
    const dbPatient = await db.select()
      .from(patientsTable)
      .where(eq(patientsTable.id, result.id))
      .execute();
    
    expect(typeof dbPatient[0].date_of_birth).toBe('string');
    expect(dbPatient[0].date_of_birth).toEqual('1990-01-15');
  });
});
