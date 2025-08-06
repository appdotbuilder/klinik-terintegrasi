
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  Plus, 
  Search, 
  User, 
  Calendar,
  Stethoscope,
  Eye,
  Edit,
  Printer
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User as UserType, MedicalRecord, Patient, CreateMedicalRecordInput } from '../../../server/src/schema';

interface MedicalRecordsProps {
  currentUser: UserType;
  cardStyles: string;
}

interface MedicalRecordWithPatient extends MedicalRecord {
  patient?: Patient;
  doctor?: UserType;
}

export function MedicalRecords({ currentUser, cardStyles }: MedicalRecordsProps) {
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecordWithPatient[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecordWithPatient | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  
  const [newRecord, setNewRecord] = useState<CreateMedicalRecordInput>({
    patient_id: 0,
    doctor_id: currentUser.id,
    chief_complaint: '',
    present_illness: null,
    physical_examination: null,
    diagnosis: '',
    treatment_plan: null,
    prescription: null,
    notes: null
  });

  const loadMedicalRecords = useCallback(async () => {
    try {
      setIsLoading(true);
      const records = await trpc.getMedicalRecords.query({});
      setMedicalRecords(records);
    } catch (error) {
      console.error('Failed to load medical records:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadPatients = useCallback(async () => {
    try {
      const patientsData = await trpc.getPatients.query();
      setPatients(patientsData);
    } catch (error) {
      console.error('Failed to load patients:', error);
    }
  }, []);

  useEffect(() => {
    loadMedicalRecords();
    loadPatients();
  }, [loadMedicalRecords, loadPatients]);

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await trpc.createMedicalRecord.mutate(newRecord);
      await loadMedicalRecords();
      setIsCreateDialogOpen(false);
      setNewRecord({
        patient_id: 0,
        doctor_id: currentUser.id,
        chief_complaint: '',
        present_illness: null,
        physical_examination: null,
        diagnosis: '',
        treatment_plan: null,
        prescription: null,
        notes: null
      });
    } catch (error) {
      console.error('Failed to create medical record:', error);
    }
  };

  const filteredRecords = medicalRecords.filter((record: MedicalRecordWithPatient) =>
    record.patient?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.chief_complaint.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.diagnosis.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
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
            <FileText className="mr-3 h-7 w-7 text-blue-600" />
            Medical Records
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Electronic medical records and patient history
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              New Record
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Medical Record</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateRecord} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="patient_id">Select Patient</Label>
                  <Select 
                    value={newRecord.patient_id > 0 ? newRecord.patient_id.toString() : 'choose-patient'}
                    onValueChange={(value: string) =>
                      setNewRecord((prev: CreateMedicalRecordInput) => ({ 
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
                  <Label>Attending Physician</Label>
                  <Input value={currentUser.full_name} disabled />
                </div>
              </div>
              
              <div>
                <Label htmlFor="chief_complaint">Chief Complaint *</Label>
                <Textarea
                  id="chief_complaint"
                  placeholder="Patient's primary concern or reason for visit"
                  value={newRecord.chief_complaint}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setNewRecord((prev: CreateMedicalRecordInput) => ({ 
                      ...prev, 
                      chief_complaint: e.target.value 
                    }))
                  }
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="present_illness">History of Present Illness</Label>
                <Textarea
                  id="present_illness"
                  placeholder="Detailed description of the current illness"
                  rows={4}
                  value={newRecord.present_illness || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setNewRecord((prev: CreateMedicalRecordInput) => ({ 
                      ...prev, 
                      present_illness: e.target.value || null 
                    }))
                  }
                />
              </div>
              
              <div>
                <Label htmlFor="physical_examination">Physical Examination</Label>
                <Textarea
                  id="physical_examination"
                  placeholder="Physical examination findings"
                  rows={4}
                  value={newRecord.physical_examination || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setNewRecord((prev: CreateMedicalRecordInput) => ({ 
                      ...prev, 
                      physical_examination: e.target.value || null 
                    }))
                  }
                />
              </div>
              
              <div>
                <Label htmlFor="diagnosis">Diagnosis *</Label>
                <Textarea
                  id="diagnosis"
                  placeholder="Primary and secondary diagnoses"
                  value={newRecord.diagnosis}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setNewRecord((prev: CreateMedicalRecordInput) => ({ 
                      ...prev, 
                      diagnosis: e.target.value 
                    }))
                  }
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="treatment_plan">Treatment Plan</Label>
                <Textarea
                  id="treatment_plan"
                  placeholder="Recommended treatments and procedures"
                  rows={3}
                  value={newRecord.treatment_plan || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setNewRecord((prev: CreateMedicalRecordInput) => ({ 
                      ...prev, 
                      treatment_plan: e.target.value || null 
                    }))
                  }
                />
              </div>
              
              <div>
                <Label htmlFor="prescription">Prescription</Label>
                <Textarea
                  id="prescription"
                  placeholder="Medications and dosage instructions"
                  rows={3}
                  value={newRecord.prescription || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setNewRecord((prev: CreateMedicalRecordInput) => ({ 
                      ...prev, 
                      prescription: e.target.value || null 
                    }))
                  }
                />
              </div>
              
              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional clinical notes"
                  value={newRecord.notes || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setNewRecord((prev: CreateMedicalRecordInput) => ({ 
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
                  Create Record
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card className={cardStyles}>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search medical records by patient name, complaint, or diagnosis..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Medical Records List */}
      <div className="grid gap-4">
        {filteredRecords.length === 0 ? (
          <Card className={cardStyles}>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">No medical records found</p>
              <p className="text-gray-400">Create a new record to get started</p>
            </CardContent>
          </Card>
        ) : (
          filteredRecords.map((record: MedicalRecordWithPatient) => (
            <Card key={record.id} className={cardStyles}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {record.patient?.full_name || 'Unknown Patient'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          MRN: {record.patient?.medical_record_number || 'N/A'}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-500">
                          {new Date(record.visit_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Chief Complaint</Label>
                        <p className="text-sm text-gray-900 dark:text-white mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          {record.chief_complaint}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Diagnosis</Label>
                        <p className="text-sm text-gray-900 dark:text-white mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          {record.diagnosis}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-2">
                        <Stethoscope className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-500">
                          Dr. {record.doctor?.full_name || currentUser.full_name}
                        </span>
                      </div>
                      <div className="ml-auto flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRecord(record);
                            setIsViewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <Printer className="h-4 w-4 mr-2" />
                          Print
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* View Record Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Medical Record Details
            </DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-6">
              {/* Patient Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Patient</Label>
                    <p className="text-lg font-semibold">{selectedRecord.patient?.full_name}</p>
                    <p className="text-sm text-gray-500">MRN: {selectedRecord.patient?.medical_record_number}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Visit Date</Label>
                    <p className="text-lg font-semibold">{new Date(selectedRecord.visit_date).toLocaleDateString()}</p>
                    <p className="text-sm text-gray-500">Dr. {selectedRecord.doctor?.full_name || currentUser.full_name}</p>
                  </div>
                </div>
              </div>
              
              {/* Clinical Information */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Chief Complaint</Label>
                  <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm">{selectedRecord.chief_complaint}</p>
                  </div>
                </div>
                
                {selectedRecord.present_illness && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">History of Present Illness</Label>
                    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{selectedRecord.present_illness}</p>
                    </div>
                  </div>
                )}
                
                {selectedRecord.physical_examination && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Physical Examination</Label>
                    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{selectedRecord.physical_examination}</p>
                    </div>
                  </div>
                )}
                
                <div>
                  <Label className="text-sm font-medium text-gray-500">Diagnosis</Label>
                  <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm font-medium">{selectedRecord.diagnosis}</p>
                  </div>
                </div>
                
                {selectedRecord.treatment_plan && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Treatment Plan</Label>
                    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{selectedRecord.treatment_plan}</p>
                    </div>
                  </div>
                )}
                
                {selectedRecord.prescription && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Prescription</Label>
                    <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{selectedRecord.prescription}</p>
                    </div>
                  </div>
                )}
                
                {selectedRecord.notes && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Additional Notes</Label>
                    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{selectedRecord.notes}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Record Info */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Created: {new Date(selectedRecord.created_at).toLocaleString()}</span>
                  <span>Last Updated: {new Date(selectedRecord.updated_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
