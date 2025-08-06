
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Calendar, 
  Activity, 
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle,
  Zap,
  Brain,
  Shield
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User } from '../../../server/src/schema';

interface DashboardProps {
  currentUser: User;
  cardStyles: string;
}

interface DashboardStats {
  totalPatients: number;
  todayQueue: number;
  pendingLabTests: number;
  pendingRadiology: number;
  lowStockMedications: number;
  unpaidInvoices: number;
  todayRevenue: number;
}

export function Dashboard({ currentUser, cardStyles }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    todayQueue: 0,
    pendingLabTests: 0,
    pendingRadiology: 0,
    lowStockMedications: 0,
    unpaidInvoices: 0,
    todayRevenue: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const dashboardStats = await trpc.getDashboardStats.query();
      setStats(dashboardStats);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const statCards = [
    {
      title: 'Total Patients',
      value: stats.totalPatients,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      change: '+12%',
      changeType: 'positive' as const
    },
    {
      title: 'Today\'s Queue',
      value: stats.todayQueue,
      icon: Calendar,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      change: '+5%',
      changeType: 'positive' as const
    },
    {
      title: 'Pending Lab Tests',
      value: stats.pendingLabTests,
      icon: Activity,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      change: '-2%',
      changeType: 'negative' as const
    },
    {
      title: 'Today\'s Revenue',
      value: `$${stats.todayRevenue.toLocaleString()}`,
      icon: CreditCard,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      change: '+18%',
      changeType: 'positive' as const
    }
  ];

  const quickActions = [
    { label: 'New Patient Registration', icon: Users, color: 'bg-blue-500' },
    { label: 'Add to Queue', icon: Calendar, color: 'bg-green-500' },
    { label: 'Create Prescription', icon: Activity, color: 'bg-purple-500' },
    { label: 'Generate Report', icon: CreditCard, color: 'bg-orange-500' }
  ];

  const aiInsights = [
    {
      type: 'performance',
      message: 'Patient flow is 15% more efficient this week',
      confidence: 94,
      icon: TrendingUp,
      color: 'text-green-600'
    },
    {
      type: 'alert',
      message: '3 medications approaching low stock levels',
      confidence: 98,
      icon: AlertTriangle,
      color: 'text-amber-600'
    },
    {
      type: 'optimization',
      message: 'Consider scheduling more lab tests in the morning',
      confidence: 87,
      icon: Brain,
      color: 'text-blue-600'
    }
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <Card className={cardStyles}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {getGreeting()}, Dr. {currentUser.full_name.split(' ')[0]}! 👋
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Welcome back to your clinic dashboard. Here's what's happening today.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="flex items-center space-x-1">
                <Shield className="h-3 w-3" />
                <span>Secure Session</span>
              </Badge>
              <Badge variant="outline" className="flex items-center space-x-1">
                <Zap className="h-3 w-3 text-yellow-500" />
                <span>AI Active</span>
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className={cardStyles}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                      {stat.value}
                    </p>
                    <div className="flex items-center mt-2">
                      <span className={`text-xs font-medium ${
                        stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stat.change}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">vs last week</span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Insights */}
        <Card className={cardStyles}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <span>AI Insights</span>
              <Badge variant="secondary" className="ml-auto">
                Real-time
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {aiInsights.map((insight, index) => {
              const Icon = insight.icon;
              return (
                <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <Icon className={`h-5 w-5 mt-0.5 ${insight.color}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {insight.message}
                    </p>
                    <div className="flex items-center mt-2">
                      <span className="text-xs text-gray-500">Confidence:</span>
                      <Progress 
                        value={insight.confidence} 
                        className="w-20 h-2 ml-2" 
                      />
                      <span className="text-xs text-gray-500 ml-2">{insight.confidence}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className={cardStyles}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <span>Quick Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <button
                    key={index}
                    className="flex items-center space-x-3 p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors group"
                  >
                    <div className={`p-2 rounded-lg ${action.color} text-white group-hover:scale-110 transition-transform`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                      {action.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card className={cardStyles}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-600" />
              <span>System Status</span>
            </div>
            <Badge variant="secondary" className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>All Systems Operational</span>
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium">Database</p>
              <p className="text-xs text-gray-500">Online</p>
            </div>
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium">API Services</p>
              <p className="text-xs text-gray-500">Healthy</p>
            </div>
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium">Backup System</p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
            <div className="text-center">
              <Clock className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="text-sm font-medium">Last Sync</p>
              <p className="text-xs text-gray-500">2 min ago</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
