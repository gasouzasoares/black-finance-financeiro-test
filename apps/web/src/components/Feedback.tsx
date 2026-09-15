import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ReactNode } from 'react';

export function Feedback({ children, error = false, action }: { children: ReactNode; error?: boolean; action?: ReactNode }) {
  const Icon = error ? AlertCircle : CheckCircle2;
  return <Alert variant={error ? 'destructive' : 'default'} role={error ? 'alert' : 'status'} className={error ? 'app-feedback error' : 'app-feedback'}><Icon /><AlertDescription><span>{children}</span>{action}</AlertDescription></Alert>;
}
