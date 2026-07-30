import React from 'react';
import { 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalTitle, 
  ModalDescription
} from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Check, Copy, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ApiKeyRevealModalProps {
  isOpen: boolean;
  apiKey: string;
  tenantName: string;
  tenantPlan?: string;
  ownerEmail?: string;
  ownerPassword?: string;
  onDone?: () => void;
  onClose?: () => void;
}

export default function ApiKeyRevealModal({
  isOpen,
  apiKey,
  tenantName,
  tenantPlan = 'full_suite',
  ownerEmail,
  ownerPassword,
  onDone,
  onClose,
}: ApiKeyRevealModalProps) {
  const handleClose = () => {
    if (onDone) onDone();
    if (onClose) onClose();
  };
  const [copied, setCopied] = React.useState(false);
  const [checkboxChecked, setCheckboxChecked] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    toast.success('API key copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  const getPlanName = (plan: string) => {
    if (plan === 'full_suite') return 'Full Suite';
    if (plan === 'ecommerce_only') return 'Ecommerce Only';
    return 'POS Only';
  };

  return (
    <Modal open={isOpen}>
      <ModalContent
        showClose={false}
        className="max-w-md w-[95vw] border border-border bg-card rounded-2xl shadow-2xl p-0 overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="p-6 space-y-6">
          {/* Header & Success Icon */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500">
              <Check className="h-6 w-6 stroke-[3]" />
            </div>
            <div className="space-y-1">
              <ModalTitle className="text-xl font-bold font-header tracking-tight text-foreground">
                Tenant created — save this API key now
              </ModalTitle>
              <ModalDescription className="text-xs text-muted-foreground">
                Merchant account created successfully.
              </ModalDescription>
            </div>
          </div>

          {/* Alert / Warning block */}
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 text-red-500 text-xs">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div className="space-y-1">
              <span className="font-bold">Important Security Warning</span>
              <p className="text-muted-foreground text-red-400">
                This key will never be shown again. Copy it before closing this window. Loss of this key requires generating a new credential.
              </p>
            </div>
          </div>

          {/* API Key Box */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Generated API Key
            </label>
            <div className="flex items-center gap-2 bg-secondary border border-border rounded-xl p-3 pl-4 relative group">
              <code className="text-xs font-mono text-foreground font-semibold select-all break-all pr-12">
                {apiKey}
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopy}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-3 rounded-lg hover:bg-card flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-transparent hover:border-border transition-all duration-200"
              >
                {copied ? (
                  <span className="text-green-500 font-bold">Copied ✓</span>
                ) : (
                  <>
                     <Copy className="h-3.5 w-3.5" /> Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Tenant Details Confirmation */}
          <div className="bg-muted/30 border border-border/50 rounded-xl p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Merchant Name:</span>
              <span className="font-semibold text-foreground">{tenantName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan Tier:</span>
              <span className="font-semibold text-foreground">{getPlanName(tenantPlan)}</span>
            </div>
            {ownerEmail && (
              <div className="flex justify-between border-t border-border/40 pt-2 mt-2">
                <span className="text-muted-foreground">Owner Account:</span>
                <span className="font-semibold text-foreground">{ownerEmail}</span>
              </div>
            )}
            {ownerPassword && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Default Password:</span>
                <span className="font-semibold text-foreground font-mono">{ownerPassword}</span>
              </div>
            )}
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={checkboxChecked}
              onChange={(e) => setCheckboxChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input text-primary bg-card focus:ring-primary focus:ring-offset-background cursor-pointer accent-primary"
            />
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              I have copied and saved the API key securely.
            </span>
          </label>
        </div>

        {/* Footer Actions */}
        <div className=" px-6 py-4 flex justify-end">
          <Button
            onClick={handleClose}
            disabled={!checkboxChecked}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/95 disabled:opacity-50 font-bold"
          >
            Done
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
