
import { serial, text, pgTable, timestamp, numeric, integer, boolean, date, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'doctor', 'nurse', 'cashier', 'pharmacist', 'lab_technician', 'radiologist']);
export const genderEnum = pgEnum('gender', ['male', 'female']);
export const queueStatusEnum = pgEnum('queue_status', ['waiting', 'in_progress', 'completed', 'cancelled']);
export const labTestStatusEnum = pgEnum('lab_test_status', ['ordered', 'in_progress', 'completed', 'cancelled']);
export const radiologyStatusEnum = pgEnum('radiology_status', ['ordered', 'in_progress', 'completed', 'cancelled']);
export const prescriptionStatusEnum = pgEnum('prescription_status', ['pending', 'dispensed', 'cancelled']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'paid', 'partial', 'cancelled', 'refunded']);
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'credit_card', 'debit_card', 'transfer', 'insurance']);
export const itemTypeEnum = pgEnum('item_type', ['service', 'medication', 'lab_test', 'radiology']);

// Users Table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name').notNull(),
  role: userRoleEnum('role').notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Patients Table
export const patientsTable = pgTable('patients', {
  id: serial('id').primaryKey(),
  medical_record_number: text('medical_record_number').notNull().unique(),
  full_name: text('full_name').notNull(),
  date_of_birth: date('date_of_birth').notNull(),
  gender: genderEnum('gender').notNull(),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  emergency_contact: text('emergency_contact'),
  emergency_phone: text('emergency_phone'),
  blood_type: text('blood_type'),
  allergies: text('allergies'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Queue Management Table
export const queueTable = pgTable('queue', {
  id: serial('id').primaryKey(),
  patient_id: integer('patient_id').notNull().references(() => patientsTable.id),
  queue_number: integer('queue_number').notNull(),
  queue_date: date('queue_date').notNull(),
  status: queueStatusEnum('status').default('waiting').notNull(),
  priority: integer('priority').default(0).notNull(),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Medical Records Table
export const medicalRecordsTable = pgTable('medical_records', {
  id: serial('id').primaryKey(),
  patient_id: integer('patient_id').notNull().references(() => patientsTable.id),
  doctor_id: integer('doctor_id').notNull().references(() => usersTable.id),
  visit_date: timestamp('visit_date').defaultNow().notNull(),
  chief_complaint: text('chief_complaint').notNull(),
  present_illness: text('present_illness'),
  physical_examination: text('physical_examination'),
  diagnosis: text('diagnosis').notNull(),
  treatment_plan: text('treatment_plan'),
  prescription: text('prescription'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Laboratory Tests Table
export const labTestsTable = pgTable('lab_tests', {
  id: serial('id').primaryKey(),
  patient_id: integer('patient_id').notNull().references(() => patientsTable.id),
  medical_record_id: integer('medical_record_id').references(() => medicalRecordsTable.id),
  test_name: text('test_name').notNull(),
  test_type: text('test_type').notNull(),
  status: labTestStatusEnum('status').default('ordered').notNull(),
  ordered_by: integer('ordered_by').notNull().references(() => usersTable.id),
  technician_id: integer('technician_id').references(() => usersTable.id),
  results: text('results'),
  reference_values: text('reference_values'),
  notes: text('notes'),
  ordered_at: timestamp('ordered_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Radiology Exams Table
export const radiologyExamsTable = pgTable('radiology_exams', {
  id: serial('id').primaryKey(),
  patient_id: integer('patient_id').notNull().references(() => patientsTable.id),
  medical_record_id: integer('medical_record_id').references(() => medicalRecordsTable.id),
  exam_type: text('exam_type').notNull(),
  body_part: text('body_part').notNull(),
  status: radiologyStatusEnum('status').default('ordered').notNull(),
  ordered_by: integer('ordered_by').notNull().references(() => usersTable.id),
  radiologist_id: integer('radiologist_id').references(() => usersTable.id),
  findings: text('findings'),
  impression: text('impression'),
  recommendations: text('recommendations'),
  ordered_at: timestamp('ordered_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Medications Table
export const medicationsTable = pgTable('medications', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  generic_name: text('generic_name'),
  strength: text('strength'),
  dosage_form: text('dosage_form').notNull(),
  manufacturer: text('manufacturer'),
  barcode: text('barcode'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  stock_quantity: integer('stock_quantity').notNull(),
  min_stock_level: integer('min_stock_level').notNull(),
  expiry_date: date('expiry_date'),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Prescriptions Table
export const prescriptionsTable = pgTable('prescriptions', {
  id: serial('id').primaryKey(),
  patient_id: integer('patient_id').notNull().references(() => patientsTable.id),
  medical_record_id: integer('medical_record_id').references(() => medicalRecordsTable.id),
  prescribed_by: integer('prescribed_by').notNull().references(() => usersTable.id),
  dispensed_by: integer('dispensed_by').references(() => usersTable.id),
  status: prescriptionStatusEnum('status').default('pending').notNull(),
  prescription_date: timestamp('prescription_date').defaultNow().notNull(),
  dispensed_date: timestamp('dispensed_date'),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Prescription Items Table
export const prescriptionItemsTable = pgTable('prescription_items', {
  id: serial('id').primaryKey(),
  prescription_id: integer('prescription_id').notNull().references(() => prescriptionsTable.id),
  medication_id: integer('medication_id').notNull().references(() => medicationsTable.id),
  quantity: integer('quantity').notNull(),
  dosage: text('dosage').notNull(),
  frequency: text('frequency').notNull(),
  duration: text('duration').notNull(),
  instructions: text('instructions'),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  total_price: numeric('total_price', { precision: 10, scale: 2 }).notNull()
});

// Services Table
export const servicesTable = pgTable('services', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Invoices Table
export const invoicesTable = pgTable('invoices', {
  id: serial('id').primaryKey(),
  invoice_number: text('invoice_number').notNull().unique(),
  patient_id: integer('patient_id').notNull().references(() => patientsTable.id),
  cashier_id: integer('cashier_id').references(() => usersTable.id),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  discount_amount: numeric('discount_amount', { precision: 10, scale: 2 }).default('0').notNull(),
  tax_amount: numeric('tax_amount', { precision: 10, scale: 2 }).default('0').notNull(),
  final_amount: numeric('final_amount', { precision: 10, scale: 2 }).notNull(),
  payment_status: paymentStatusEnum('payment_status').default('pending').notNull(),
  payment_method: paymentMethodEnum('payment_method'),
  payment_date: timestamp('payment_date'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Invoice Items Table
export const invoiceItemsTable = pgTable('invoice_items', {
  id: serial('id').primaryKey(),
  invoice_id: integer('invoice_id').notNull().references(() => invoicesTable.id),
  item_type: itemTypeEnum('item_type').notNull(),
  item_id: integer('item_id').notNull(),
  description: text('description').notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull(),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  total_price: numeric('total_price', { precision: 10, scale: 2 }).notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  medicalRecords: many(medicalRecordsTable),
  orderedLabTests: many(labTestsTable, { relationName: 'ordered_lab_tests' }),
  performedLabTests: many(labTestsTable, { relationName: 'performed_lab_tests' }),
  orderedRadiologyExams: many(radiologyExamsTable, { relationName: 'ordered_radiology_exams' }),
  performedRadiologyExams: many(radiologyExamsTable, { relationName: 'performed_radiology_exams' }),
  prescriptions: many(prescriptionsTable, { relationName: 'prescribed_prescriptions' }),
  dispensedPrescriptions: many(prescriptionsTable, { relationName: 'dispensed_prescriptions' }),
  invoices: many(invoicesTable)
}));

export const patientsRelations = relations(patientsTable, ({ many }) => ({
  queueEntries: many(queueTable),
  medicalRecords: many(medicalRecordsTable),
  labTests: many(labTestsTable),
  radiologyExams: many(radiologyExamsTable),
  prescriptions: many(prescriptionsTable),
  invoices: many(invoicesTable)
}));

export const queueRelations = relations(queueTable, ({ one }) => ({
  patient: one(patientsTable, {
    fields: [queueTable.patient_id],
    references: [patientsTable.id]
  })
}));

export const medicalRecordsRelations = relations(medicalRecordsTable, ({ one, many }) => ({
  patient: one(patientsTable, {
    fields: [medicalRecordsTable.patient_id],
    references: [patientsTable.id]
  }),
  doctor: one(usersTable, {
    fields: [medicalRecordsTable.doctor_id],
    references: [usersTable.id]
  }),
  labTests: many(labTestsTable),
  radiologyExams: many(radiologyExamsTable),
  prescriptions: many(prescriptionsTable)
}));

export const labTestsRelations = relations(labTestsTable, ({ one }) => ({
  patient: one(patientsTable, {
    fields: [labTestsTable.patient_id],
    references: [patientsTable.id]
  }),
  medicalRecord: one(medicalRecordsTable, {
    fields: [labTestsTable.medical_record_id],
    references: [medicalRecordsTable.id]
  }),
  orderedBy: one(usersTable, {
    fields: [labTestsTable.ordered_by],
    references: [usersTable.id],
    relationName: 'ordered_lab_tests'
  }),
  technician: one(usersTable, {
    fields: [labTestsTable.technician_id],
    references: [usersTable.id],
    relationName: 'performed_lab_tests'
  })
}));

export const radiologyExamsRelations = relations(radiologyExamsTable, ({ one }) => ({
  patient: one(patientsTable, {
    fields: [radiologyExamsTable.patient_id],
    references: [patientsTable.id]
  }),
  medicalRecord: one(medicalRecordsTable, {
    fields: [radiologyExamsTable.medical_record_id],
    references: [medicalRecordsTable.id]
  }),
  orderedBy: one(usersTable, {
    fields: [radiologyExamsTable.ordered_by],
    references: [usersTable.id],
    relationName: 'ordered_radiology_exams'
  }),
  radiologist: one(usersTable, {
    fields: [radiologyExamsTable.radiologist_id],
    references: [usersTable.id],
    relationName: 'performed_radiology_exams'
  })
}));

export const prescriptionsRelations = relations(prescriptionsTable, ({ one, many }) => ({
  patient: one(patientsTable, {
    fields: [prescriptionsTable.patient_id],
    references: [patientsTable.id]
  }),
  medicalRecord: one(medicalRecordsTable, {
    fields: [prescriptionsTable.medical_record_id],
    references: [medicalRecordsTable.id]
  }),
  prescribedBy: one(usersTable, {
    fields: [prescriptionsTable.prescribed_by],
    references: [usersTable.id],
    relationName: 'prescribed_prescriptions'
  }),
  dispensedBy: one(usersTable, {
    fields: [prescriptionsTable.dispensed_by],
    references: [usersTable.id],
    relationName: 'dispensed_prescriptions'
  }),
  items: many(prescriptionItemsTable)
}));

export const prescriptionItemsRelations = relations(prescriptionItemsTable, ({ one }) => ({
  prescription: one(prescriptionsTable, {
    fields: [prescriptionItemsTable.prescription_id],
    references: [prescriptionsTable.id]
  }),
  medication: one(medicationsTable, {
    fields: [prescriptionItemsTable.medication_id],
    references: [medicationsTable.id]
  })
}));

export const invoicesRelations = relations(invoicesTable, ({ one, many }) => ({
  patient: one(patientsTable, {
    fields: [invoicesTable.patient_id],
    references: [patientsTable.id]
  }),
  cashier: one(usersTable, {
    fields: [invoicesTable.cashier_id],
    references: [usersTable.id]
  }),
  items: many(invoiceItemsTable)
}));

export const invoiceItemsRelations = relations(invoiceItemsTable, ({ one }) => ({
  invoice: one(invoicesTable, {
    fields: [invoiceItemsTable.invoice_id],
    references: [invoicesTable.id]
  })
}));

// Export all tables
export const tables = {
  users: usersTable,
  patients: patientsTable,
  queue: queueTable,
  medicalRecords: medicalRecordsTable,
  labTests: labTestsTable,
  radiologyExams: radiologyExamsTable,
  medications: medicationsTable,
  prescriptions: prescriptionsTable,
  prescriptionItems: prescriptionItemsTable,
  services: servicesTable,
  invoices: invoicesTable,
  invoiceItems: invoiceItemsTable
};
