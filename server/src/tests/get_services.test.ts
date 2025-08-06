
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { servicesTable } from '../db/schema';
import { type CreateServiceInput } from '../schema';
import { getServices } from '../handlers/get_services';

const testService1: CreateServiceInput = {
  name: 'General Consultation',
  description: 'Basic medical consultation',
  category: 'consultation',
  price: 150.00
};

const testService2: CreateServiceInput = {
  name: 'Blood Test',
  description: 'Complete blood count',
  category: 'laboratory',
  price: 75.50
};

const testService3: CreateServiceInput = {
  name: 'X-Ray Chest',
  description: 'Chest X-ray examination',
  category: 'radiology',
  price: 200.00
};

describe('getServices', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all services when no filters applied', async () => {
    // Create test services
    await db.insert(servicesTable).values([
      {
        ...testService1,
        price: testService1.price.toString()
      },
      {
        ...testService2,
        price: testService2.price.toString()
      },
      {
        ...testService3,
        price: testService3.price.toString()
      }
    ]).execute();

    const result = await getServices();

    expect(result).toHaveLength(3);
    
    // Verify all services are returned with correct data types
    result.forEach(service => {
      expect(service.id).toBeDefined();
      expect(typeof service.name).toBe('string');
      expect(typeof service.category).toBe('string');
      expect(typeof service.price).toBe('number');
      expect(typeof service.is_active).toBe('boolean');
      expect(service.created_at).toBeInstanceOf(Date);
      expect(service.updated_at).toBeInstanceOf(Date);
    });

    // Verify specific services exist
    const consultationService = result.find(s => s.name === 'General Consultation');
    expect(consultationService).toBeDefined();
    expect(consultationService?.price).toBe(150.00);
    expect(consultationService?.category).toBe('consultation');
  });

  it('should filter services by category', async () => {
    // Create test services
    await db.insert(servicesTable).values([
      {
        ...testService1,
        price: testService1.price.toString()
      },
      {
        ...testService2,
        price: testService2.price.toString()
      },
      {
        ...testService3,
        price: testService3.price.toString()
      }
    ]).execute();

    const result = await getServices('laboratory');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Blood Test');
    expect(result[0].category).toBe('laboratory');
    expect(result[0].price).toBe(75.50);
  });

  it('should filter services by active status', async () => {
    // Create active and inactive services
    await db.insert(servicesTable).values([
      {
        ...testService1,
        price: testService1.price.toString(),
        is_active: true
      },
      {
        ...testService2,
        price: testService2.price.toString(),
        is_active: false
      },
      {
        ...testService3,
        price: testService3.price.toString(),
        is_active: true
      }
    ]).execute();

    const activeServices = await getServices(undefined, true);
    expect(activeServices).toHaveLength(2);
    activeServices.forEach(service => {
      expect(service.is_active).toBe(true);
    });

    const inactiveServices = await getServices(undefined, false);
    expect(inactiveServices).toHaveLength(1);
    expect(inactiveServices[0].name).toBe('Blood Test');
    expect(inactiveServices[0].is_active).toBe(false);
  });

  it('should filter by both category and active status', async () => {
    // Create services with different categories and statuses
    await db.insert(servicesTable).values([
      {
        ...testService1,
        price: testService1.price.toString(),
        is_active: true
      },
      {
        ...testService2,
        price: testService2.price.toString(),
        is_active: false
      },
      {
        name: 'Advanced Blood Test',
        description: 'Comprehensive blood analysis',
        category: 'laboratory',
        price: '125.00',
        is_active: true
      }
    ]).execute();

    const result = await getServices('laboratory', true);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Advanced Blood Test');
    expect(result[0].category).toBe('laboratory');
    expect(result[0].is_active).toBe(true);
    expect(result[0].price).toBe(125.00);
  });

  it('should return empty array when no services match filters', async () => {
    // Create test services
    await db.insert(servicesTable).values([
      {
        ...testService1,
        price: testService1.price.toString()
      }
    ]).execute();

    const result = await getServices('nonexistent_category');

    expect(result).toHaveLength(0);
  });

  it('should handle empty database', async () => {
    const result = await getServices();

    expect(result).toHaveLength(0);
  });
});
