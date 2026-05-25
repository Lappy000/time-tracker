import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import { format, addDays, subDays } from 'date-fns';

export type DateRange = 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom';

interface DateRangePickerProps {
  selectedRange: DateRange;
  onRangeChange: (range: DateRange) => void;
  customStartDate?: string;
  customEndDate?: string;
  onCustomRangeChange?: (startDate: string, endDate: string) => void;
}

const rangeOptions: { value: DateRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All Time' }
];

export function DateRangePicker({
  selectedRange,
  onRangeChange,
  customStartDate,
  customEndDate,
  onCustomRangeChange
}: DateRangePickerProps) {
  // Navigate to previous/next day when in today or yesterday mode
  const handlePrevious = () => {
    if (selectedRange === 'today') {
      onRangeChange('yesterday');
    } else if (selectedRange === 'yesterday') {
      const twoDaysAgo = format(subDays(new Date(), 2), 'yyyy-MM-dd');
      onCustomRangeChange?.(twoDaysAgo, twoDaysAgo);
    } else if (selectedRange === 'custom' && customStartDate && customEndDate) {
      const startDate = new Date(customStartDate);
      const endDate = new Date(customEndDate);
      const diff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diff <= 1) {
        // Single day, go to previous day
        const prevDay = format(subDays(startDate, 1), 'yyyy-MM-dd');
        onCustomRangeChange?.(prevDay, prevDay);
      } else {
        // Range, shift the entire range
        const newStart = format(subDays(startDate, diff + 1), 'yyyy-MM-dd');
        const newEnd = format(subDays(endDate, diff + 1), 'yyyy-MM-dd');
        onCustomRangeChange?.(newStart, newEnd);
      }
    }
  };

  const handleNext = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    if (selectedRange === 'yesterday') {
      onRangeChange('today');
    } else if (selectedRange === 'custom' && customStartDate && customEndDate) {
      const startDate = new Date(customStartDate);
      const endDate = new Date(customEndDate);
      const diff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const nextEnd = format(addDays(endDate, diff + 1), 'yyyy-MM-dd');
      
      // Don't go past today
      if (nextEnd <= today) {
        const nextStart = format(addDays(startDate, diff + 1), 'yyyy-MM-dd');
        onCustomRangeChange?.(nextStart, nextEnd);
      }
    }
  };

  const isNextDisabled = selectedRange === 'today' ||
    selectedRange === 'week' ||
    selectedRange === 'month' ||
    selectedRange === 'all' ||
    Boolean(customEndDate && customEndDate >= format(new Date(), 'yyyy-MM-dd'));

  return (
    <div className="flex items-center gap-2">
      {/* Navigation arrows */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevious}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNext}
          disabled={isNextDisabled}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Quick range buttons */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
        {rangeOptions.map((option) => (
          <Button
            key={option.value}
            variant={selectedRange === option.value ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onRangeChange(option.value)}
            className={`h-7 px-3 text-xs ${
              selectedRange === option.value 
                ? 'bg-background shadow-sm' 
                : 'hover:bg-background/50'
            }`}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Date display */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg text-sm">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-foreground font-medium">
          {getDateRangeLabel(selectedRange, customStartDate, customEndDate)}
        </span>
      </div>
    </div>
  );
}

function getDateRangeLabel(
  range: DateRange, 
  customStart?: string, 
  customEnd?: string
): string {
  const today = new Date();
  
  switch (range) {
    case 'today':
      return format(today, 'MMM d, yyyy');
    case 'yesterday':
      return format(subDays(today, 1), 'MMM d, yyyy');
    case 'week':
      return `Week of ${format(getWeekStart(today), 'MMM d')}`;
    case 'month':
      return format(today, 'MMMM yyyy');
    case 'all':
      return 'All Time';
    case 'custom':
      if (customStart && customEnd) {
        if (customStart === customEnd) {
          return format(new Date(customStart), 'MMM d, yyyy');
        }
        return `${format(new Date(customStart), 'MMM d')} - ${format(new Date(customEnd), 'MMM d, yyyy')}`;
      }
      return 'Custom';
    default:
      return '';
  }
}

function getWeekStart(date: Date): Date {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}