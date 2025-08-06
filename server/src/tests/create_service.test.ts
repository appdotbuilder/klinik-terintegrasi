
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { servicesTable } from '../db/schema';
import { type CreateServiceInput } from '../schema';
import { createService } from '../handlers/create_service';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateServiceInput = {
  name: 'General Consultation',
  description: 'Standard medical consultation with doctor',
  category: 'consultation',
  price: 150.00
};

describe('createService', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a service', async () => {
    const result = await createService(testInput);

    // Basic field validation
    expect(result.name).toEqual('General Consultation');
    expect(result.description).toEqual(testInput.description);
    expect(result.category).toEqual('consultation');
    expect(result.price).toEqual(150.00);
    expect(typeof result.price).toBe('number');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save service to database', async () => {
    const result = await createService(testInput);

    // Query using proper drizzle syntax
    const services = await db.select()
      .from(servicesTable)
      .where(eq(servicesTable.id, result.id))
      .execute();

    expect(services).toHaveLength(1);
    expect(services[0].name).toEqual('General Consultation');
    expect(services[0].description).toEqual(testInput.description);
    expect(services[0].category).toEqual('consultation');
    expect(parseFloat(services[0].price)).toEqual(150.00);
    expect(services[0].is_active).toBe(true);
    expect(services[0].created_at).toBeInstanceOf(Date);
    expect(services[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle service with null description', async () => {
    const inputWithNullDescription: CreateServiceInput = {
      name: 'Blood Test',
      description: null,
      category: 'laboratory',
      price: 75.50
    };

    const result = await createService(inputWithNullDescription);

    expect(result.name).toEqual('Blood Test');
    expect(result.description).toBeNull();
    expect(result.category).toEqual('laboratory');
    expect(result.price).toEqual(75.50);
    expect(result.is_active).toBe(true);

    // Verify in database
    const services = await db.select()
      .from(servicesTable)
      .where(eq(servicesTable.id, result.id))
      .execute();

    expect(services[0].description).toBeNull();
  });

  it('should handle different service categories', async () => {
    const radiologyInput: CreateServiceInput = {
      name: 'X-Ray Chest',
      description: 'Chest X-ray examination',
      category: 'radiology',
      price: 200.00
    };

    const result = await createService(radiologyInput);

    expect(result.name).toEqual('X-Ray Chest');
    expect(result.category).toEqual('radiology');
    expect(result.price).toEqual(200.00);
  });
});
