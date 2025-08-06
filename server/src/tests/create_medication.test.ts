
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { medicationsTable } from '../db/schema';
import { type CreateMedicationInput } from '../schema';
import { createMedication } from '../handlers/create_medication';
import { eq } from 'drizzle-orm';

// Complete test input with all fields
const testInput: CreateMedicationInput = {
  name: 'Amoxicillin',
  generic_name: 'Amoxicillin trihydrate',
  strength: '500mg',
  dosage_form: 'Capsule',
  manufacturer: 'PharmaCorp',
  barcode: '1234567890123',
  price: 15.99,
  stock_quantity: 100,
  min_stock_level: 20,
  expiry_date: new Date('2025-12-31'),
  description: 'Broad-spectrum antibiotic'
};

// Minimal test input with only required fields
const minimalInput: CreateMedicationInput = {
  name: 'Paracetamol',
  generic_name: null,
  strength: null,
  dosage_form: 'Tablet',
  manufacturer: null,
  barcode: null,
  price: 5.50,
  stock_quantity: 50,
  min_stock_level: 10,
  expiry_date: null,
  description: null
};

describe('createMedication', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a medication with all fields', async () => {
    const result = await createMedication(testInput);

    // Basic field validation
    expect(result.name).toEqual('Amoxicillin');
    expect(result.generic_name).toEqual('Amoxicillin trihydrate');
    expect(result.strength).toEqual('500mg');
    expect(result.dosage_form).toEqual('Capsule');
    expect(result.manufacturer).toEqual('PharmaCorp');
    expect(result.barcode).toEqual('1234567890123');
    expect(result.price).toEqual(15.99);
    expect(typeof result.price).toBe('number');
    expect(result.stock_quantity).toEqual(100);
    expect(result.min_stock_level).toEqual(20);
    expect(result.expiry_date).toEqual(testInput.expiry_date);
    expect(result.expiry_date).toBeInstanceOf(Date);
    expect(result.description).toEqual('Broad-spectrum antibiotic');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a medication with minimal fields', async () => {
    const result = await createMedication(minimalInput);

    // Basic field validation
    expect(result.name).toEqual('Paracetamol');
    expect(result.generic_name).toBeNull();
    expect(result.strength).toBeNull();
    expect(result.dosage_form).toEqual('Tablet');
    expect(result.manufacturer).toBeNull();
    expect(result.barcode).toBeNull();
    expect(result.price).toEqual(5.50);
    expect(typeof result.price).toBe('number');
    expect(result.stock_quantity).toEqual(50);
    expect(result.min_stock_level).toEqual(10);
    expect(result.expiry_date).toBeNull();
    expect(result.description).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save medication to database', async () => {
    const result = await createMedication(testInput);

    // Query using proper drizzle syntax
    const medications = await db.select()
      .from(medicationsTable)
      .where(eq(medicationsTable.id, result.id))
      .execute();

    expect(medications).toHaveLength(1);
    expect(medications[0].name).toEqual('Amoxicillin');
    expect(medications[0].generic_name).toEqual('Amoxicillin trihydrate');
    expect(medications[0].dosage_form).toEqual('Capsule');
    expect(parseFloat(medications[0].price)).toEqual(15.99);
    expect(medications[0].stock_quantity).toEqual(100);
    expect(medications[0].min_stock_level).toEqual(20);
    expect(medications[0].expiry_date).toEqual('2025-12-31');
    expect(medications[0].created_at).toBeInstanceOf(Date);
    expect(medications[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle zero stock levels correctly', async () => {
    const zeroStockInput: CreateMedicationInput = {
      ...minimalInput,
      stock_quantity: 0,
      min_stock_level: 0
    };

    const result = await createMedication(zeroStockInput);

    expect(result.stock_quantity).toEqual(0);
    expect(result.min_stock_level).toEqual(0);

    // Verify in database
    const medications = await db.select()
      .from(medicationsTable)
      .where(eq(medicationsTable.id, result.id))
      .execute();

    expect(medications[0].stock_quantity).toEqual(0);
    expect(medications[0].min_stock_level).toEqual(0);
  });

  it('should handle decimal prices correctly', async () => {
    // Use price with 2 decimal places to match database precision (10,2)
    const decimalPriceInput: CreateMedicationInput = {
      ...minimalInput,
      price: 123.45
    };

    const result = await createMedication(decimalPriceInput);

    expect(typeof result.price).toBe('number');
    expect(result.price).toEqual(123.45);

    // Verify numeric conversion in database
    const medications = await db.select()
      .from(medicationsTable)
      .where(eq(medicationsTable.id, result.id))
      .execute();

    expect(parseFloat(medications[0].price)).toEqual(123.45);
  });

  it('should handle date conversion correctly', async () => {
    const result = await createMedication(testInput);

    // Verify date is returned as Date object
    expect(result.expiry_date).toBeInstanceOf(Date);
    expect(result.expiry_date?.toISOString().split('T')[0]).toEqual('2025-12-31');

    // Verify in database date is stored as string
    const medications = await db.select()
      .from(medicationsTable)
      .where(eq(medicationsTable.id, result.id))
      .execute();

    expect(medications[0].expiry_date).toEqual('2025-12-31');
  });
});
