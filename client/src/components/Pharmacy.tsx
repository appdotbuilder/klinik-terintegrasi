
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Pill, 
  Plus, 
  Search, 
  Package, 
  AlertTriangle,
  TrendingDown
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, Medication, CreateMedicationInput } from '../../../server/src/schema';

interface PharmacyProps {
  currentUser: User;
  cardStyles: string;
}

export function Pharmacy({ cardStyles }: PharmacyProps) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const [newMedication, setNewMedication] = useState<CreateMedicationInput>({
    name: '',
    generic_name: null,
    strength: null,
    dosage_form: '',
    manufacturer: null,
    barcode: null,
    price: 0,
    stock_quantity: 0,
    min_stock_level: 10,
    expiry_date: null,
    description: null
  });

  const loadMedications = useCallback(async () => {
    try {
      setIsLoading(true);
      const meds = await trpc.getMedications.query({ lowStock: showLowStock });
      setMedications(meds);
    } catch (error) {
      console.error('Failed to load medications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [showLowStock]);

  useEffect(() => {
    loadMedications();
  }, [loadMedications]);

  const handleCreateMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await trpc.createMedication.mutate(newMedication);
      setMedications((prev: Medication[]) => [created, ...prev]);
      setIsCreateDialogOpen(false);
      setNewMedication({
        name: '',
        generic_name: null,
        strength: null,
        dosage_form: '',
        manufacturer: null,
        barcode: null,
        price: 0,
        stock_quantity: 0,
        min_stock_level: 10,
        expiry_date: null,
        description: null
      });
    } catch (error) {
      console.error('Failed to create medication:', error);
    }
  };

  const handleStockUpdate = async (id: number, quantity: number, operation: 'add' | 'subtract') => {
    try {
      await trpc.updateMedicationStock.mutate({ id, quantity, operation });
      await loadMedications();
    } catch (error) {
      console.error('Failed to update stock:', error);
    }
  };

  const getStockStatus = (medication: Medication) => {
    if (medication.stock_quantity === 0) {
      return { status: 'out_of_stock', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', label: 'Out of Stock' };
    }
    if (medication.stock_quantity <= medication.min_stock_level) {
      return { status: 'low_stock', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', label: 'Low Stock' };
    }
    return { status: 'in_stock', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', label: 'In Stock' };
  };

  const isExpiringSoon = (expiryDate: Date | null) => {
    if (!expiryDate) return false;
    const today = new Date();
    const threeMonthsFromNow = new Date(today.setMonth(today.getMonth() + 3));
    return new Date(expiryDate) <= threeMonthsFromNow;
  };

  const filteredMedications = medications.filter((med: Medication) =>
    med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (med.generic_name && med.generic_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    med.dosage_form.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const inventoryStats = {
    total: medications.length,
    lowStock: medications.filter(med => med.stock_quantity <= med.min_stock_level).length,
    outOfStock: medications.filter(med => med.stock_quantity === 0).length,
    expiringSoon: medications.filter(med => med.expiry_date && isExpiringSoon(med.expiry_date)).length
  };

  const dosageForms = [
    'Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Ointment',
    'Drop', 'Inhaler', 'Patch', 'Suppository', 'Powder', 'Solution'
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
            <Pill className="mr-3 h-7 w-7 text-blue-600" />
            Pharmacy & Inventory
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage medication inventory and prescriptions
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Add Medication
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Medication</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateMedication} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Medication Name *</Label>
                  <Input
                    id="name"
                    value={newMedication.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewMedication((prev: CreateMedicationInput) => ({ 
                        ...prev, 
                        name: e.target.value 
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="generic_name">Generic Name</Label>
                  <Input
                    id="generic_name"
                    value={newMedication.generic_name || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewMedication((prev: CreateMedicationInput) => ({ 
                        ...prev, 
                        generic_name: e.target.value || null 
                      }))
                    }
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="strength">Strength</Label>
                  <Input
                    id="strength"
                    placeholder="e.g., 500mg"
                    value={newMedication.strength || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewMedication((prev: CreateMedicationInput) => ({ 
                        ...prev, 
                        strength: e.target.value || null 
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="dosage_form">Dosage Form *</Label>
                  <select
                    id="dosage_form"
                    value={newMedication.dosage_form}
                    onChange={(e) =>
                      setNewMedication((prev: CreateMedicationInput) => ({ 
                        ...prev, 
                        dosage_form: e.target.value 
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Select form</option>
                    {dosageForms.map((form) => (
                      <option key={form} value={form}>{form}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input
                    id="manufacturer"
                    value={newMedication.manufacturer || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewMedication((prev: CreateMedicationInput) => ({ 
                        ...prev, 
                        manufacturer: e.target.value || null 
                      }))
                    }
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="price">Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newMedication.price}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewMedication((prev: CreateMedicationInput) => ({ 
                        ...prev, 
                        price: parseFloat(e.target.value) || 0 
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="stock_quantity">Stock Quantity *</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    min="0"
                    value={newMedication.stock_quantity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewMedication((prev: CreateMedicationInput) => ({ 
                        ...prev, 
                        stock_quantity: parseInt(e.target.value) || 0 
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="min_stock_level">Min Stock Level</Label>
                  <Input
                    id="min_stock_level"
                    type="number"
                    min="0"
                    value={newMedication.min_stock_level}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewMedication((prev: CreateMedicationInput) => ({ 
                        ...prev, 
                        min_stock_level: parseInt(e.target.value) || 10 
                      }))
                    }
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="barcode">Barcode</Label>
                  <Input
                    id="barcode"
                    value={newMedication.barcode || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewMedication((prev: CreateMedicationInput) => ({ 
                        ...prev, 
                        barcode: e.target.value || null 
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="expiry_date">Expiry Date</Label>
                  <Input
                    id="expiry_date"
                    type="date"
                    value={newMedication.expiry_date ? newMedication.expiry_date.toISOString().split('T')[0] : ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewMedication((prev: CreateMedicationInput) => ({ 
                        ...prev, 
                        expiry_date: e.target.value ? new Date(e.target.value) : null 
                      }))
                    }
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Additional description or notes"
                  value={newMedication.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setNewMedication((prev: CreateMedicationInput) => ({ 
                      ...prev, 
                      description: e.target.value || null 
                    }))
                  }
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Add Medication
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Inventory Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={cardStyles}>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Items</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{inventoryStats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={cardStyles}>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <TrendingDown className="h-5 w-5 text-amber-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Low Stock</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{inventoryStats.lowStock}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={cardStyles}>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Out of Stock</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{inventoryStats.outOfStock}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={cardStyles}>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/30">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Expiring Soon</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{inventoryStats.expiringSoon}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(inventoryStats.lowStock > 0 || inventoryStats.outOfStock > 0 || inventoryStats.expiringSoon > 0) && (
        <div className="space-y-3">
          {inventoryStats.outOfStock > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{inventoryStats.outOfStock}</strong> medications are out of stock. Immediate restocking required.
              </AlertDescription>
            </Alert>
          )}
          {inventoryStats.lowStock > 0 && (
            <Alert>
              <TrendingDown className="h-4 w-4" />
              <AlertDescription>
                <strong>{inventoryStats.lowStock}</strong> medications are running low on stock. Consider restocking soon.
              </AlertDescription>
            </Alert>
          )}
          {inventoryStats.expiringSoon > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{inventoryStats.expiringSoon}</strong> medications are expiring within 3 months. Review inventory.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Search and Filter */}
      <Card className={cardStyles}>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search medications by name, generic name, or dosage form..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showLowStock ? "default" : "outline"}
              onClick={() => setShowLowStock(!showLowStock)}
            >
              {showLowStock ? 'Show All' : 'Low Stock Only'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Medications Table */}
      <Card className={cardStyles}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Medication Inventory ({filteredMedications.length})</span>
            <Badge variant="secondary">{medications.length} Total Items</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medication</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMedications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No medications found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMedications.map((medication: Medication) => {
                    const stockStatus = getStockStatus(medication);
                    const isExpiring = medication.expiry_date && isExpiringSoon(medication.expiry_date);
                    
                    return (
                      <TableRow key={medication.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{medication.name}</p>
                            {medication.generic_name && (
                              <p className="text-sm text-gray-500">Generic: {medication.generic_name}</p>
                            )}
                            {medication.barcode && (
                              <p className="text-xs text-gray-400">Barcode: {medication.barcode}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{medication.dosage_form}</p>
                            {medication.strength && (
                              <p className="text-sm text-gray-500">Strength: {medication.strength}</p>
                            )}
                            {medication.manufacturer && (
                              <p className="text-xs text-gray-400">{medication.manufacturer}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{medication.stock_quantity} units</p>
                            <p className="text-xs text-gray-500">Min: {medication.min_stock_level}</p>
                            <Badge variant="secondary" className={`text-xs mt-1 ${stockStatus.color}`}>
                              {stockStatus.label}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">${medication.price.toFixed(2)}</p>
                          <p className="text-xs text-gray-500">per unit</p>
                        </TableCell>
                        <TableCell>
                          {medication.expiry_date ? (
                            <div>
                              <p className={`text-sm ${isExpiring ? 'text-orange-600 font-medium' : ''}`}>
                                {new Date(medication.expiry_date).toLocaleDateString()}
                              </p>
                              {isExpiring && (
                                <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                                  Expiring Soon
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">No expiry</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const quantity = prompt('Enter quantity to add:');
                                if (quantity && !isNaN(Number(quantity))) {
                                  handleStockUpdate(medication.id, Number(quantity), 'add');
                                }
                              }}
                            >
                              +
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const quantity = prompt('Enter quantity to subtract:');
                                if (quantity && !isNaN(Number(quantity))) {
                                  handleStockUpdate(medication.id, Number(quantity), 'subtract');
                                }
                              }}
                              disabled={medication.stock_quantity === 0}
                            >
                              -
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
