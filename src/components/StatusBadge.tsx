import type { OrderStatus, SkuStatus, SupplierStatus, WarehouseStatus } from '../types/ledger';

export function SkuStatusBadge({ status }: { status: SkuStatus }) {
  if (status === 'in_stock') {
    return (
      <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-[#B6D8C9]/30 text-[#0E4331] text-[11px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-[#28815F]" aria-hidden="true" />
        In Stock
      </span>
    );
  }
  if (status === 'low_stock') {
    return (
      <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-[#E9A18D]/25 text-[#732B1A] text-[11px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-[#C24C2C]" aria-hidden="true" />
        Low Stock
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-[#E9A18D]/40 text-[#732B1A] text-[11px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-[#BA1A1A]" aria-hidden="true" />
      Depleted
    </span>
  );
}

export function CategoryChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-[#C9C2E6]/30 text-[#362C5C] text-[11px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0">
      {label}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const styles: Record<OrderStatus, { bg: string; dot: string; label: string }> = {
    draft: { bg: 'bg-[#E2E8E4]/70 text-[#434846]', dot: 'bg-[#737875]', label: 'Draft' },
    ordered: { bg: 'bg-[#C9C2E6]/35 text-[#362C5C]', dot: 'bg-[#5B4D96]', label: 'Ordered' },
    in_transit: { bg: 'bg-[#C7E78B]/45 text-[#14211D]', dot: 'bg-[#4D671A]', label: 'In Transit' },
    received: { bg: 'bg-[#B6D8C9]/35 text-[#0E4331]', dot: 'bg-[#28815F]', label: 'Fulfilled' },
    cancelled: { bg: 'bg-[#E9A18D]/30 text-[#732B1A]', dot: 'bg-[#C24C2C]', label: 'Cancelled' },
  };
  const cfg = styles[status];
  return (
    <span className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0 ${cfg.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} aria-hidden="true" />
      {cfg.label}
    </span>
  );
}

export function WarehouseStatusBadge({ status }: { status: WarehouseStatus }) {
  if (status === 'operational') {
    return (
      <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-[#B6D8C9]/30 text-[#0E4331] text-[11px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-[#28815F]" aria-hidden="true" />
        Operational
      </span>
    );
  }
  if (status === 'congested') {
    return (
      <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-[#E9A18D]/25 text-[#732B1A] text-[11px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-[#C24C2C]" aria-hidden="true" />
        High Load
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-[#E2E8E4] text-[#434846] text-[11px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-[#737875]" aria-hidden="true" />
      Maintenance
    </span>
  );
}

export function SupplierStatusBadge({ status }: { status: SupplierStatus }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-[#B6D8C9]/30 text-[#0E4331] text-[11px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-[#28815F]" aria-hidden="true" />
        Approved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-[#E9A18D]/25 text-[#732B1A] text-[11px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-[#C24C2C]" aria-hidden="true" />
      SLA Review
    </span>
  );
}
