
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  FileText, 
  Download, 
  Calendar,
  TrendingUp,
  Users,
  Activity,
  DollarSign,
  Pill,
  TestTube,
  Brain,
  Zap
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, ReportRequest } from '../../../server/src/schema';

interface ReportsProps {
  currentUser: User;
  cardStyles: string;
}

export function Reports({ cardStyles }: ReportsProps) {
  const [reportRequest, setReportRequest] = useState<ReportRequest>({
    report_type: 'patient_summary',
    start_date: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    end_date: new Date(),
    format: 'pdf'
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  const handleGenerateReport = useCallback(async () => {
    try {
      setIsGenerating(true);
      setGenerationProgress(0);
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      await trpc.generateReport.mutate(reportRequest);
      
      clearInterval(progressInterval);
      setGenerationProgress(100);
      
      // Simulate download
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationProgress(0);
      }, 1000);
    } catch (error) {
      console.error('Failed to generate report:', error);
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  }, [reportRequest]);

  const reportTypes = [
    { value: 'patient_summary', label: 'Patient Summary Report', icon: Users, description: 'Comprehensive patient statistics and demographics' },
    { value: 'financial_summary', label: 'Financial Summary Report', icon: DollarSign, description: 'Revenue, expenses, and financial analytics' },
    { value: 'inventory_report', label: 'Inventory Report', icon: Pill, description: 'Medication stock levels and pharmacy analytics' },
    { value: 'appointment_report', label: 'Appointment Report', icon: Calendar, description: 'Queue management and appointment statistics' },
    { value: 'medical_statistics', label: 'Medical Statistics', icon: Activity, description: 'Lab tests, radiology, and clinical analytics' }
  ];

  const quickReports = [
    {
      title: 'Today\'s Summary',
      description: 'Quick overview of today\'s activities',
      icon: Calendar,
      color: 'bg-blue-500'
    },
    {
      title: 'Weekly Analytics',
      description: 'Past week performance metrics',
      icon: TrendingUp,
      color: 'bg-green-500'
    },
    {
      title: 'Monthly Financial',
      description: 'Monthly revenue and expense report',
      icon: DollarSign,
      color: 'bg-purple-500'
    },
    {
      title: 'Inventory Status',
      description: 'Current medication stock levels',
      icon: Pill,
      color: 'bg-orange-500'
    }
  ];

  const aiInsights = [
    {
      title: 'Patient Flow Optimization',
      insight: 'Peak hours: 10-12 AM and 2-4 PM. Consider additional staffing during these periods.',
      confidence: 94,
      trend: 'positive'
    },
    {
      title: 'Revenue Trends',
      insight: 'Monthly revenue increased by 15% compared to last month, driven by increased lab test orders.',
      confidence: 87,
      trend: 'positive'
    },
    {
      title: 'Inventory Management',
      insight: '12 medications will reach minimum stock levels within 2 weeks. Auto-reorder recommended.',
      confidence: 92,
      trend: 'warning'
    },
    {
      title: 'Diagnosis Patterns',
      insight: 'Most common diagnoses: Respiratory infections (23%), Hypertension (18%), Diabetes follow-up (15%).',
      confidence: 89,
      trend: 'neutral'
    }
  ];

  const dashboardMetrics = [
    { label: 'Total Patients', value: '1,247', change: '+12%', color: 'text-blue-600' },
    { label: 'Monthly Revenue', value: '$45,230', change: '+18%', color: 'text-green-600' },
    { label: 'Lab Tests', value: '342', change: '+7%', color: 'text-purple-600' },
    { label: 'Prescriptions', value: '896', change: '+15%', color: 'text-orange-600' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <BarChart3 className="mr-3 h-7 w-7 text-blue-600" />
            Reports & Analytics
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            AI-powered insights and comprehensive reporting
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Brain className="h-3 w-3" />
            <span>AI Analytics</span>
          </Badge>
          <Badge variant="outline" className="flex items-center space-x-1">
            <Zap className="h-3 w-3 text-yellow-500" />
            <span>Real-time</span>
          </Badge>
        </div>
      </div>

      {/* Quick Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {dashboardMetrics.map((metric, index) => (
          <Card key={index} className={cardStyles}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{metric.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{metric.value}</p>
                  <p className={`text-sm font-medium ${metric.color}`}>{metric.change}</p>
                </div>
                <TrendingUp className={`h-8 w-8 ${metric.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Insights */}
      <Card className={cardStyles}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-purple-600" />
            <span>AI-Powered Insights</span>
            <Badge variant="secondary" className="ml-auto">Updated 5 min ago</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {aiInsights.map((insight, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{insight.title}</h3>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      insight.trend === 'positive' ? 'border-green-300 text-green-700' :
                      insight.trend === 'warning' ? 'border-amber-300 text-amber-700' :
                      'border-gray-300 text-gray-700'
                    }`}
                  >
                    {insight.confidence}% confidence
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{insight.insight}</p>
                <Progress value={insight.confidence} className="w-full h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Report Generator */}
        <Card className={cardStyles}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span>Generate Custom Report</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="report_type">Report Type</Label>
              <Select 
                value={reportRequest.report_type || 'select-report-type'}
                onValueChange={(value: 'patient_summary' | 'financial_summary' | 'inventory_report' | 'appointment_report' | 'medical_statistics') =>
                  setReportRequest(prev => ({ ...prev, report_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="select-report-type" disabled>Select report type</SelectItem>
                  {reportTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center space-x-2">
                          <Icon className="h-4 w-4" />
                          <div>
                            <p className="font-medium">{type.label}</p>
                            <p className="text-xs text-gray-500">{type.description}</p>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={reportRequest.start_date.toISOString().split('T')[0]}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setReportRequest(prev => ({ 
                      ...prev, 
                      start_date: new Date(e.target.value) 
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={reportRequest.end_date.toISOString().split('T')[0]}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setReportRequest(prev => ({ 
                      ...prev, 
                      end_date: new Date(e.target.value) 
                    }))
                  }
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="format">Export Format</Label>
              <Select 
                value={reportRequest.format || 'select-format'}
                onValueChange={(value: 'pdf' | 'excel') =>
                  setReportRequest(prev => ({ ...prev, format: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="select-format" disabled>Select format</SelectItem>
                  <SelectItem value="pdf">PDF Document</SelectItem>
                  <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {isGenerating && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Generating report...</span>
                  <span>{generationProgress}%</span>
                </div>
                <Progress value={generationProgress} className="w-full" />
              </div>
            )}
            
            <Button 
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              {isGenerating ? 'Generating...' : 'Generate & Download'}
            </Button>
          </CardContent>
        </Card>

        {/* Quick Reports */}
        <Card className={cardStyles}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <span>Quick Reports</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {quickReports.map((report, index) => {
                const Icon = report.icon;
                return (
                  <button
                    key={index}
                    className="flex items-center space-x-3 p-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors group text-left"
                  >
                    <div className={`p-2 rounded-lg ${report.color} text-white group-hover:scale-110 transition-transform`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600">
                        {report.title}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {report.description}
                      </p>
                    </div>
                    <Download className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Analytics */}
      <Card className={cardStyles}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-600" />
              <span>Advanced Analytics Dashboard</span>
            </div>
            <Button variant="outline" size="sm">
              <TrendingUp className="mr-2 h-4 w-4" />
              View Full Dashboard
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Patient Analytics */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center">
                <Users className="h-4 w-4 mr-2 text-blue-600" />
                Patient Analytics
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>New Patients (Month)</span>
                  <span className="font-medium">89</span>
                </div>
                <Progress value={75} className="h-2" />
                <div className="flex justify-between text-sm">
                  <span>Return Rate</span>
                  <span className="font-medium">92%</span>
                </div>
                <Progress value={92} className="h-2" />
              </div>
            </div>
            
            {/* Clinical Analytics */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center">
                <TestTube className="h-4 w-4 mr-2 text-purple-600" />
                Clinical Analytics
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Lab Test Completion</span>
                  <span className="font-medium">96%</span>
                </div>
                <Progress value={96} className="h-2" />
                <div className="flex justify-between text-sm">
                  <span>Avg. Turnaround Time</span>
                  <span className="font-medium">2.3 hrs</span>
                </div>
                <Progress value={85} className="h-2" />
              </div>
            </div>
            
            {/* Financial Analytics */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center">
                <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                Financial Analytics
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Collection Rate</span>
                  <span className="font-medium">94%</span>
                </div>
                <Progress value={94} className="h-2" />
                <div className="flex justify-between text-sm">
                  <span>Outstanding Payments</span>
                  <span className="font-medium">6%</span>
                </div>
                <Progress value={6} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
