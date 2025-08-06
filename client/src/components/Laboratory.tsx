
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  TestTube, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle, 
  XCircle,
  Activity,
  FileText,
  Calendar
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User as UserType, LabTest, Patient, CreateLabTestInput } from '../../../server/src/schema';

interface LaboratoryProps {
  currentUser: UserType;
  cardStyles: string;
}

interface LabTestWithPatient extends LabTest {
  patient?: Patient;
  orderedByUser?: UserType;
  technician?: UserType;
}

interface TestUpdate {
  status?: 'ordered' | 'in_progress' | 'completed' | 'cancelled';
  technician_id?: number;
  results?: string;
}

export function Laboratory({ currentUser, cardStyles }: LaboratoryProps) {
  const [labTests, setLabTests] = useState<LabTestWithPatient[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<LabTestWithPatient | null>(null);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  
  const [newTest, setNewTest] = useState<CreateLabTestInput>({
    patient_id: 0,
    medical_record_id: null,
    test_name: '',
    test_type: '',
    ordered_by: currentUser.id,
    reference_values: null,
    notes: null
  });

  const [testResults, setTestResults] = useState({
    results: '',
    technician_id: currentUser.id
  });

  const loadLabTests = useCallback(async () => {
    try {
      setIsLoading(true);
      const tests = await trpc.getLabTests.query({ 
        status: statusFilter || undefined 
      });
      setLabTests(tests);
    } catch (error) {
      console.error('Failed to load lab tests:', error);
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

  useEffect(() => {
    loadLabTests();
    loadPatients();
  }, [loadLabTests, loadPatients]);

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await trpc.createLabTest.mutate(newTest);
      await loadLabTests();
      setIsCreateDialogOpen(false);
      setNewTest({
        patient_id: 0,
        medical_record_id: null,
        test_name: '',
        test_type: '',
        ordered_by: currentUser.id,
        reference_values: null,
        notes: null
      });
    } catch (error) {
      console.error('Failed to create lab test:', error);
    }
  };

  const handleUpdateTest = async (testId: number, updates: TestUpdate) => {
    try {
      await trpc.updateLabTest.mutate({ id: testId, updates });
      await loadLabTests();
    } catch (error) {
      console.error('Failed to update lab test:', error);
    }
  };

  const handleSubmitResults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTest) return;
    
    try {
      await handleUpdateTest(selectedTest.id, {
        status: 'completed',
        technician_id: testResults.technician_id,
        results: testResults.results
      });
      setIsResultDialogOpen(false);
      setTestResults({ results: '', technician_id: currentUser.id });
      setSelectedTest(null);
    } catch (error) {
      console.error('Failed to submit results:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ordered':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ordered':
        return <FileText className="h-4 w-4" />;
      case 'in_progress':
        return <Activity className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const filteredTests = labTests.filter((test: LabTestWithPatient) =>
    test.test_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    test.test_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (test.patient?.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const testStats = {
    ordered: labTests.filter(test => test.status === 'ordered').length,
    inProgress: labTests.filter(test => test.status === 'in_progress').length,
    completed: labTests.filter(test => test.status === 'completed').length,
    cancelled: labTests.filter(test => test.status === 'cancelled').length
  };

  const commonTestTypes = [
    'Blood Test', 'Urine Test', 'Stool Test', 'Sputum Test',
    'Complete Blood Count (CBC)', 'Blood Sugar', 'Lipid Profile',
    'Liver Function Test', 'Kidney Function Test', 'Thyroid Function Test',
    'Hemoglobin A1C', 'Cholesterol', 'Triglycerides', 'Creatinine'
  ];

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
            <TestTube className="mr-3 h-7 w-7 text-blue-600" />
            Laboratory Tests
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage laboratory tests and results
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
              <Plus className="mr-2 h-4 w-4" />
              Order Test
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Order New Lab Test</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTest} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="patient_id">Select Patient</Label>
                  <Select 
                    value={newTest.patient_id > 0 ? newTest.patient_id.toString() : 'choose-patient'}
                    onValueChange={(value: string) =>
                      setNewTest((prev: CreateLabTestInput) => ({ 
                        ...prev, 
                        patient_id: parseInt(value) 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose patient" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="choose-patient" disabled>Choose patient</SelectItem>
                      {patients.map((patient: Patient) => (
                        <SelectItem key={patient.id} value={patient.id.toString()}>
                          {patient.full_name} - {patient.medical_record_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="test_type">Test Type</Label>
                  <Select 
                    value={newTest.test_type || 'select-test-type'}
                    onValueChange={(value: string) =>
                      setNewTest((prev: CreateLabTestInput) => ({ 
                        ...prev, 
                        test_type: value 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select test type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="select-test-type" disabled>Select test type</SelectItem>
                      {commonTestTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="test_name">Test Name</Label>
                <Input
                  id="test_name"
                  value={newTest.test_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewTest((prev: CreateLabTestInput) => ({ 
                      ...prev, 
                      test_name: e.target.value 
                    }))
                  }
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="reference_values">Reference Values</Label>
                <Input
                  id="reference_values"
                  placeholder="Normal range or reference values"
                  value={newTest.reference_values || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewTest((prev: CreateLabTestInput) => ({ 
                      ...prev, 
                      reference_values: e.target.value || null 
                    }))
                  }
                />
              </div>
              
              <div>
                <Label htmlFor="notes">Clinical Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes or instructions"
                  value={newTest.notes || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setNewTest((prev: CreateLabTestInput) => ({ 
                      ...prev, 
                      notes: e.target.value || null 
                    }))
                  }
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Order Test
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
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Ordered</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{testStats.ordered}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={cardStyles}>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <Activity className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">In Progress</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{testStats.inProgress}</p>
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
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{testStats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={cardStyles}>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Cancelled</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{testStats.cancelled}</p>
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
                placeholder="Search tests by name, type, or patient..."
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
                <SelectItem value="all-tests">All Tests</SelectItem>
                <SelectItem value="ordered">Ordered</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tests Table */}
      <Card className={cardStyles}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Laboratory Tests ({filteredTests.length})</span>
            <Badge variant="secondary">{labTests.length} Total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient & Test</TableHead>
                  <TableHead>Type & Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <TestTube className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No lab tests found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTests.map((test: LabTestWithPatient) => (
                    <TableRow key={test.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{test.patient?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-gray-500">MRN: {test.patient?.medical_record_number}</p>
                          <p className="text-sm font-medium text-blue-600">{test.test_name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{test.test_type}</p>
                          {test.reference_values && (
                            <p className="text-sm text-gray-500">Ref: {test.reference_values}</p>
                          )}
                          {test.notes && (
                            <p className="text-xs text-gray-400 mt-1">{test.notes}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(test.status)}>
                          {getStatusIcon(test.status)}
                          <span className="ml-1 capitalize">{test.status.replace('_', ' ')}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                            <span>Ordered: {new Date(test.ordered_at).toLocaleDateString()}</span>
                          </div>
                          {test.completed_at && (
                            <div className="flex items-center mt-1">
                              <CheckCircle className="h-3 w-3 mr-1 text-green-400" />
                              <span>Completed: {new Date(test.completed_at).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          {test.status === 'ordered' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateTest(test.id, { status: 'in_progress' })}
                            >
                              Start
                            </Button>
                          )}
                          {test.status === 'in_progress' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedTest(test);
                                setIsResultDialogOpen(true);
                              }}
                            >
                              Results
                            </Button>
                          )}
                          {test.status === 'completed' && test.results && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTest(test);
                                setTestResults({ results: test.results || '', technician_id: test.technician_id || 0 });
                                setIsResultDialogOpen(true);
                              }}
                            >
                              View
                            </Button>
                          )}
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

      {/* Results Dialog */}
      <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedTest?.status === 'completed' ? 'Test Results' : 'Enter Test Results'}
            </DialogTitle>
          </DialogHeader>
          {selectedTest && (
            <form onSubmit={handleSubmitResults} className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h3 className="font-semibold">Test Information</h3>
                <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                  <div>
                    <span className="text-gray-500">Patient:</span> {selectedTest.patient?.full_name}
                  </div>
                  <div>
                    <span className="text-gray-500">Test:</span> {selectedTest.test_name}
                  </div>
                  <div>
                    <span className="text-gray-500">Type:</span> {selectedTest.test_type}
                  </div>
                  <div>
                    <span className="text-gray-500">Ordered:</span> {new Date(selectedTest.ordered_at).toLocaleDateString()}
                  </div>
                </div>
                {selectedTest.reference_values && (
                  <div className="mt-2 text-sm">
                    <span className="text-gray-500">Reference Values:</span> {selectedTest.reference_values}
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="results">Test Results</Label>
                <Textarea
                  id="results"
                  rows={6}
                  placeholder="Enter detailed test results here..."
                  value={testResults.results}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setTestResults((prev) => ({ ...prev, results: e.target.value }))
                  }
                  required
                  disabled={selectedTest.status === 'completed'}
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsResultDialogOpen(false);
                    setSelectedTest(null);
                    setTestResults({ results: '', technician_id: currentUser.id });
                  }}
                >
                  {selectedTest.status === 'completed' ? 'Close' : 'Cancel'}
                </Button>
                {selectedTest.status !== 'completed' && (
                  <Button type="submit">
                    Submit Results
                  </Button>
                )}
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
