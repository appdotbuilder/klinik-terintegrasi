
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Calendar, 
  Clock, 
  Users, 
  Plus, 
  Play, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Timer,
  Activity
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, Queue, Patient, CreateQueueInput } from '../../../server/src/schema';

interface QueueManagementProps {
  currentUser: User;
  cardStyles: string;
}

interface QueueWithPatient extends Queue {
  patient?: Patient;
}

export function QueueManagement({ cardStyles }: QueueManagementProps) {
  const [queueItems, setQueueItems] = useState<QueueWithPatient[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  const [newQueueItem, setNewQueueItem] = useState<CreateQueueInput>({
    patient_id: 0,
    priority: 0,
    notes: null
  });

  const loadQueue = useCallback(async (date?: string) => {
    try {
      setIsLoading(true);
      const queueData = await trpc.getQueue.query({ date });
      setQueueItems(queueData);
    } catch (error) {
      console.error('Failed to load queue:', error);
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
    loadQueue(selectedDate);
    loadPatients();
  }, [selectedDate, loadQueue, loadPatients]);

  const handleAddToQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await trpc.createQueue.mutate(newQueueItem);
      await loadQueue(selectedDate);
      setIsAddDialogOpen(false);
      setNewQueueItem({
        patient_id: 0,
        priority: 0,
        notes: null
      });
    } catch (error) {
      console.error('Failed to add to queue:', error);
    }
  };

  const handleStatusChange = async (id: number, status: 'waiting' | 'in_progress' | 'completed' | 'cancelled') => {
    try {
      await trpc.updateQueueStatus.mutate({ id, status });
      setQueueItems((prev: QueueWithPatient[]) =>
        prev.map((item: QueueWithPatient) =>
          item.id === id ? { ...item, status, updated_at: new Date() } : item
        )
      );
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
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
      case 'waiting':
        return <Clock className="h-4 w-4" />;
      case 'in_progress':
        return <Play className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 3) return 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
    if (priority >= 2) return 'border-l-amber-500 bg-amber-50 dark:bg-amber-900/20';
    return 'border-l-green-500 bg-green-50 dark:bg-green-900/20';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 3) return 'High Priority';
    if (priority >= 2) return 'Medium Priority';
    return 'Normal';
  };

  const queueStats = {
    waiting: queueItems.filter(item => item.status === 'waiting').length,
    inProgress: queueItems.filter(item => item.status === 'in_progress').length,
    completed: queueItems.filter(item => item.status === 'completed').length,
    cancelled: queueItems.filter(item => item.status === 'cancelled').length
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
            <Calendar className="mr-3 h-7 w-7 text-blue-600" />
            Queue Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage patient appointments and waiting queue
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                Add to Queue
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Patient to Queue</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddToQueue} className="space-y-4">
                <div>
                  <Label htmlFor="patient_id">Select Patient</Label>
                  <Select 
                    value={newQueueItem.patient_id > 0 ? newQueueItem.patient_id.toString() : 'choose-patient'}
                    onValueChange={(value: string) =>
                      setNewQueueItem((prev: CreateQueueInput) => ({ 
                        ...prev, 
                        patient_id: parseInt(value) 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a patient" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="choose-patient" disabled>Choose a patient</SelectItem>
                      {patients.map((patient: Patient) => (
                        <SelectItem key={patient.id} value={patient.id.toString()}>
                          {patient.full_name} - {patient.medical_record_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="priority">Priority Level</Label>
                  <Select 
                    value={newQueueItem.priority.toString()} 
                    onValueChange={(value: string) =>
                      setNewQueueItem((prev: CreateQueueInput) => ({ 
                        ...prev, 
                        priority: parseInt(value) 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Normal Priority</SelectItem>
                      <SelectItem value="1">Low Priority</SelectItem>
                      <SelectItem value="2">Medium Priority</SelectItem>
                      <SelectItem value="3">High Priority</SelectItem>
                      <SelectItem value="4">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any special notes or instructions..."
                    value={newQueueItem.notes || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setNewQueueItem((prev: CreateQueueInput) => ({ 
                        ...prev, 
                        notes: e.target.value || null 
                      }))
                    }
                  />
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Add to Queue
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Queue Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={cardStyles}>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <Timer className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Waiting</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{queueStats.waiting}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={cardStyles}>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">In Progress</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{queueStats.inProgress}</p>
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{queueStats.completed}</p>
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{queueStats.cancelled}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue List */}
      <Card className={cardStyles}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Queue for {new Date(selectedDate).toLocaleDateString()}</span>
            <Badge variant="secondary">{queueItems.length} Total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {queueItems.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">No patients in queue</p>
              <p className="text-gray-400">Add patients to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queueItems
                .sort((a, b) => {
                  // Sort by priority (highest first), then by queue number
                  if (a.priority !== b.priority) return b.priority - a.priority;
                  return a.queue_number - b.queue_number;
                })
                .map((item: QueueWithPatient) => (
                  <div
                    key={item.id}
                    className={`border-l-4 p-4 rounded-lg shadow-sm ${getPriorityColor(item.priority)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            #{item.queue_number}
                          </div>
                          <div className="text-xs text-gray-500">Queue No.</div>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {item.patient?.full_name || 'Unknown Patient'}
                            </h3>
                            {item.priority >= 2 && (
                              <Badge variant="outline" className="text-xs">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                {getPriorityLabel(item.priority)}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            MRN: {item.patient?.medical_record_number || 'N/A'}
                          </p>
                          {item.notes && (
                            <p className="text-sm text-gray-500 mt-1">
                              Note: {item.notes}
                            </p>
                          )}
                          <div className="flex items-center mt-2 text-xs text-gray-500">
                            <Clock className="h-3 w-3 mr-1" />
                            Added: {new Date(item.created_at).toLocaleTimeString()}
                            {item.updated_at > item.created_at && (
                              <>
                                <span className="mx-2">•</span>
                                Updated: {new Date(item.updated_at).toLocaleTimeString()}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Badge className={getStatusColor(item.status)}>
                          {getStatusIcon(item.status)}
                          <span className="ml-1 capitalize">{item.status.replace('_', ' ')}</span>
                        </Badge>
                        
                        <Select
                          value={item.status}
                          onValueChange={(value: 'waiting' | 'in_progress' | 'completed' | 'cancelled') =>
                            handleStatusChange(item.id, value)
                          }
                        >
                          <SelectTrigger className="w-auto">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="waiting">
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-2" />
                                Waiting
                              </div>
                            </SelectItem>
                            <SelectItem value="in_progress">
                              <div className="flex items-center">
                                <Play className="h-4 w-4 mr-2" />
                                In Progress
                              </div>
                            </SelectItem>
                            <SelectItem value="completed">
                              <div className="flex items-center">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Completed
                              </div>
                            </SelectItem>
                            <SelectItem value="cancelled">
                              <div className="flex items-center">
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancelled
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
