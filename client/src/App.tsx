
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, 
  Calendar, 
  Activity, 
  FileText, 
  Pill, 
  CreditCard, 
  BarChart3, 
  Settings,
  Moon,
  Sun,
  LogOut,
  Stethoscope,
  TestTube,
  Zap,
  Sparkles,
  Shield,
  Bell
} from 'lucide-react';
import type { User } from '../../server/src/schema';

// Import custom components
import { PatientManagement } from '@/components/PatientManagement';
import { QueueManagement } from '@/components/QueueManagement';
import { MedicalRecords } from '@/components/MedicalRecords';
import { Laboratory } from '@/components/Laboratory';
import { Radiology } from '@/components/Radiology';
import { Pharmacy } from '@/components/Pharmacy';
import { Billing } from '@/components/Billing';
import { Reports } from '@/components/Reports';
import { UserManagement } from '@/components/UserManagement';
import { LoginForm } from '@/components/LoginForm';
import { Dashboard } from '@/components/Dashboard';

type ThemeMode = 'light' | 'dark';
type UITheme = 'glass' | 'enterprise' | 'professional' | 'elegant';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [uiTheme, setUITheme] = useState<UITheme>('glass');
  const [notifications, setNotifications] = useState<string[]>([]);

  // Apply theme classes
  useEffect(() => {
    const root = document.documentElement;
    
    // Theme mode
    if (themeMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // UI theme
    root.className = root.className.replace(/theme-\w+/g, '');
    root.classList.add(`theme-${uiTheme}`);
  }, [themeMode, uiTheme]);

  const handleLogin = useCallback((user: User) => {
    setCurrentUser(user);
    setNotifications([
      `Welcome back, ${user.full_name}! 👋`,
      'System running optimally 🟢',
      'New updates available 📥'
    ]);
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setActiveTab('dashboard');
    setNotifications([]);
  }, []);

  const getThemeStyles = () => {
    const baseStyles = "min-h-screen transition-all duration-300";
    
    switch (uiTheme) {
      case 'glass':
        return `${baseStyles} bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900`;
      case 'enterprise':
        return `${baseStyles} bg-gray-50 dark:bg-gray-900`;
      case 'professional':
        return `${baseStyles} bg-slate-50 dark:bg-slate-900`;
      case 'elegant':
        return `${baseStyles} bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 dark:from-gray-900 dark:via-rose-900 dark:to-purple-900`;
      default:
        return baseStyles;
    }
  };

  const getCardStyles = () => {
    switch (uiTheme) {
      case 'glass':
        return "backdrop-blur-md bg-white/70 dark:bg-gray-800/70 border border-white/20 shadow-xl";
      case 'enterprise':
        return "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm";
      case 'professional':
        return "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md";
      case 'elegant':
        return "bg-white/80 dark:bg-gray-800/80 border border-rose-200/30 dark:border-purple-700/30 shadow-lg";
      default:
        return "";
    }
  };

  if (!currentUser) {
    return (
      <div className={getThemeStyles()}>
        <div className="flex items-center justify-center min-h-screen p-4">
          <LoginForm onLogin={handleLogin} cardStyles={getCardStyles()} />
        </div>
      </div>
    );
  }

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['admin', 'doctor', 'nurse', 'cashier'] },
    { id: 'patients', label: 'Patients', icon: Users, roles: ['admin', 'doctor', 'nurse'] },
    { id: 'queue', label: 'Queue', icon: Calendar, roles: ['admin', 'nurse', 'cashier'] },
    { id: 'medical-records', label: 'Medical Records', icon: FileText, roles: ['admin', 'doctor'] },
    { id: 'laboratory', label: 'Laboratory', icon: TestTube, roles: ['admin', 'doctor', 'lab_technician'] },
    { id: 'radiology', label: 'Radiology', icon: Activity, roles: ['admin', 'doctor', 'radiologist'] },
    { id: 'pharmacy', label: 'Pharmacy', icon: Pill, roles: ['admin', 'pharmacist', 'doctor'] },
    { id: 'billing', label: 'Billing', icon: CreditCard, roles: ['admin', 'cashier'] },
    { id: 'reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'doctor'] },
    { id: 'users', label: 'User Management', icon: Settings, roles: ['admin'] },
  ];

  const accessibleItems = navigationItems.filter(item => 
    item.roles.includes(currentUser.role)
  );

  return (
    <div className={getThemeStyles()}>
      {/* Header */}
      <header className={`sticky top-0 z-50 border-b backdrop-blur-sm ${getCardStyles()}`}>
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600">
                <Stethoscope className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  ClinicFlow AI
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Next-Gen Healthcare Management
                </p>
              </div>
            </div>
            {notifications.length > 0 && (
              <div className="flex items-center space-x-2">
                <Bell className="h-4 w-4 text-amber-500 animate-pulse" />
                <Badge variant="secondary" className="text-xs">
                  {notifications.length}
                </Badge>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {/* Theme Controls */}
            <div className="flex items-center space-x-2">
              <Sun className="h-4 w-4" />
              <Switch
                checked={themeMode === 'dark'}
                onCheckedChange={(checked) => setThemeMode(checked ? 'dark' : 'light')}
              />
              <Moon className="h-4 w-4" />
            </div>

            {/* UI Theme Selector */}
            <select
              value={uiTheme}
              onChange={(e) => setUITheme(e.target.value as UITheme)}
              className="text-sm border rounded-md px-2 py-1 bg-transparent"
            >
              <option value="glass">🌟 Glass Morphism</option>
              <option value="enterprise">🏢 Enterprise</option>
              <option value="professional">💼 Professional</option>
              <option value="elegant">✨ Elegant</option>
            </select>

            {/* User Info */}
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarFallback>
                  {currentUser.full_name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="text-right">
                <p className="text-sm font-medium">{currentUser.full_name}</p>
                <Badge variant="outline" className="text-xs capitalize">
                  {currentUser.role}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Notifications Bar */}
        {notifications.length > 0 && (
          <div className="px-6 py-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border-t">
            <div className="flex items-center space-x-4 text-sm">
              <Sparkles className="h-4 w-4 text-blue-500" />
              <div className="flex space-x-4 overflow-x-auto">
                {notifications.map((notification, index) => (
                  <span key={index} className="whitespace-nowrap text-gray-600 dark:text-gray-300">
                    {notification}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex">
        {/* Sidebar */}
        <aside className={`w-64 min-h-screen border-r ${getCardStyles()}`}>
          <nav className="p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical">
              <TabsList className="flex flex-col w-full h-auto bg-transparent space-y-1">
                {accessibleItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <TabsTrigger
                      key={item.id}
                      value={item.id}
                      className="w-full justify-start space-x-3 data-[state=active]:bg-blue-100 dark:data-[state=active]:bg-blue-900/30"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </nav>

          {/* Quick Stats Sidebar */}
          <div className="p-4 border-t">
            <h3 className="text-sm font-medium mb-3 flex items-center">
              <Zap className="h-4 w-4 mr-2 text-yellow-500" />
              Quick Stats
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>System Status</span>
                <Badge variant="secondary" className="text-xs">
                  🟢 Online
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Security</span>
                <Shield className="h-4 w-4 text-green-500" />
              </div>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsContent value="dashboard">
              <Dashboard currentUser={currentUser} cardStyles={getCardStyles()} />
            </TabsContent>
            
            <TabsContent value="patients">
              <PatientManagement currentUser={currentUser} cardStyles={getCardStyles()} />
            </TabsContent>
            
            <TabsContent value="queue">
              <QueueManagement currentUser={currentUser} cardStyles={getCardStyles()} />
            </TabsContent>
            
            <TabsContent value="medical-records">
              <MedicalRecords currentUser={currentUser} cardStyles={getCardStyles()} />
            </TabsContent>
            
            <TabsContent value="laboratory">
              <Laboratory currentUser={currentUser} cardStyles={getCardStyles()} />
            </TabsContent>
            
            <TabsContent value="radiology">
              <Radiology currentUser={currentUser} cardStyles={getCardStyles()} />
            </TabsContent>
            
            <TabsContent value="pharmacy">
              <Pharmacy currentUser={currentUser} cardStyles={getCardStyles()} />
            </TabsContent>
            
            <TabsContent value="billing">
              <Billing currentUser={currentUser} cardStyles={getCardStyles()} />
            </TabsContent>
            
            <TabsContent value="reports">
              <Reports currentUser={currentUser} cardStyles={getCardStyles()} />
            </TabsContent>
            
            <TabsContent value="users">
              <UserManagement currentUser={currentUser} cardStyles={getCardStyles()} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

export default App;
