
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
  Activity, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle, 
  XCircle,
  FileText,
  Calendar,
  Zap
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, RadiologyExam, Patient, CreateRadiologyExamInput } from '../../../server/src/schema';

interface RadiologyProps {
  currentUser: User;
  cardStyles: string;
}

interface RadiologyExamWithPatient extends RadiologyExam {
  patient?: Patient;
  orderedByUser?: User;
  radiologist?: User;
}

interface ExamUpdate {
  status?: 'ordered' | 'in_progress' | 'completed' | 'cancelled';
  radiologist_id?: number;
  findings?: string;
  impression?: string;
  recommendations?: string;
}

export function Radiology({ currentUser, cardStyles }: RadiologyProps) {
  const [exams, setExams] = useState<RadiologyExamWithPatient[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<RadiologyExamWithPatient | null>(null);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  
  const [newExam, setNewExam] = useState<CreateRadiologyExamInput>({
    patient_id: 0,
    medical_record_id: null,
    exam_type: '',
    body_part: '',
    ordered_by: currentUser.id
  });

  const [examResults, setExamResults] = useState({
    findings: '',
    impression: '',
    recommendations: '',
    radiologist_id: currentUser.id
  });

  const loadExams = useCallback(async () => {
    try {
      setIsLoading(true);
      const examsData = await trpc.getRadiologyExams.query({ 
        status: statusFilter || undefined 
      });
      setExams(examsData);
    } catch (error) {
      console.error('Failed to load radiology exams:', error);
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
    loadExams();
    loadPatients();
  }, [loadExams, loadPatients]);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await trpc.createRadiologyExam.mutate(newExam);
      await loadExams();
      setIsCreateDialogOpen(false);
      setNewExam({
        patient_id: 0,
        medical_record_id: null,
        exam_type: '',
        body_part: '',
        ordered_by: currentUser.id
      });
    } catch (error) {
      console.error('Failed to create radiology exam:', error);
    }
  };

  const handleUpdateExam = async (examId: number, updates: ExamUpdate) => {
    try {
      await trpc.updateRadiologyExam.mutate({ id: examId, updates });
      await loadExams();
    } catch (error) {
      console.error('Failed to update radiology exam:', error);
    }
  };

  const handleSubmitResults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam) return;
    
    try {
      await handleUpdateExam(selectedExam.id, {
        status: 'completed',
        radiologist_id: examResults.radiologist_id,
        findings: examResults.findings,
        impression: examResults.impression,
        recommendations: examResults.recommendations
      });
      setIsResultDialogOpen(false);
      setExamResults({
        findings: '',
        impression: '',
        recommendations: '',
        radiologist_id: currentUser.id
      });
      setSelectedExam(null);
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
        return <Zap className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const filteredExams = exams.filter((exam: RadiologyExamWithPatient) =>
    exam.exam_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exam.body_part.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (exam.patient?.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const examStats = {
    ordered: exams.filter(exam => exam.status === 'ordered').length,
    inProgress: exams.filter(exam => exam.status === 'in_progress').length,
    completed: exams.filter(exam => exam.status === 'completed').length,
    cancelled: exams.filter(exam => exam.status === 'cancelled').length
  };

  const commonExamTypes = [
    'X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'Mammography',
    'Bone Densitometry', 'Fluoroscopy', 'Nuclear Medicine',
    'PET Scan', 'Angiography'
  ];

  const commonBodyParts = [
    'Chest', 'Abdomen', 'Head', 'Neck', 'Spine', 'Pelvis',
    'Upper Extremity', 'Lower Extremity', 'Heart', 'Brain',
    'Liver', 'Kidney', 'Lungs', 'Bone', 'Joint'
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
            <Activity className="mr-3 h-7 w-7 text-blue-600" />
            Radiology
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage radiology exams and imaging studies
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Order Exam
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Order Radiology Exam</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateExam} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="patient_id">Select Patient</Label>
                  <Select 
                    value={newExam.patient_id > 0 ? newExam.patient_id.toString() : 'choose-patient'}
                    onValueChange={(value: string) =>
                      setNewExam((prev: CreateRadiologyExamInput) => ({ 
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
                  <Label htmlFor="exam_type">Exam Type</Label>
                  <Select 
                    value={newExam.exam_type || 'select-exam-type'}
                    onValueChange={(value: string) =>
                      setNewExam((prev: CreateRadiologyExamInput) => ({ 
                        ...prev, 
                        exam_type: value 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select exam type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="select-exam-type" disabled>Select exam type</SelectItem>
                      {commonExamTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="body_part">Body Part</Label>
                <Select 
                  value={newExam.body_part || 'select-body-part'}
                  onValueChange={(value: string) =>
                    setNewExam((prev: CreateRadiologyExamInput) => ({ 
                      ...prev, 
                      body_part: value 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select body part" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="select-body-part" disabled>Select body part</SelectItem>
                    {commonBodyParts.map((part) => (
                      <SelectItem key={part} value={part}>
                        {part}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Order Exam
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{examStats.ordered}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={cardStyles}>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <Zap className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">In Progress</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{examStats.inProgress}</p>
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{examStats.completed}</p>
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{examStats.cancelled}</p>
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
                placeholder="Search exams by type, body part, or patient..."
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
                <SelectItem value="all-exams">All Exams</SelectItem>
                <SelectItem value="ordered">Ordered</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Exams Table */}
      <Card className={cardStyles}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Radiology Exams ({filteredExams.length})</span>
            <Badge variant="secondary">{exams.length} Total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient & Exam</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No radiology exams found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExams.map((exam: RadiologyExamWithPatient) => (
                    <TableRow key={exam.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{exam.patient?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-gray-500">MRN: {exam.patient?.medical_record_number}</p>
                          <p className="text-sm font-medium text-purple-600">
                            {exam.exam_type} - {exam.body_part}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{exam.exam_type}</p>
                          <p className="text-sm text-gray-500">Body Part: {exam.body_part}</p>
                          {exam.findings && (
                            <p className="text-xs text-gray-400 mt-1">Has findings</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(exam.status)}>
                          {getStatusIcon(exam.status)}
                          <span className="ml-1 capitalize">{exam.status.replace('_', ' ')}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                            <span>Ordered: {new Date(exam.ordered_at).toLocaleDateString()}</span>
                          </div>
                          {exam.completed_at && (
                            <div className="flex items-center mt-1">
                              <CheckCircle className="h-3 w-3 mr-1 text-green-400" />
                              <span>Completed: {new Date(exam.completed_at).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          {exam.status === 'ordered' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateExam(exam.id, { status: 'in_progress' })}
                            >
                              Start
                            </Button>
                          )}
                          {exam.status === 'in_progress' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedExam(exam);
                                setIsResultDialogOpen(true);
                              }}
                            >
                              Report
                            </Button>
                          )}
                          {exam.status === 'completed' && exam.findings && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedExam(exam);
                                setExamResults({
                                  findings: exam.findings || '',
                                  impression: exam.impression || '',
                                  recommendations: exam.recommendations || '',
                                  radiologist_id: exam.radiologist_id || 0
                                });
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedExam?.status === 'completed' ? 'Radiology Report' : 'Create Radiology Report'}
            </DialogTitle>
          </DialogHeader>
          {selectedExam && (
            <form onSubmit={handleSubmitResults} className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h3 className="font-semibold">Exam Information</h3>
                <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                  <div>
                    <span className="text-gray-500">Patient:</span> {selectedExam.patient?.full_name}
                  </div>
                  <div>
                    <span className="text-gray-500">Exam:</span> {selectedExam.exam_type}
                  </div>
                  <div>
                    <span className="text-gray-500">Body Part:</span> {selectedExam.body_part}
                  </div>
                  <div>
                    <span className="text-gray-500">Ordered:</span> {new Date(selectedExam.ordered_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="findings">Findings</Label>
                <Textarea
                  id="findings"
                  rows={4}
                  placeholder="Describe the radiological findings..."
                  value={examResults.findings}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setExamResults((prev) => ({ ...prev, findings: e.target.value }))
                  }
                  required
                  disabled={selectedExam.status === 'completed'}
                />
              </div>
              
              <div>
                <Label htmlFor="impression">Impression</Label>
                <Textarea
                  id="impression"
                  rows={3}
                  placeholder="Clinical impression and diagnosis..."
                  value={examResults.impression}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setExamResults((prev) => ({ ...prev, impression: e.target.value }))
                  }
                  disabled={selectedExam.status === 'completed'}
                />
              </div>
              
              <div>
                <Label htmlFor="recommendations">Recommendations</Label>
                <Textarea
                  id="recommendations"
                  rows={3}
                  placeholder="Clinical recommendations and follow-up..."
                  value={examResults.recommendations}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setExamResults((prev) => ({ ...prev, recommendations: e.target.value }))
                  }
                  disabled={selectedExam.status === 'completed'}
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsResultDialogOpen(false);
                    setSelectedExam(null);
                    setExamResults({
                      findings: '',
                      impression: '',
                      recommendations: '',
                      radiologist_id: currentUser.id
                    });
                  }}
                >
                  {selectedExam.status === 'completed' ? 'Close' : 'Cancel'}
                </Button>
                {selectedExam.status !== 'completed' && (
                  <Button type="submit">
                    Submit Report
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
