import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPlatformTenantProducts, PlatformTenantProduct } from '@/api/platform';
import { useCurrency } from '@/hooks/useCurrency';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { 
  Package, 
  Search, 
  RefreshCw, 
  ShieldCheck, 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';
import { formatShortDate } from '@/utils/date';

interface TenantCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: {
    id: string;
    business_name: string;
  } | null;
}

/**
 * Defensive helper to safely extract numeric values from raw numbers, strings, or { source, parsedValue } wrapper objects
 */
const parseNumericValue = (val: any): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'string') {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  }
  if (typeof val === 'object' && val !== null) {
    if ('parsedValue' in val && typeof val.parsedValue === 'number') return val.parsedValue;
    if ('source' in val && typeof val.source === 'string') {
      const num = parseFloat(val.source);
      return isNaN(num) ? 0 : num;
    }
  }
  return 0;
};

export const TenantCatalogModal: React.FC<TenantCatalogModalProps> = ({
  isOpen,
  onClose,
  tenant,
}) => {
  const { formatGHS } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['platform_tenant_products', tenant?.id, currentPage, pageSize, searchTerm, statusFilter],
    queryFn: () => {
      if (!tenant?.id) throw new Error('Tenant ID required');
      return getPlatformTenantProducts(tenant.id, {
        page: currentPage,
        per_page: pageSize,
        search: searchTerm.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
    },
    enabled: isOpen && !!tenant?.id,
    placeholderData: (previousData) => previousData,
  });

  if (!tenant) return null;

  const products: PlatformTenantProduct[] = data?.products || [];
  
  // Safely normalize both camelCase and snake_case backend pagination payloads
  const rawPagination = (data?.pagination || {}) as any;
  const pagination = {
    page: rawPagination.page ?? currentPage,
    perPage: rawPagination.perPage ?? rawPagination.per_page ?? pageSize,
    total: rawPagination.total ?? rawPagination.total_items ?? products.length,
    pages: rawPagination.pages ?? rawPagination.total_pages ?? Math.max(1, Math.ceil((rawPagination.total ?? products.length) / pageSize)),
    hasNext: Boolean(
      rawPagination.hasNext ?? 
      rawPagination.has_next ?? 
      (currentPage * pageSize < (rawPagination.total ?? rawPagination.total_items ?? 0))
    ),
    hasPrev: Boolean(
      rawPagination.hasPrev ?? 
      rawPagination.has_prev ?? 
      (currentPage > 1)
    ),
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusChange = (status: 'all' | 'active' | 'inactive') => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-6 sm:rounded-xl">
        {/* Header */}
        <DialogHeader className="pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold font-header flex items-center gap-2">
                Product Catalog Audit
                <Badge variant="outline" className="text-[11px] font-normal">
                  {tenant.business_name}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Audit live store inventory, pricing, and category assignments across POS and online storefronts.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Privacy & Governance Notice Banner */}
        <div className="bg-muted/40 border border-border/80 rounded-lg px-3.5 py-2.5 flex items-start gap-2.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <strong className="text-foreground font-medium">Compliance & Audit View:</strong> Public-facing catalog items are visible to platform operators for Acceptable Use Policy (AUP) enforcement and technical support. Merchant proprietary wholesale margins and supplier costs are strictly redacted.
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, SKU, or category..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full h-8 pl-9 pr-3 text-xs rounded-md bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
            {/* Status Filter */}
            <div className="flex items-center rounded-md border border-border p-0.5 bg-secondary/30 text-xs">
              <button
                type="button"
                onClick={() => handleStatusChange('all')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('active')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  statusFilter === 'active'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('inactive')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  statusFilter === 'inactive'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Inactive
              </button>
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground border border-border rounded-md px-2 py-1 bg-secondary/30">
              <span className="text-[10px] uppercase font-semibold">Per page:</span>
              {[10, 20, 50].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => handlePageSizeChange(size)}
                  className={`px-1.5 py-0.5 rounded font-semibold transition-colors ${
                    pageSize === size
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-8 px-2.5 text-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Product Table Container */}
        <div className="flex-1 overflow-auto border border-border rounded-lg min-h-[340px] relative">
          {/* Backdrop spinner during page navigation or filter changes */}
          {isFetching && !isLoading && (
            <Spinner withBackdrop />
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted-foreground">
              <Spinner className="py-2" />
              <p className="text-xs">Loading store catalog...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2 text-center p-6 text-muted-foreground">
              <Package className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-semibold text-foreground">No Products Found</p>
              <p className="text-xs max-w-sm">
                {searchTerm || statusFilter !== 'all'
                  ? 'No items match your active search or filter criteria.'
                  : 'This merchant has not yet created or synced any products in their store catalog.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-secondary/40 border-b border-border sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Product
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Category
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                    SKU / Variants
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] text-right">
                    Price
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] text-center">
                    Stock
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] text-right">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((p) => {
                  const stock = parseNumericValue(p.total_stock);
                  const price = parseNumericValue(p.price);
                  const hasStock = stock > 0;
                  const isLowStock = hasStock && stock <= 5;

                  return (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      {/* Product Name & Image */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          {p.thumbnail ? (
                            <img
                              src={p.thumbnail}
                              alt={p.name}
                              className="h-9 w-9 rounded object-cover border border-border shrink-0 bg-secondary"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded bg-secondary flex items-center justify-center shrink-0 border border-border text-muted-foreground">
                              <Package className="h-4 w-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs">
                              {p.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Created {p.dateCreated ? formatShortDate(p.dateCreated) : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                        <span className="bg-secondary/70 border border-border px-2 py-0.5 rounded text-[11px] font-medium text-foreground">
                          {p.category || 'Uncategorized'}
                        </span>
                      </td>

                      {/* SKU & Variants */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                          <span>{p.sku || 'NO-SKU'}</span>
                          {p.variant_count > 1 && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-sans">
                              {p.variant_count} vars
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Retail Price */}
                      <td className="py-2.5 px-3 text-right font-semibold text-foreground whitespace-nowrap">
                        {formatGHS(price)}
                      </td>

                      {/* Stock Status */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {!hasStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                            Out of stock
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            {stock} (Low)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {stock} units
                          </span>
                        )}
                      </td>

                      {/* Active Status */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            p.isActive
                              ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                              : 'bg-muted text-muted-foreground border border-border'
                          }`}
                        >
                          {p.isActive ? 'Active' : 'Archived'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer with Pagination */}
        <DialogFooter className="pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
          <div className="text-xs text-muted-foreground">
            Total items:{' '}
            <strong className="text-foreground">{pagination.total}</strong>
            {pagination.pages > 1 && (
              <span> · Page <strong>{pagination.page}</strong> of <strong>{pagination.pages}</strong></span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={!pagination.hasPrev || isFetching}
              className="h-8 px-2.5 text-xs font-semibold"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => prev + 1)}
              disabled={!pagination.hasNext || isFetching}
              className="h-8 px-2.5 text-xs font-semibold"
            >
              Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
            <Button variant="default" size="sm" onClick={onClose} className="h-8 px-3 text-xs ml-2">
              Done
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TenantCatalogModal;
