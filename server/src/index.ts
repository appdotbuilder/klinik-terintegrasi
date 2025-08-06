
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  createUserInputSchema, 
  loginInputSchema, 
  createPatientInputSchema,
  createQueueInputSchema,
  createMedicalRecordInputSchema,
  createLabTestInputSchema,
  createRadiologyExamInputSchema,
  createMedicationInputSchema,
  createPrescriptionInputSchema,
  createServiceInputSchema,
  createInvoiceInputSchema,
  reportRequestSchema,
  queueStatusEnum,
  labTestStatusEnum,
  radiologyStatusEnum,
  paymentMethodEnum
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { authenticateUser } from './handlers/authenticate_user';
import { createPatient } from './handlers/create_patient';
import { getPatients } from './handlers/get_patients';
import { createQueue } from './handlers/create_queue';
import { getQueue } from './handlers/get_queue';
import { updateQueueStatus } from './handlers/update_queue_status';
import { createMedicalRecord } from './handlers/create_medical_record';
import { getMedicalRecords } from './handlers/get_medical_records';
import { createLabTest } from './handlers/create_lab_test';
import { getLabTests } from './handlers/get_lab_tests';
import { updateLabTest } from './handlers/update_lab_test';
import { createRadiologyExam } from './handlers/create_radiology_exam';
import { getRadiologyExams } from './handlers/get_radiology_exams';
import { updateRadiologyExam } from './handlers/update_radiology_exam';
import { createMedication } from './handlers/create_medication';
import { getMedications } from './handlers/get_medications';
import { updateMedicationStock } from './handlers/update_medication_stock';
import { createPrescription } from './handlers/create_prescription';
import { getPrescriptions } from './handlers/get_prescriptions';
import { dispensePrescription } from './handlers/dispense_prescription';
import { createService } from './handlers/create_service';
import { getServices } from './handlers/get_services';
import { createInvoice } from './handlers/create_invoice';
import { getInvoices } from './handlers/get_invoices';
import { processPayment } from './handlers/process_payment';
import { generateReport } from './handlers/generate_report';
import { getDashboardStats } from './handlers/get_dashboard_stats';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User Management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  authenticateUser: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => authenticateUser(input)),

  // Patient Management
  createPatient: publicProcedure
    .input(createPatientInputSchema)
    .mutation(({ input }) => createPatient(input)),
  
  getPatients: publicProcedure
    .query(() => getPatients()),

  // Queue Management
  createQueue: publicProcedure
    .input(createQueueInputSchema)
    .mutation(({ input }) => createQueue(input)),
  
  getQueue: publicProcedure
    .input(z.object({ date: z.string().optional() }))
    .query(({ input }) => getQueue(input.date)),
  
  updateQueueStatus: publicProcedure
    .input(z.object({ id: z.number(), status: queueStatusEnum }))
    .mutation(({ input }) => updateQueueStatus(input.id, input.status)),

  // Medical Records
  createMedicalRecord: publicProcedure
    .input(createMedicalRecordInputSchema)
    .mutation(({ input }) => createMedicalRecord(input)),
  
  getMedicalRecords: publicProcedure
    .input(z.object({ patientId: z.number().optional() }))
    .query(({ input }) => getMedicalRecords(input.patientId)),

  // Laboratory Tests
  createLabTest: publicProcedure
    .input(createLabTestInputSchema)
    .mutation(({ input }) => createLabTest(input)),
  
  getLabTests: publicProcedure
    .input(z.object({ patientId: z.number().optional(), status: z.string().optional() }))
    .query(({ input }) => getLabTests(input.patientId, input.status)),
  
  updateLabTest: publicProcedure
    .input(z.object({ 
      id: z.number(), 
      updates: z.object({
        status: labTestStatusEnum.optional(),
        technician_id: z.number().optional(),
        results: z.string().optional()
      })
    }))
    .mutation(({ input }) => updateLabTest(input.id, input.updates)),

  // Radiology Exams
  createRadiologyExam: publicProcedure
    .input(createRadiologyExamInputSchema)
    .mutation(({ input }) => createRadiologyExam(input)),
  
  getRadiologyExams: publicProcedure
    .input(z.object({ patientId: z.number().optional(), status: z.string().optional() }))
    .query(({ input }) => getRadiologyExams(input.patientId, input.status)),
  
  updateRadiologyExam: publicProcedure
    .input(z.object({ 
      id: z.number(), 
      updates: z.object({
        status: radiologyStatusEnum.optional(),
        radiologist_id: z.number().optional(),
        findings: z.string().optional(),
        impression: z.string().optional(),
        recommendations: z.string().optional()
      })
    }))
    .mutation(({ input }) => updateRadiologyExam(input.id, input.updates)),

  // Medication Management
  createMedication: publicProcedure
    .input(createMedicationInputSchema)
    .mutation(({ input }) => createMedication(input)),
  
  getMedications: publicProcedure
    .input(z.object({ lowStock: z.boolean().optional() }))
    .query(({ input }) => getMedications(input.lowStock)),
  
  updateMedicationStock: publicProcedure
    .input(z.object({ 
      id: z.number(), 
      quantity: z.number(), 
      operation: z.enum(['add', 'subtract']) 
    }))
    .mutation(({ input }) => updateMedicationStock(input.id, input.quantity, input.operation)),

  // Prescriptions
  createPrescription: publicProcedure
    .input(createPrescriptionInputSchema)
    .mutation(({ input }) => createPrescription(input)),
  
  getPrescriptions: publicProcedure
    .input(z.object({ patientId: z.number().optional(), status: z.string().optional() }))
    .query(({ input }) => getPrescriptions(input.patientId, input.status)),
  
  dispensePrescription: publicProcedure
    .input(z.object({ id: z.number(), dispensedBy: z.number() }))
    .mutation(({ input }) => dispensePrescription(input.id, input.dispensedBy)),

  // Services
  createService: publicProcedure
    .input(createServiceInputSchema)
    .mutation(({ input }) => createService(input)),
  
  getServices: publicProcedure
    .input(z.object({ category: z.string().optional(), active: z.boolean().optional() }))
    .query(({ input }) => getServices(input.category, input.active)),

  // Billing & Invoices
  createInvoice: publicProcedure
    .input(createInvoiceInputSchema)
    .mutation(({ input }) => createInvoice(input)),
  
  getInvoices: publicProcedure
    .input(z.object({ patientId: z.number().optional(), status: z.string().optional() }))
    .query(({ input }) => getInvoices(input.patientId, input.status)),
  
  processPayment: publicProcedure
    .input(z.object({ 
      invoiceId: z.number(), 
      paymentMethod: paymentMethodEnum, 
      cashierId: z.number() 
    }))
    .mutation(({ input }) => processPayment(input.invoiceId, input.paymentMethod, input.cashierId)),

  // Reports & Analytics
  generateReport: publicProcedure
    .input(reportRequestSchema)
    .mutation(({ input }) => generateReport(input)),
  
  getDashboardStats: publicProcedure
    .query(() => getDashboardStats()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`🏥 Clinic Management System TRPC server listening at port: ${port}`);
}

start();
