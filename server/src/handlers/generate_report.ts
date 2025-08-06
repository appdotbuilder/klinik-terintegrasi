
import { db } from '../db';
import { 
  patientsTable, 
  invoicesTable, 
  medicationsTable, 
  queueTable, 
  medicalRecordsTable,
  usersTable,
  labTestsTable,
  radiologyExamsTable
} from '../db/schema';
import { type ReportRequest } from '../schema';
import { and, gte, lte, eq, count, sum, avg, desc } from 'drizzle-orm';
import { SQL } from 'drizzle-orm';

export const generateReport = async (input: ReportRequest): Promise<{ reportUrl: string; fileName: string; }> => {
  try {
    let reportData: any = {};
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${input.report_type}_${timestamp}.${input.format}`;

    // Build date range conditions
    const dateConditions: SQL<unknown>[] = [];
    
    switch (input.report_type) {
      case 'patient_summary':
        // Get patient registration statistics
        dateConditions.push(gte(patientsTable.created_at, input.start_date));
        dateConditions.push(lte(patientsTable.created_at, input.end_date));

        const patientQuery = db.select({
          total_patients: count(),
          gender_male: count(), // Will need separate queries for gender breakdown
          gender_female: count()
        }).from(patientsTable);

        if (dateConditions.length > 0) {
          patientQuery.where(and(...dateConditions));
        }

        const patientStats = await patientQuery.execute();
        
        // Get gender breakdown with separate queries
        const malePatients = await db.select({ count: count() })
          .from(patientsTable)
          .where(and(
            eq(patientsTable.gender, 'male'),
            gte(patientsTable.created_at, input.start_date),
            lte(patientsTable.created_at, input.end_date)
          )).execute();

        const femalePatients = await db.select({ count: count() })
          .from(patientsTable)
          .where(and(
            eq(patientsTable.gender, 'female'),
            gte(patientsTable.created_at, input.start_date),
            lte(patientsTable.created_at, input.end_date)
          )).execute();

        reportData = {
          total_patients: patientStats[0]?.total_patients || 0,
          male_patients: malePatients[0]?.count || 0,
          female_patients: femalePatients[0]?.count || 0,
          date_range: { start: input.start_date, end: input.end_date }
        };
        break;

      case 'financial_summary':
        // Get financial data from invoices
        const financialConditions: SQL<unknown>[] = [
          gte(invoicesTable.created_at, input.start_date),
          lte(invoicesTable.created_at, input.end_date)
        ];

        const financialStats = await db.select({
          total_revenue: sum(invoicesTable.final_amount),
          total_invoices: count(),
          average_invoice_amount: avg(invoicesTable.final_amount)
        })
        .from(invoicesTable)
        .where(and(...financialConditions))
        .execute();

        // Get payment status breakdown
        const paidInvoices = await db.select({ 
          count: count(),
          total_amount: sum(invoicesTable.final_amount)
        })
        .from(invoicesTable)
        .where(and(
          eq(invoicesTable.payment_status, 'paid'),
          ...financialConditions
        ))
        .execute();

        const pendingInvoices = await db.select({ 
          count: count(),
          total_amount: sum(invoicesTable.final_amount)
        })
        .from(invoicesTable)
        .where(and(
          eq(invoicesTable.payment_status, 'pending'),
          ...financialConditions
        ))
        .execute();

        reportData = {
          total_revenue: parseFloat(financialStats[0]?.total_revenue || '0'),
          total_invoices: financialStats[0]?.total_invoices || 0,
          average_invoice: parseFloat(financialStats[0]?.average_invoice_amount || '0'),
          paid_invoices: paidInvoices[0]?.count || 0,
          paid_amount: parseFloat(paidInvoices[0]?.total_amount || '0'),
          pending_invoices: pendingInvoices[0]?.count || 0,
          pending_amount: parseFloat(pendingInvoices[0]?.total_amount || '0'),
          date_range: { start: input.start_date, end: input.end_date }
        };
        break;

      case 'inventory_report':
        // Get medication inventory data
        const medicationStats = await db.select({
          total_medications: count(),
          low_stock_items: count(), // Will filter separately
          total_stock_value: sum(medicationsTable.price)
        })
        .from(medicationsTable)
        .execute();

        // Get low stock medications
        const lowStockMeds = await db.select({
          id: medicationsTable.id,
          name: medicationsTable.name,
          stock_quantity: medicationsTable.stock_quantity,
          min_stock_level: medicationsTable.min_stock_level,
          price: medicationsTable.price
        })
        .from(medicationsTable)
        .where(lte(medicationsTable.stock_quantity, medicationsTable.min_stock_level))
        .execute();

        reportData = {
          total_medications: medicationStats[0]?.total_medications || 0,
          low_stock_count: lowStockMeds.length,
          total_stock_value: parseFloat(medicationStats[0]?.total_stock_value || '0'),
          low_stock_items: lowStockMeds.map(med => ({
            ...med,
            price: parseFloat(med.price)
          })),
          date_range: { start: input.start_date, end: input.end_date }
        };
        break;

      case 'appointment_report':
        // Get queue/appointment statistics
        const appointmentConditions: SQL<unknown>[] = [
          gte(queueTable.created_at, input.start_date),
          lte(queueTable.created_at, input.end_date)
        ];

        const appointmentStats = await db.select({
          total_appointments: count()
        })
        .from(queueTable)
        .where(and(...appointmentConditions))
        .execute();

        // Get status breakdown
        const completedAppointments = await db.select({ count: count() })
          .from(queueTable)
          .where(and(
            eq(queueTable.status, 'completed'),
            ...appointmentConditions
          ))
          .execute();

        const waitingAppointments = await db.select({ count: count() })
          .from(queueTable)
          .where(and(
            eq(queueTable.status, 'waiting'),
            ...appointmentConditions
          ))
          .execute();

        const cancelledAppointments = await db.select({ count: count() })
          .from(queueTable)
          .where(and(
            eq(queueTable.status, 'cancelled'),
            ...appointmentConditions
          ))
          .execute();

        reportData = {
          total_appointments: appointmentStats[0]?.total_appointments || 0,
          completed: completedAppointments[0]?.count || 0,
          waiting: waitingAppointments[0]?.count || 0,
          cancelled: cancelledAppointments[0]?.count || 0,
          date_range: { start: input.start_date, end: input.end_date }
        };
        break;

      case 'medical_statistics':
        // Get medical record statistics
        const medicalConditions: SQL<unknown>[] = [
          gte(medicalRecordsTable.created_at, input.start_date),
          lte(medicalRecordsTable.created_at, input.end_date)
        ];

        const medicalStats = await db.select({
          total_visits: count()
        })
        .from(medicalRecordsTable)
        .where(and(...medicalConditions))
        .execute();

        // Get lab test statistics
        const labStats = await db.select({
          total_lab_tests: count()
        })
        .from(labTestsTable)
        .where(and(
          gte(labTestsTable.created_at, input.start_date),
          lte(labTestsTable.created_at, input.end_date)
        ))
        .execute();

        // Get radiology statistics  
        const radiologyStats = await db.select({
          total_radiology_exams: count()
        })
        .from(radiologyExamsTable)
        .where(and(
          gte(radiologyExamsTable.created_at, input.start_date),
          lte(radiologyExamsTable.created_at, input.end_date)
        ))
        .execute();

        reportData = {
          total_visits: medicalStats[0]?.total_visits || 0,
          total_lab_tests: labStats[0]?.total_lab_tests || 0,
          total_radiology_exams: radiologyStats[0]?.total_radiology_exams || 0,
          date_range: { start: input.start_date, end: input.end_date }
        };
        break;

      default:
        throw new Error(`Unsupported report type: ${input.report_type}`);
    }

    // In a real implementation, you would:
    // 1. Format the reportData based on input.format (PDF/Excel)
    // 2. Generate the actual file using libraries like puppeteer (PDF) or exceljs (Excel)
    // 3. Save to file system or cloud storage
    // 4. Return actual download URL

    const reportUrl = `/reports/${fileName}`;

    return {
      reportUrl,
      fileName
    };

  } catch (error) {
    console.error('Report generation failed:', error);
    throw error;
  }
};
