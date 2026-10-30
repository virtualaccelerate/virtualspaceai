import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const IconButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, title, "aria-label": label, ...props }, ref) => (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button {...props} ref={ref} size="icon" aria-label={label ?? title}>
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{title ?? label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
);
IconButton.displayName = "IconButton";