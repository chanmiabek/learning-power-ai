import { Loader2 } from 'lucide-react';

export const Loading = () => (
  <div className="flex justify-center py-20 text-muted-foreground">
    <Loader2 className="h-6 w-6 animate-spin" />
  </div>
);
