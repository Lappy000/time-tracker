import { Minus, Square, X } from 'lucide-react';
import { Button } from './ui/button';
import { useIpc } from '../hooks';

export function TitleBar() {
  const { send, channels } = useIpc();

  const handleMinimize = () => send(channels.APP.MINIMIZE);
  const handleMaximize = () => send(channels.APP.MAXIMIZE);
  const handleClose = () => send(channels.APP.CLOSE);

  return (
    <div className="flex items-center justify-between h-10 bg-background border-b border-border drag-region">
      <div className="flex items-center gap-2 px-4">
        <div className="w-3 h-3 rounded-full bg-primary" />
        <span className="text-sm font-medium no-drag">Time Tracker</span>
      </div>
      
      <div className="flex no-drag">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-none hover:bg-muted"
          onClick={handleMinimize}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-none hover:bg-muted"
          onClick={handleMaximize}
        >
          <Square className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-none hover:bg-destructive hover:text-destructive-foreground"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}