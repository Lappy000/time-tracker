import { Play, Square, Activity, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { useTracking } from '../hooks';
import { cn } from '../lib/utils';

export function TrackingControl() {
  const { isTracking, isIdle, currentApp, loading, startTracking, stopTracking } = useTracking();

  const handleToggle = async () => {
    console.log('TrackingControl: Toggle clicked. isTracking:', isTracking);
    if (isTracking) {
      const result = await stopTracking();
      console.log('TrackingControl: Stop tracking result:', result);
    } else {
      const result = await startTracking();
      console.log('TrackingControl: Start tracking result:', result);
    }
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              "relative flex items-center justify-center w-14 h-14 rounded-full",
              isTracking 
                ? isIdle 
                  ? "bg-warning/20" 
                  : "bg-productive/20" 
                : "bg-muted"
            )}>
              <Activity className={cn(
                "w-6 h-6",
                isTracking 
                  ? isIdle 
                    ? "text-warning" 
                    : "text-productive animate-pulse" 
                  : "text-muted-foreground"
              )} />
              {isTracking && !isIdle && (
                <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-productive rounded-full animate-ping" />
              )}
            </div>
            
            <div>
              <h3 className="font-semibold text-lg">
                {isTracking 
                  ? isIdle 
                    ? 'Idle' 
                    : 'Tracking Active' 
                  : 'Not Tracking'}
              </h3>
              {currentApp ? (
                <p className="text-sm text-muted-foreground">
                  {currentApp.name}
                  {currentApp.title && ` — ${currentApp.title.substring(0, 40)}${currentApp.title.length > 40 ? '...' : ''}`}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {isTracking ? 'Waiting for activity...' : 'Click to start tracking'}
                </p>
              )}
            </div>
          </div>

          <Button 
            size="lg"
            variant={isTracking ? "destructive" : "default"}
            onClick={handleToggle}
            disabled={loading}
            className="min-w-[120px]"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isTracking ? (
              <>
                <Square className="w-4 h-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}