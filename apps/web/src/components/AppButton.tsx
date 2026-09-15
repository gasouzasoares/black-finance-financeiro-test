import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export function AppButton(props: ComponentProps<typeof Button>) {
  const label = props['aria-label'] ?? props.title;
  if (!props.size?.startsWith('icon') || !label) return <Button {...props} />;
  return <Tooltip><TooltipTrigger asChild><Button {...props} aria-label={label} title={undefined} /></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>;
}
