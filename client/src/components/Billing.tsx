
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  CreditCard, 
  Plus, 
  Search, 
  DollarSign, 
  Clock,
  CheckCircle,
  FileText,
  Calendar,
  Printer
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, Invoice, Patient, Service, CreateInvoiceInput } from '../../../server/src/schema';

interface BillingProps {
  currentUser: User;
  cardStyles: string;
}

interface InvoiceWithPatient extends Invoice {
  patient?: Patient;
  items?: InvoiceItemData[];
}

interface InvoiceItemData {
  item_type: 'service' | 'medication' | 'lab_test' | 'radiology';
  item_id: number;
  description: string;
  quantity: number;
  unit_price: number;
}

export function Billing({ currentUser, cardStyles }: BillingProps) {
  const [invoices, setInvoices] = useState<InvoiceWithPatient[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithPatient | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  
  const [newInvoice, setNewInvoice] = useState<CreateInvoiceInput>({
    patient_id: 0,
    items: [],
    discount_amount: 0,
    tax_amount: 0,
    notes: null
  });

  const [newItem, setNewItem] = useState<InvoiceItemData>({
    item_type: 'service',
    item_id: 0,
    description: '',
    quantity: 1,
    unit_price: 0
  });

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit_card' | 'debit_card' | 'transfer' | 'insurance'>('cash');

  const loadInvoices = useCallback(async () => {
    try {
      setIsLoading(true);
      const invoicesData = await trpc.getInvoices.query({ 
        status: statusFilter || undefined 
      });
      setInvoices(invoicesData);
    } catch (error) {
      console.error('Failed to load invoices:', error);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  const loadPatients = useCallback(async () => {
    try {
      const patientsData = await trpc.getPatients.query();
      setPatients(patientsData);
    } catch (error) {
      console.error('Failed to load patients:', error);
    }
  }, []);

  const loadServices = useCallback(async () => {
    try {
      const servicesData = await trpc.getServices.query({ active: true });
      setServices(servicesData);
    } catch (error) {
      console.error('Failed to load services:', error);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
    loadPatients();
    loadServices();
  }, [loadInvoices, loadPatients, loadServices]);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await trpc.createInvoice.mutate(newInvoice);
      await loadInvoices();
      setIsCreateDialogOpen(false);
      setNewInvoice({
        patient_id: 0,
        items: [],
        discount_amount: 0,
        tax_amount: 0,
        notes: null
      });
    } catch (error) {
      console.error('Failed to create invoice:', error);
    }
  };

  const handleProcessPayment = async (invoiceId: number) => {
    try {
      await trpc.processPayment.mutate({
        invoiceId,
        paymentMethod,
        cashierId: currentUser.id
      });
      await loadInvoices();
      setIsPaymentDialogOpen(false);
      setSelectedInvoice(null);
    } catch (error) {
      console.error('Failed to process payment:', error);
    }
  };

  const addItemToInvoice = () => {
    const service = services.find(s => s.id === newItem.item_id);
    if (service && newItem.description) {
      const item: InvoiceItemData = {
        ...newItem,
        description: service.name,
        unit_price: service.price
      };
      setNewInvoice((prev: CreateInvoiceInput) => ({
        ...prev,
        items: [...prev.items, item]
      }));
      setNewItem({
        item_type: 'service',
        item_id: 0,
        description: '',
        quantity: 1,
        unit_price: 0
      });
    }
  };

  const removeItemFromInvoice = (index: number) => {
    setNewInvoice((prev: CreateInvoiceInput) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateTotal = () => {
    const subtotal = newInvoice.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    return subtotal - newInvoice.discount_amount + newInvoice.tax_amount;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'partial':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'refunded':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'paid':
        return <CheckCircle className="h-4 w-4" />;
      case 'partial':
        return <FileText className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const filteredInvoices = invoices.filter((invoice: InvoiceWithPatient) =>
    invoice.patient?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const billingStats = {
    totalInvoices: invoices.length,
    pendingPayments: invoices.filter(inv => inv.payment_status === 'pending').length,
    paidInvoices: invoices.filter(inv => inv.payment_status === 'paid').length,
    totalRevenue: invoices.filter(inv => inv.payment_status === 'paid').reduce((sum, inv) => sum + inv.final_amount, 0)
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <CreditCard className="mr-3 h-7 w-7 text-blue-600" />
            Billing & Payments
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage invoices, payments, and financial transactions
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateInvoice} className="space-y-6">
              <div>
                <Label htmlFor="patient_id">Select Patient</Label>
                <Select 
                  value={newInvoice.patient_id > 0 ? newInvoice.patient_id.toString() : 'select-patient'}
                  onValueChange={(value: string) =>
                    setNewInvoice((prev: CreateInvoiceInput) => ({ 
                      ...prev, 
                      patient_id: parseInt(value) 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose patient" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="select-patient" disabled>Choose patient</SelectItem>
                    {patients.map((patient: Patient) => (
                      <SelectItem key={patient.id} value={patient.id.toString()}>
                        {patient.full_name} - {patient.medical_record_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Add Items Section */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-4">Invoice Items</h3>
                
                {/* Add Item Form */}
                <div className="grid grid-cols-5 gap-3 mb-4">
                  <Select 
                    value={newItem.item_type} 
                    onValueChange={(value: 'service' | 'medication' | 'lab_test' | 'radiology') =>
                      setNewItem(prev => ({ ...prev, item_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="medication">Medication</SelectItem>
                      <SelectItem value="lab_test">Lab Test</SelectItem>
                      <SelectItem value="radiology">Radiology</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {newItem.item_type === 'service' && (
                    <Select 
                      value={newItem.item_id > 0 ? newItem.item_id.toString() : 'select-service'}
                      onValueChange={(value: string) => {
                        const service = services.find(s => s.id === parseInt(value));
                        setNewItem(prev => ({ 
                          ...prev, 
                          item_id: parseInt(value),
                          description: service?.name || '',
                          unit_price: service?.price || 0
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="select-service" disabled>Select service</SelectItem>
                        {services.map((service: Service) => (
                          <SelectItem key={service.id} value={service.id.toString()}>
                            {service.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  <Input
                    type="number"
                    placeholder="Quantity"
                    min="1"
                    value={newItem.quantity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))
                    }
                  />
                  
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Unit Price"
                    value={newItem.unit_price}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewItem(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))
                    }
                  />
                  
                  <Button type="button" onClick={addItemToInvoice} disabled={!newItem.item_id}>
                    Add
                  </Button>
                </div>
                
                {/* Items List */}
                {newInvoice.items.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Added Items:</h4>
                    {newInvoice.items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="flex-1">
                          <span className="font-medium">{item.description}</span>
                          <span className="text-sm text-gray-500 ml-2">
                            Qty: {item.quantity} × ${item.unit_price} = ${(item.quantity * item.unit_price).toFixed(2)}
                          </span>
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeItemFromInvoice(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Totals Section */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="discount_amount">Discount Amount</Label>
                  <Input
                    id="discount_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newInvoice.discount_amount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewInvoice((prev: CreateInvoiceInput) => ({ 
                        ...prev, 
                        discount_amount: parseFloat(e.target.value) || 0 
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="tax_amount">Tax Amount</Label>
                  <Input
                    id="tax_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newInvoice.tax_amount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewInvoice((prev: CreateInvoiceInput) => ({ 
                        ...prev, 
                        tax_amount: parseFloat(e.target.value) || 0 
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Total Amount</Label>
                  <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded font-bold text-lg">
                    ${calculateTotal().toFixed(2)}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={newInvoice.items.length === 0}>
                  Create Invoice
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={cardStyles}>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Invoices</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{billingStats.totalInvoices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={cardStyles}>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{billingStats.pendingPayments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={cardStyles}>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Paid</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{billingStats.paidInvoices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={cardStyles}>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${billingStats.totalRevenue.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className={cardStyles}>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search invoices by patient name or invoice number..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-invoices">All Invoices</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card className={cardStyles}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Invoices ({filteredInvoices.length})</span>
            <Badge variant="secondary">{invoices.length} Total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No invoices found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice: InvoiceWithPatient) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{invoice.invoice_number}</p>
                          <p className="text-sm text-gray-500">ID: {invoice.id}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{invoice.patient?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-gray-500">
                            MRN: {invoice.patient?.medical_record_number}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">${invoice.final_amount.toFixed(2)}</p>
                          {invoice.discount_amount > 0 && (
                            <p className="text-sm text-green-600">
                              Discount: -${invoice.discount_amount.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <Badge className={getStatusColor(invoice.payment_status)}>
                            {getStatusIcon(invoice.payment_status)}
                            <span className="ml-1 capitalize">{invoice.payment_status}</span>
                          </Badge>
                          {invoice.payment_method && (
                            <p className="text-xs text-gray-500 mt-1 capitalize">
                              {invoice.payment_method.replace('_', ' ')}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                            <span>Created: {new Date(invoice.created_at).toLocaleDateString()}</span>
                          </div>
                          {invoice.payment_date && (
                            <div className="flex items-center mt-1">
                              <CheckCircle className="h-3 w-3 mr-1 text-green-400" />
                              <span>Paid: {new Date(invoice.payment_date).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          {invoice.payment_status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setIsPaymentDialogOpen(true);
                              }}
                            >
                              Pay
                            </Button>
                          )}
                          <Button variant="ghost" size="sm">
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h3 className="font-semibold">Invoice Details</h3>
                <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                  <div>
                    <span className="text-gray-500">Invoice:</span> {selectedInvoice.invoice_number}
                  </div>
                  <div>
                    <span className="text-gray-500">Patient:</span> {selectedInvoice.patient?.full_name}
                  </div>
                  <div>
                    <span className="text-gray-500">Amount:</span> ${selectedInvoice.final_amount.toFixed(2)}
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span> {selectedInvoice.payment_status}
                  </div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select 
                  value={paymentMethod} 
                  onValueChange={(value: 'cash' | 'credit_card' | 'debit_card' | 'transfer' | 'insurance') =>
                    setPaymentMethod(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="debit_card">Debit Card</SelectItem>
                    <SelectItem value="transfer">Bank Transfer</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsPaymentDialogOpen(false);
                    setSelectedInvoice(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={() => selectedInvoice && handleProcessPayment(selectedInvoice.id)}>
                  Process Payment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
