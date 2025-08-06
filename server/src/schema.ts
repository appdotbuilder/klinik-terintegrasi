
import { z } from 'zod';

// User Management Schemas
export const userRoleEnum = z.enum(['admin', 'doctor', 'nurse', 'cashier', 'pharmacist', 'lab_technician', 'radiologist']);

export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  full_name: z.string(),
  role: userRoleEnum,
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1),
  role: userRoleEnum
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Patient Management Schemas
export const genderEnum = z.enum(['male', 'female']);

export const patientSchema = z.object({
  id: z.number(),
  medical_record_number: z.string(),
  full_name: z.string(),
  date_of_birth: z.coerce.date(),
  gender: genderEnum,
  phone: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string().nullable(),
  emergency_contact: z.string().nullable(),
  emergency_phone: z.string().nullable(),
  blood_type: z.string().nullable(),
  allergies: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Patient = z.infer<typeof patientSchema>;

export const createPatientInputSchema = z.object({
  full_name: z.string().min(1),
  date_of_birth: z.coerce.date(),
  gender: genderEnum,
  phone: z.string().nullable(),
  email: z.string().email().nullable(),
  address: z.string().nullable(),
  emergency_contact: z.string().nullable(),
  emergency_phone: z.string().nullable(),
  blood_type: z.string().nullable(),
  allergies: z.string().nullable()
});

export type CreatePatientInput = z.infer<typeof createPatientInputSchema>;

// Queue Management Schemas
export const queueStatusEnum = z.enum(['waiting', 'in_progress', 'completed', 'cancelled']);

export const queueSchema = z.object({
  id: z.number(),
  patient_id: z.number(),
  queue_number: z.number(),
  queue_date: z.coerce.date(),
  status: queueStatusEnum,
  priority: z.number(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Queue = z.infer<typeof queueSchema>;

export const createQueueInputSchema = z.object({
  patient_id: z.number(),
  priority: z.number().default(0),
  notes: z.string().nullable()
});

export type CreateQueueInput = z.infer<typeof createQueueInputSchema>;

// Medical Record Schemas
export const medicalRecordSchema = z.object({
  id: z.number(),
  patient_id: z.number(),
  doctor_id: z.number(),
  visit_date: z.coerce.date(),
  chief_complaint: z.string(),
  present_illness: z.string().nullable(),
  physical_examination: z.string().nullable(),
  diagnosis: z.string(),
  treatment_plan: z.string().nullable(),
  prescription: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type MedicalRecord = z.infer<typeof medicalRecordSchema>;

export const createMedicalRecordInputSchema = z.object({
  patient_id: z.number(),
  doctor_id: z.number(),
  chief_complaint: z.string().min(1),
  present_illness: z.string().nullable(),
  physical_examination: z.string().nullable(),
  diagnosis: z.string().min(1),
  treatment_plan: z.string().nullable(),
  prescription: z.string().nullable(),
  notes: z.string().nullable()
});

export type CreateMedicalRecordInput = z.infer<typeof createMedicalRecordInputSchema>;

// Laboratory Schemas
export const labTestStatusEnum = z.enum(['ordered', 'in_progress', 'completed', 'cancelled']);

export const labTestSchema = z.object({
  id: z.number(),
  patient_id: z.number(),
  medical_record_id: z.number().nullable(),
  test_name: z.string(),
  test_type: z.string(),
  status: labTestStatusEnum,
  ordered_by: z.number(),
  technician_id: z.number().nullable(),
  results: z.string().nullable(),
  reference_values: z.string().nullable(),
  notes: z.string().nullable(),
  ordered_at: z.coerce.date(),
  completed_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type LabTest = z.infer<typeof labTestSchema>;

export const createLabTestInputSchema = z.object({
  patient_id: z.number(),
  medical_record_id: z.number().nullable(),
  test_name: z.string().min(1),
  test_type: z.string().min(1),
  ordered_by: z.number(),
  reference_values: z.string().nullable(),
  notes: z.string().nullable()
});

export type CreateLabTestInput = z.infer<typeof createLabTestInputSchema>;

// Radiology Schemas
export const radiologyStatusEnum = z.enum(['ordered', 'in_progress', 'completed', 'cancelled']);

export const radiologyExamSchema = z.object({
  id: z.number(),
  patient_id: z.number(),
  medical_record_id: z.number().nullable(),
  exam_type: z.string(),
  body_part: z.string(),
  status: radiologyStatusEnum,
  ordered_by: z.number(),
  radiologist_id: z.number().nullable(),
  findings: z.string().nullable(),
  impression: z.string().nullable(),
  recommendations: z.string().nullable(),
  ordered_at: z.coerce.date(),
  completed_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type RadiologyExam = z.infer<typeof radiologyExamSchema>;

export const createRadiologyExamInputSchema = z.object({
  patient_id: z.number(),
  medical_record_id: z.number().nullable(),
  exam_type: z.string().min(1),
  body_part: z.string().min(1),
  ordered_by: z.number()
});

export type CreateRadiologyExamInput = z.infer<typeof createRadiologyExamInputSchema>;

// Medication Management Schemas
export const medicationSchema = z.object({
  id: z.number(),
  name: z.string(),
  generic_name: z.string().nullable(),
  strength: z.string().nullable(),
  dosage_form: z.string(),
  manufacturer: z.string().nullable(),
  barcode: z.string().nullable(),
  price: z.number(),
  stock_quantity: z.number().int(),
  min_stock_level: z.number().int(),
  expiry_date: z.coerce.date().nullable(),
  description: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Medication = z.infer<typeof medicationSchema>;

export const createMedicationInputSchema = z.object({
  name: z.string().min(1),
  generic_name: z.string().nullable(),
  strength: z.string().nullable(),
  dosage_form: z.string().min(1),
  manufacturer: z.string().nullable(),
  barcode: z.string().nullable(),
  price: z.number().positive(),
  stock_quantity: z.number().int().nonnegative(),
  min_stock_level: z.number().int().nonnegative(),
  expiry_date: z.coerce.date().nullable(),
  description: z.string().nullable()
});

export type CreateMedicationInput = z.infer<typeof createMedicationInputSchema>;

// Prescription Schemas
export const prescriptionStatusEnum = z.enum(['pending', 'dispensed', 'cancelled']);

export const prescriptionSchema = z.object({
  id: z.number(),
  patient_id: z.number(),
  medical_record_id: z.number().nullable(),
  prescribed_by: z.number(),
  dispensed_by: z.number().nullable(),
  status: prescriptionStatusEnum,
  prescription_date: z.coerce.date(),
  dispensed_date: z.coerce.date().nullable(),
  total_amount: z.number(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Prescription = z.infer<typeof prescriptionSchema>;

export const prescriptionItemSchema = z.object({
  id: z.number(),
  prescription_id: z.number(),
  medication_id: z.number(),
  quantity: z.number().int(),
  dosage: z.string(),
  frequency: z.string(),
  duration: z.string(),
  instructions: z.string().nullable(),
  unit_price: z.number(),
  total_price: z.number()
});

export type PrescriptionItem = z.infer<typeof prescriptionItemSchema>;

export const createPrescriptionInputSchema = z.object({
  patient_id: z.number(),
  medical_record_id: z.number().nullable(),
  prescribed_by: z.number(),
  items: z.array(z.object({
    medication_id: z.number(),
    quantity: z.number().int().positive(),
    dosage: z.string().min(1),
    frequency: z.string().min(1),
    duration: z.string().min(1),
    instructions: z.string().nullable()
  })),
  notes: z.string().nullable()
});

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionInputSchema>;

// Service & Pricing Schemas
export const serviceSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.string(),
  price: z.number(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Service = z.infer<typeof serviceSchema>;

export const createServiceInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  category: z.string().min(1),
  price: z.number().positive()
});

export type CreateServiceInput = z.infer<typeof createServiceInputSchema>;

// Billing & Payment Schemas
export const paymentStatusEnum = z.enum(['pending', 'paid', 'partial', 'cancelled', 'refunded']);
export const paymentMethodEnum = z.enum(['cash', 'credit_card', 'debit_card', 'transfer', 'insurance']);

export const invoiceSchema = z.object({
  id: z.number(),
  invoice_number: z.string(),
  patient_id: z.number(),
  cashier_id: z.number().nullable(),
  total_amount: z.number(),
  discount_amount: z.number(),
  tax_amount: z.number(),
  final_amount: z.number(),
  payment_status: paymentStatusEnum,
  payment_method: paymentMethodEnum.nullable(),
  payment_date: z.coerce.date().nullable(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Invoice = z.infer<typeof invoiceSchema>;

export const invoiceItemSchema = z.object({
  id: z.number(),
  invoice_id: z.number(),
  item_type: z.enum(['service', 'medication', 'lab_test', 'radiology']),
  item_id: z.number(),
  description: z.string(),
  quantity: z.number(),
  unit_price: z.number(),
  total_price: z.number()
});

export type InvoiceItem = z.infer<typeof invoiceItemSchema>;

export const createInvoiceInputSchema = z.object({
  patient_id: z.number(),
  items: z.array(z.object({
    item_type: z.enum(['service', 'medication', 'lab_test', 'radiology']),
    item_id: z.number(),
    description: z.string(),
    quantity: z.number().positive(),
    unit_price: z.number().positive()
  })),
  discount_amount: z.number().nonnegative().default(0),
  tax_amount: z.number().nonnegative().default(0),
  notes: z.string().nullable()
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceInputSchema>;

// Report Schemas
export const reportTypeEnum = z.enum(['patient_summary', 'financial_summary', 'inventory_report', 'appointment_report', 'medical_statistics']);

export const reportRequestSchema = z.object({
  report_type: reportTypeEnum,
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  format: z.enum(['pdf', 'excel']),
  filters: z.record(z.any()).optional()
});

export type ReportRequest = z.infer<typeof reportRequestSchema>;
