
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { medicationsTable } from '../db/schema';
import { type CreateMedicationInput } from '../schema';
import { updateMedicationStock } from '../handlers/update_medication_stock';
import { eq } from 'drizzle-orm';

const testMedicationInput: CreateMedicationInput = {
  name: 'Test Medication',
  generic_name: 'Generic Test',
  strength: '500mg',
  dosage_form: 'tablet',
  manufacturer: 'Test Pharma',
  barcode: '123456789',
  price: 15.99,
  stock_quantity: 100,
  min_stock_level: 10,
  expiry_date: new Date('2025-12-31'),
  description: 'Test medication for stock management'
};

describe('updateMedicationStock', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should add stock quantity when operation is add', async () => {
    // Create test medication - convert types for database
    const medicationResult = await db.insert(medicationsTable)
      .values({
        ...testMedicationInput,
        price: testMedicationInput.price.toString(),
        expiry_date: testMedicationInput.expiry_date?.toISOString().split('T')[0] || null
      })
      .returning()
      .execute();

    const medicationId = medicationResult[0].id;

    // Add 50 to stock (100 + 50 = 150)
    const result = await updateMedicationStock(medicationId, 50, 'add');

    expect(result.id).toEqual(medicationId);
    expect(result.stock_quantity).toEqual(150);
    expect(result.name).toEqual('Test Medication');
    expect(result.price).toEqual(15.99);
    expect(typeof result.price).toBe('number');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should subtract stock quantity when operation is subtract', async () => {
    // Create test medication
    const medicationResult = await db.insert(medicationsTable)
      .values({
        ...testMedicationInput,
        price: testMedicationInput.price.toString(),
        expiry_date: testMedicationInput.expiry_date?.toISOString().split('T')[0] || null
      })
      .returning()
      .execute();

    const medicationId = medicationResult[0].id;

    // Subtract 30 from stock (100 - 30 = 70)
    const result = await updateMedicationStock(medicationId, 30, 'subtract');

    expect(result.id).toEqual(medicationId);
    expect(result.stock_quantity).toEqual(70);
    expect(result.name).toEqual('Test Medication');
    expect(result.price).toEqual(15.99);
    expect(typeof result.price).toBe('number');
  });

  it('should update stock in database correctly', async () => {
    // Create test medication
    const medicationResult = await db.insert(medicationsTable)
      .values({
        ...testMedicationInput,
        price: testMedicationInput.price.toString(),
        expiry_date: testMedicationInput.expiry_date?.toISOString().split('T')[0] || null
      })
      .returning()
      .execute();

    const medicationId = medicationResult[0].id;

    // Add 25 to stock
    await updateMedicationStock(medicationId, 25, 'add');

    // Verify in database
    const updatedMedications = await db.select()
      .from(medicationsTable)
      .where(eq(medicationsTable.id, medicationId))
      .execute();

    expect(updatedMedications).toHaveLength(1);
    expect(updatedMedications[0].stock_quantity).toEqual(125);
    expect(updatedMedications[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when medication does not exist', async () => {
    await expect(updateMedicationStock(999, 10, 'add'))
      .rejects.toThrow(/medication with id 999 not found/i);
  });

  it('should throw error when trying to subtract more than available stock', async () => {
    // Create test medication with 100 stock
    const medicationResult = await db.insert(medicationsTable)
      .values({
        ...testMedicationInput,
        price: testMedicationInput.price.toString(),
        expiry_date: testMedicationInput.expiry_date?.toISOString().split('T')[0] || null
      })
      .returning()
      .execute();

    const medicationId = medicationResult[0].id;

    // Try to subtract 150 (more than available 100)
    await expect(updateMedicationStock(medicationId, 150, 'subtract'))
      .rejects.toThrow(/insufficient stock.*current: 100.*requested: 150/i);
  });

  it('should allow subtracting exact stock amount to reach zero', async () => {
    // Create test medication with 50 stock
    const medicationResult = await db.insert(medicationsTable)
      .values({
        ...testMedicationInput,
        stock_quantity: 50,
        price: testMedicationInput.price.toString(),
        expiry_date: testMedicationInput.expiry_date?.toISOString().split('T')[0] || null
      })
      .returning()
      .execute();

    const medicationId = medicationResult[0].id;

    // Subtract all 50
    const result = await updateMedicationStock(medicationId, 50, 'subtract');

    expect(result.stock_quantity).toEqual(0);
    expect(result.id).toEqual(medicationId);
  });

  it('should throw error for invalid operation', async () => {
    // Create test medication
    const medicationResult = await db.insert(medicationsTable)
      .values({
        ...testMedicationInput,
        price: testMedicationInput.price.toString(),
        expiry_date: testMedicationInput.expiry_date?.toISOString().split('T')[0] || null
      })
      .returning()
      .execute();

    const medicationId = medicationResult[0].id;

    // Try invalid operation
    await expect(updateMedicationStock(medicationId, 10, 'invalid' as any))
      .rejects.toThrow(/invalid operation.*must be.*add.*subtract/i);
  });
});
