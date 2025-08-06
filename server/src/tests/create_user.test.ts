
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

const testInput: CreateUserInput = {
  email: 'test@example.com',
  password: 'password123',
  full_name: 'Test User',
  role: 'doctor'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.full_name).toEqual('Test User');
    expect(result.role).toEqual('doctor');
    expect(result.is_active).toEqual(true);
    expect(result.password_hash).toEqual('hashed_password123');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].full_name).toEqual('Test User');
    expect(users[0].role).toEqual('doctor');
    expect(users[0].is_active).toEqual(true);
    expect(users[0].password_hash).toEqual('hashed_password123');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should hash the password', async () => {
    const result = await createUser(testInput);

    expect(result.password_hash).not.toEqual(testInput.password);
    expect(result.password_hash).toEqual('hashed_password123');
  });

  it('should handle different user roles', async () => {
    const adminInput: CreateUserInput = {
      email: 'admin@example.com',
      password: 'admin123',
      full_name: 'Admin User',
      role: 'admin'
    };

    const result = await createUser(adminInput);

    expect(result.role).toEqual('admin');
    expect(result.email).toEqual('admin@example.com');
  });

  it('should throw error for duplicate email', async () => {
    await createUser(testInput);

    const duplicateInput: CreateUserInput = {
      email: 'test@example.com',
      password: 'different123',
      full_name: 'Different User',
      role: 'nurse'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow();
  });
});
