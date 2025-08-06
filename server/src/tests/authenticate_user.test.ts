
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { authenticateUser } from '../handlers/authenticate_user';
import { eq } from 'drizzle-orm';

const testUserData = {
  email: 'doctor@hospital.com',
  password_hash: '', // Will be set in beforeEach
  full_name: 'Dr. John Smith',
  role: 'doctor' as const,
  is_active: true
};

const testPassword = 'securepassword123';

const validLoginInput: LoginInput = {
  email: 'doctor@hospital.com',
  password: testPassword
};

describe('authenticateUser', () => {
  beforeEach(async () => {
    await createDB();
    
    // Hash password for test user using Bun's built-in password hashing
    testUserData.password_hash = await Bun.password.hash(testPassword);
    
    // Create test user
    await db.insert(usersTable)
      .values(testUserData)
      .execute();
  });

  afterEach(resetDB);

  it('should authenticate user with valid credentials', async () => {
    const result = await authenticateUser(validLoginInput);

    expect(result).not.toBeNull();
    expect(result!.email).toEqual('doctor@hospital.com');
    expect(result!.full_name).toEqual('Dr. John Smith');
    expect(result!.role).toEqual('doctor');
    expect(result!.is_active).toBe(true);
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.password_hash).toBeDefined();
  });

  it('should return null for invalid email', async () => {
    const invalidInput: LoginInput = {
      email: 'nonexistent@hospital.com',
      password: testPassword
    };

    const result = await authenticateUser(invalidInput);
    expect(result).toBeNull();
  });

  it('should return null for invalid password', async () => {
    const invalidInput: LoginInput = {
      email: 'doctor@hospital.com',
      password: 'wrongpassword'
    };

    const result = await authenticateUser(invalidInput);
    expect(result).toBeNull();
  });

  it('should return null for inactive user', async () => {
    // Create inactive user
    const inactiveUserData = {
      email: 'inactive@hospital.com',
      password_hash: await Bun.password.hash(testPassword),
      full_name: 'Inactive User',
      role: 'nurse' as const,
      is_active: false
    };

    await db.insert(usersTable)
      .values(inactiveUserData)
      .execute();

    const inactiveInput: LoginInput = {
      email: 'inactive@hospital.com',
      password: testPassword
    };

    const result = await authenticateUser(inactiveInput);
    expect(result).toBeNull();
  });

  it('should verify user exists in database after authentication', async () => {
    const result = await authenticateUser(validLoginInput);
    expect(result).not.toBeNull();

    // Verify user exists in database - fix the query syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result!.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('doctor@hospital.com');
    expect(users[0].full_name).toEqual('Dr. John Smith');
    expect(users[0].is_active).toBe(true);
  });

  it('should handle case-sensitive email matching', async () => {
    const uppercaseInput: LoginInput = {
      email: 'DOCTOR@HOSPITAL.COM',
      password: testPassword
    };

    const result = await authenticateUser(uppercaseInput);
    expect(result).toBeNull(); // Should be null as email is case-sensitive
  });

  it('should handle multiple users with different roles', async () => {
    // Create additional test user with different role
    const nurseData = {
      email: 'nurse@hospital.com',
      password_hash: await Bun.password.hash('nursepassword'),
      full_name: 'Nurse Jane',
      role: 'nurse' as const,
      is_active: true
    };

    await db.insert(usersTable)
      .values(nurseData)
      .execute();

    // Authenticate nurse
    const nurseInput: LoginInput = {
      email: 'nurse@hospital.com',
      password: 'nursepassword'
    };

    const nurseResult = await authenticateUser(nurseInput);
    expect(nurseResult).not.toBeNull();
    expect(nurseResult!.role).toEqual('nurse');
    expect(nurseResult!.full_name).toEqual('Nurse Jane');

    // Authenticate original doctor
    const doctorResult = await authenticateUser(validLoginInput);
    expect(doctorResult).not.toBeNull();
    expect(doctorResult!.role).toEqual('doctor');
    expect(doctorResult!.full_name).toEqual('Dr. John Smith');
  });
});
