
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { medicationsTable } from '../db/schema';
import { type CreateMedicationInput } from '../schema';
import { getMedications } from '../handlers/get_medications';

const testMedication1: CreateMedicationInput = {
  name: 'Aspirin',
  generic_name: 'Acetylsalicylic acid',
  strength: '500mg',
  dosage_form: 'tablet',
  manufacturer: 'Generic Pharma',
  barcode: '123456789',
  price: 5.99,
  stock_quantity: 100,
  min_stock_level: 20,
  expiry_date: new Date('2025-12-31'),
  description: 'Pain reliever'
};

const testMedication2: CreateMedicationInput = {
  name: 'Ibuprofen',
  generic_name: 'Ibuprofen',
  strength: '200mg',
  dosage_form: 'tablet',
  manufacturer: 'Brand Pharma',
  barcode: '987654321',
  price: 7.50,
  stock_quantity: 5, // Low stock - below min_stock_level
  min_stock_level: 15,
  expiry_date: new Date('2024-06-30'),
  description: 'Anti-inflammatory'
};

const testMedication3: CreateMedicationInput = {
  name: 'Paracetamol',
  generic_name: 'Acetaminophen',
  strength: '500mg',
  dosage_form: 'capsule',
  manufacturer: 'Health Corp',
  barcode: null,
  price: 3.25,
  stock_quantity: 50,
  min_stock_level: 10,
  expiry_date: null,
  description: null
};

// Helper function to convert test data to database format
const toDbFormat = (medication: CreateMedicationInput) => ({
  ...medication,
  price: medication.price.toString(), // Convert number to string for numeric column
  expiry_date: medication.expiry_date?.toISOString().split('T')[0] || null // Convert Date to date string (YYYY-MM-DD)
});

describe('getMedications', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all medications when no filter is applied', async () => {
    // Create test medications with proper format conversion
    await db.insert(medicationsTable).values([
      toDbFormat(testMedication1),
      toDbFormat(testMedication2),
      toDbFormat(testMedication3)
    ]).execute();

    const result = await getMedications();

    expect(result).toHaveLength(3);
    expect(result[0].name).toEqual('Aspirin');
    expect(result[1].name).toEqual('Ibuprofen');
    expect(result[2].name).toEqual('Paracetamol');

    // Verify numeric conversion
    expect(typeof result[0].price).toBe('number');
    expect(result[0].price).toEqual(5.99);
    expect(result[1].price).toEqual(7.50);
    expect(result[2].price).toEqual(3.25);

    // Verify date conversion
    expect(result[0].expiry_date).toBeInstanceOf(Date);
    expect(result[1].expiry_date).toBeInstanceOf(Date);
    expect(result[2].expiry_date).toBeNull();
  });

  it('should return only low stock medications when lowStock is true', async () => {
    // Create test medications
    await db.insert(medicationsTable).values([
      toDbFormat(testMedication1),
      toDbFormat(testMedication2),
      toDbFormat(testMedication3)
    ]).execute();

    const result = await getMedications(true);

    // Only Ibuprofen should be returned (stock_quantity: 5 <= min_stock_level: 15)
    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Ibuprofen');
    expect(result[0].stock_quantity).toEqual(5);
    expect(result[0].min_stock_level).toEqual(15);
    expect(typeof result[0].price).toBe('number');
    expect(result[0].price).toEqual(7.50);
    expect(result[0].expiry_date).toBeInstanceOf(Date);
  });

  it('should return all medications when lowStock is false', async () => {
    // Create test medications
    await db.insert(medicationsTable).values([
      toDbFormat(testMedication1),
      toDbFormat(testMedication2)
    ]).execute();

    const result = await getMedications(false);

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('Aspirin');
    expect(result[1].name).toEqual('Ibuprofen');
  });

  it('should return empty array when no medications exist', async () => {
    const result = await getMedications();

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should return empty array when no low stock medications exist', async () => {
    // Create medication with good stock levels
    await db.insert(medicationsTable).values(
      toDbFormat({
        ...testMedication1,
        stock_quantity: 100,
        min_stock_level: 20
      })
    ).execute();

    const result = await getMedications(true);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should include medications at exact min stock level in low stock filter', async () => {
    // Create medication with stock exactly at minimum level
    const exactMinStockMed: CreateMedicationInput = {
      ...testMedication1,
      stock_quantity: 20, // Exactly at min_stock_level
      min_stock_level: 20
    };

    await db.insert(medicationsTable).values(
      toDbFormat(exactMinStockMed)
    ).execute();

    const result = await getMedications(true);

    expect(result).toHaveLength(1);
    expect(result[0].stock_quantity).toEqual(20);
    expect(result[0].min_stock_level).toEqual(20);
    expect(typeof result[0].price).toBe('number');
    expect(result[0].expiry_date).toBeInstanceOf(Date);
  });
});
