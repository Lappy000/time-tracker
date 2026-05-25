import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Download, Calendar, DollarSign, Clock } from 'lucide-react';
import type { BillingReport as BillingReportType, ProjectTimeRange } from '@/hooks/useProjects';

interface BillingReportProps {
  report: BillingReportType | null;
  dateRange: ProjectTimeRange;
  onDateRangeChange: (range: ProjectTimeRange) => void;
  onClose: () => void;
}

export function BillingReport({
  report,
  dateRange,
  onDateRangeChange,
  onClose,
}: BillingReportProps) {
  const [startDate, setStartDate] = useState(dateRange.startDate.split('T')[0]);
  const [endDate, setEndDate] = useState(dateRange.endDate.split('T')[0]);

  useEffect(() => {
    setStartDate(dateRange.startDate.split('T')[0]);
    setEndDate(dateRange.endDate.split('T')[0]);
  }, [dateRange]);

  const handleApplyDateRange = () => {
    onDateRangeChange({
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate + 'T23:59:59').toISOString(),
    });
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatHours = (hours: number): string => {
    return hours.toFixed(1) + 'h';
  };

  const formatDateRange = (): string => {
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  };

  const exportToCSV = () => {
    if (!report) return;

    const headers = ['Project', 'Client', 'Hours', 'Rate', 'Amount'];
    const rows = report.entries.map((entry) => [
      entry.projectName,
      entry.client || '',
      entry.totalHours.toFixed(2),
      entry.hourlyRate?.toString() || '',
      entry.billableAmount.toFixed(2),
    ]);
    
    rows.push(['', '', '', 'Total:', report.totalBillableAmount.toFixed(2)]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `billing-report-${startDate}-to-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Billing Report
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Range Selector */}
        <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex-1 min-w-[140px]">
            <label className="text-sm font-medium mb-1 block">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-sm font-medium mb-1 block">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <Button onClick={handleApplyDateRange}>
            <Calendar className="h-4 w-4 mr-2" />
            Apply
          </Button>
        </div>

        {/* Report Content */}
        {report ? (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  Total Hours
                </div>
                <p className="text-2xl font-bold">{formatHours(report.totalHours)}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  Total Billable
                </div>
                <p className="text-2xl font-bold text-green-500">
                  {formatCurrency(report.totalBillableAmount)}
                </p>
              </div>
            </div>

            {/* Entries Table */}
            {report.entries.length > 0 ? (
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left text-sm font-medium px-4 py-3">Project</th>
                      <th className="text-left text-sm font-medium px-4 py-3">Client</th>
                      <th className="text-right text-sm font-medium px-4 py-3">Hours</th>
                      <th className="text-right text-sm font-medium px-4 py-3">Rate</th>
                      <th className="text-right text-sm font-medium px-4 py-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.entries.map((entry) => (
                      <tr key={entry.projectId} className="border-t border-border">
                        <td className="px-4 py-3 text-sm">{entry.projectName}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {entry.client || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          {formatHours(entry.totalHours)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          {entry.hourlyRate ? formatCurrency(entry.hourlyRate) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium">
                          {entry.billableAmount > 0
                            ? formatCurrency(entry.billableAmount)
                            : '-'}
                        </td>
                      </tr>
                    ))}
                    {/* Total row */}
                    <tr className="border-t-2 border-border bg-muted/50">
                      <td colSpan={4} className="px-4 py-3 text-sm font-medium text-right">
                        Total:
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-green-500">
                        {formatCurrency(report.totalBillableAmount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No billable entries for the selected period.
              </p>
            )}

            {/* Export Button */}
            {report.entries.length > 0 && (
              <div className="flex justify-end">
                <Button variant="outline" onClick={exportToCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Loading billing report...
          </p>
        )}

        {/* Close button */}
        <div className="pt-2">
          <Button variant="secondary" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}