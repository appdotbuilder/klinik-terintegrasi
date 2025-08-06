
import { db } from '../db';
import { 
  patientsTable, 
  queueTable, 
  labTestsTable, 
  radiologyExamsTable, 
  medicationsTable, 
  invoicesTable 
} from '../db/schema';
import { eq, and, count, sum, lt } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export const getDashboardStats = async (): Promise<{
    totalPatients: number;
    todayQueue: number;
    pendingLabTests: number;
    pendingRadiology: number;
    lowStockMedications: number;
    unpaidInvoices: number;
    todayRevenue: number;
}> => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Total patients count
        const totalPatientsResult = await db
            .select({ count: count() })
            .from(patientsTable)
            .execute();
        const totalPatients = totalPatientsResult[0]?.count || 0;

        // Today's queue count
        const todayQueueResult = await db
            .select({ count: count() })
            .from(queueTable)
            .where(eq(queueTable.queue_date, sql`CURRENT_DATE`))
            .execute();
        const todayQueue = todayQueueResult[0]?.count || 0;

        // Pending lab tests count
        const pendingLabTestsResult = await db
            .select({ count: count() })
            .from(labTestsTable)
            .where(eq(labTestsTable.status, 'ordered'))
            .execute();
        const pendingLabTests = pendingLabTestsResult[0]?.count || 0;

        // Pending radiology exams count
        const pendingRadiologyResult = await db
            .select({ count: count() })
            .from(radiologyExamsTable)
            .where(eq(radiologyExamsTable.status, 'ordered'))
            .execute();
        const pendingRadiology = pendingRadiologyResult[0]?.count || 0;

        // Low stock medications count (stock_quantity <= min_stock_level)
        const lowStockMedicationsResult = await db
            .select({ count: count() })
            .from(medicationsTable)
            .where(sql`${medicationsTable.stock_quantity} <= ${medicationsTable.min_stock_level}`)
            .execute();
        const lowStockMedications = lowStockMedicationsResult[0]?.count || 0;

        // Unpaid invoices count
        const unpaidInvoicesResult = await db
            .select({ count: count() })
            .from(invoicesTable)
            .where(eq(invoicesTable.payment_status, 'pending'))
            .execute();
        const unpaidInvoices = unpaidInvoicesResult[0]?.count || 0;

        // Today's revenue (sum of final_amount for paid invoices today)
        const todayRevenueResult = await db
            .select({ total: sum(invoicesTable.final_amount) })
            .from(invoicesTable)
            .where(
                and(
                    eq(invoicesTable.payment_status, 'paid'),
                    sql`${invoicesTable.payment_date}::date = CURRENT_DATE`
                )
            )
            .execute();
        
        const todayRevenueStr = todayRevenueResult[0]?.total;
        const todayRevenue = todayRevenueStr ? parseFloat(todayRevenueStr) : 0;

        return {
            totalPatients,
            todayQueue,
            pendingLabTests,
            pendingRadiology,
            lowStockMedications,
            unpaidInvoices,
            todayRevenue
        };
    } catch (error) {
        console.error('Dashboard stats retrieval failed:', error);
        throw error;
    }
};
