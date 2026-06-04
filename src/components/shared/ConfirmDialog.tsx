import React from 'react';
import { 
  Modal, 
  ModalContent, 
  ModalTitle, 
  ModalDescription 
} from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  showReasonInput?: boolean;
  reasonPlaceholder?: string;
  isDanger?: boolean;
  isLoading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  showReasonInput = false,
  reasonPlaceholder = 'Enter reason...',
  isDanger = false,
  isLoading = false,
}: ConfirmDialogProps) {
  const [reason, setReason] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      setReason('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm(showReasonInput ? reason : undefined);
  };

  return (
    <Modal open={isOpen} onOpenChange={onClose}>
      <ModalContent 
        showClose={false}
        className="max-w-md w-[95vw] border border-border bg-card rounded-2xl shadow-2xl p-0 overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="p-6 space-y-6">
          <div className="flex gap-3 items-start">
            {isDanger && (
              <div className="h-10 w-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
            )}
            <div className="space-y-1 flex-1">
              <ModalTitle className="text-lg font-bold font-header tracking-tight text-foreground">
                {title}
              </ModalTitle>
              <ModalDescription className="text-xs text-muted-foreground mt-1">
                {description}
              </ModalDescription>
            </div>
          </div>

          {showReasonInput && (
            <div className="space-y-1.5">
              <Label htmlFor="confirm-reason" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Reason for action
              </Label>
              <Input
                id="confirm-reason"
                type="text"
                placeholder={reasonPlaceholder}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="rounded-xl h-10"
              />
            </div>
          )}
        </div>

        <div className="bg-muted/30 border-t border-border px-6 py-4 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="h-10 rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || (showReasonInput && !reason.trim())}
            className={clsx(
              "h-10 rounded-xl font-bold px-4",
              isDanger 
                ? "bg-red-600 text-white hover:bg-red-700" 
                : "bg-primary text-primary-foreground hover:bg-primary/95"
            )}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
