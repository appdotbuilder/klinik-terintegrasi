
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Search, 
  Users, 
  Calendar,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  Edit,
  Eye,
  Filter
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, Patient, CreatePatientInput } from '../../../server/src/schema';

interface PatientManagementProps {
  currentUser: User;
  cardStyles: string;
}

export function PatientManagement({ cardStyles }: PatientManagementProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const [newPatient, setNewPatient] = useState<CreatePatientInput>({
    full_name: '',
    date_of_birth: new Date(),
    gender: 'male',
    phone: null,
    email: null,
    address: null,
    emergency_contact: null,
    emergency_phone: null,
    blood_type: null,
    allergies: null
  });

  const loadPatients = useCallback(async () => {
    try {
      setIsLoading(true);
      const patientsData = await trpc.getPatients.query();
      setPatients(patientsData);
    } catch (error) {
      console.error('Failed to load patients:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const createdPatient = await trpc.createPatient.mutate(newPatient);
      setPatients((prev: Patient[]) => [createdPatient, ...prev]);
      setIsCreateDialogOpen(false);
      setNewPatient({
        full_name: '',
        date_of_birth: new Date(),
        gender: 'male',
        phone: null,
        email: null,
        address: null,
        emergency_contact: null,
        emergency_phone: null,
        blood_type: null,
        allergies: null
      });
    } catch (error) {
      console.error('Failed to create patient:', error);
    }
  };

  const filteredPatients = patients.filter((patient: Patient) =>
    patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.medical_record_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (patient.email && patient.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getPatientAge = (dateOfBirth: Date) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const bloodTypeColors: Record<string, string> = {
    'A+': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    'A-': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    'B+': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'B-': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'AB+': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    'AB-': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    'O+': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'O-': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
            <Users className="mr-3 h-7 w-7 text-blue-600" />
            Patient Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage patient records and registrations
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
              <Plus className="mr-2 h-4 w-4" />
              New Patient
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Register New Patient</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreatePatient} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={newPatient.full_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewPatient((prev: CreatePatientInput) => ({ ...prev, full_name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Gender *</Label>
                  <Select 
                    value={newPatient.gender || 'select-gender'}
                    onValueChange={(value: 'male' | 'female') =>
                      setNewPatient((prev: CreatePatientInput) => ({ ...prev, gender: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="select-gender" disabled>Select gender</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date_of_birth">Date of Birth *</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={newPatient.date_of_birth.toISOString().split('T')[0]}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewPatient((prev: CreatePatientInput) => ({ 
                        ...prev, 
                        date_of_birth: new Date(e.target.value) 
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="blood_type">Blood Type</Label>
                  <Select 
                    value={newPatient.blood_type || 'select-blood-type'}
                    onValueChange={(value: string) =>
                      setNewPatient((prev: CreatePatientInput) => ({ 
                        ...prev, 
                        blood_type: value || null 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select blood type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="select-blood-type" disabled>Select blood type</SelectItem>
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A-">A-</SelectItem>
                      <SelectItem value="B+">B+</SelectItem>
                      <SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="AB+">AB+</SelectItem>
                      <SelectItem value="AB-">AB-</SelectItem>
                      <SelectItem value="O+">O+</SelectItem>
                      <SelectItem value="O-">O-</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={newPatient.phone || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewPatient((prev: CreatePatientInput) => ({ 
                        ...prev, 
                        phone: e.target.value || null 
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newPatient.email || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewPatient((prev: CreatePatientInput) => ({ 
                        ...prev, 
                        email: e.target.value || null 
                      }))
                    }
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={newPatient.address || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setNewPatient((prev: CreatePatientInput) => ({ 
                      ...prev, 
                      address: e.target.value || null 
                    }))
                  }
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emergency_contact">Emergency Contact</Label>
                  <Input
                    id="emergency_contact"
                    value={newPatient.emergency_contact || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewPatient((prev: CreatePatientInput) => ({ 
                        ...prev, 
                        emergency_contact: e.target.value || null 
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="emergency_phone">Emergency Phone</Label>
                  <Input
                    id="emergency_phone"
                    value={newPatient.emergency_phone || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewPatient((prev: CreatePatientInput) => ({ 
                        ...prev, 
                        emergency_phone: e.target.value || null 
                      }))
                    }
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="allergies">Known Allergies</Label>
                <Textarea
                  id="allergies"
                  placeholder="List any known allergies or medical conditions"
                  value={newPatient.allergies || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setNewPatient((prev: CreatePatientInput) => ({ 
                      ...prev, 
                      allergies: e.target.value || null 
                    }))
                  }
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Register Patient
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card className={cardStyles}>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search patients by name, MRN, or email..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Patient List */}
      <Card className={cardStyles}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Registered Patients ({filteredPatients.length})</span>
            <Badge variant="secondary">{patients.length} Total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient Info</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Medical Info</TableHead>
                  <TableHead>Registration</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex flex-col items-center">
                        <Users className="h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-500">No patients found</p>
                        <p className="text-sm text-gray-400">Try adjusting your search terms</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPatients.map((patient: Patient) => (
                    <TableRow key={patient.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{patient.full_name}</p>
                          <p className="text-sm text-gray-500">MRN: {patient.medical_record_number}</p>
                          <div className="flex items-center mt-1">
                            <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              Age: {getPatientAge(patient.date_of_birth)} • {patient.gender}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {patient.phone && (
                            <div className="flex items-center text-sm">
                              <Phone className="h-3 w-3 mr-2 text-gray-400" />
                              {patient.phone}
                            </div>
                          )}
                          {patient.email && (
                            <div className="flex items-center text-sm">
                              <Mail className="h-3 w-3 mr-2 text-gray-400" />
                              {patient.email}
                            </div>
                          )}
                          {patient.address && (
                            <div className="flex items-center text-sm">
                              <MapPin className="h-3 w-3 mr-2 text-gray-400" />
                              <span className="truncate max-w-32">{patient.address}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {patient.blood_type && (
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${bloodTypeColors[patient.blood_type] || ''}`}
                            >
                              {patient.blood_type}
                            </Badge>
                          )}
                          {patient.allergies && (
                            <div className="flex items-center text-xs text-amber-600">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Allergies
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-500">
                          {patient.created_at.toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPatient(patient);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
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

      {/* Patient Detail Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Patient Details</DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Full Name</Label>
                  <p className="text-lg font-semibold">{selectedPatient.full_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Medical Record Number</Label>
                  <p className="text-lg font-semibold">{selectedPatient.medical_record_number}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Age</Label>
                  <p className="font-medium">{getPatientAge(selectedPatient.date_of_birth)} years</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Gender</Label>
                  <p className="font-medium capitalize">{selectedPatient.gender}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Blood Type</Label>
                  {selectedPatient.blood_type ? (
                    <Badge className={bloodTypeColors[selectedPatient.blood_type] || ''}>
                      {selectedPatient.blood_type}
                    </Badge>
                  ) : (
                    <p className="text-gray-400">Not specified</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Phone</Label>
                  <p className="font-medium">{selectedPatient.phone || 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Email</Label>
                  <p className="font-medium">{selectedPatient.email || 'Not provided'}</p>
                </div>
              </div>
              
              {selectedPatient.address && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Address</Label>
                  <p className="font-medium">{selectedPatient.address}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Emergency Contact</Label>
                  <p className="font-medium">{selectedPatient.emergency_contact || 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Emergency Phone</Label>
                  <p className="font-medium">{selectedPatient.emergency_phone || 'Not provided'}</p>
                </div>
              </div>
              
              {selectedPatient.allergies && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Known Allergies</Label>
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-center">
                      <AlertCircle className="h-4 w-4 text-amber-600 mr-2" />
                      <p className="font-medium text-amber-800 dark:text-amber-200">{selectedPatient.allergies}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <Label className="text-sm font-medium text-gray-500">Registration Date</Label>
                <p className="font-medium">{selectedPatient.created_at.toLocaleDateString()}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
