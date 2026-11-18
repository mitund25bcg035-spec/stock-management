import React, { useMemo, useState } from 'react';
import { CheckCircle2, Truck, X } from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import type { OrderDirection, OrderStatus } from '../types/ledger';
import { formatCurrency } from '../utils/ledgerEngine';
import { OrderStatusBadge } from './StatusBadge';

interface OrdersScreenProps {
  externalModalOpen?: boolean;
  onCloseExternalModal?: () => void;
}

export function OrdersScreen({
  externalModalOpen = false,
  onCloseExternalModal,
}: OrdersScreenProps) {
  const {
    orders,
    skus,
    warehouses,
    suppliers,
    settings,
    createOrder,
    advanceOrderStatus,
    receiveOrder,
    notify,
  } = useLedger();

  const [statusFilter, setStatusFilter] = useState<'ALL' | OrderStatus>('ALL');
  const [directionFilter, setDirectionFilter] = useState<'ALL' | OrderDirection>('ALL');

  const isModalOpen = externalModalOpen;
  const closeModal = () => {
    onCloseExternalModal?.();
  };

  const [orderNumber, setOrderNumber] = useState('');
  const [direction, setDirection] = useState<OrderDirection>('inbound');
  const [partnerName, setPartnerName] = useState(suppliers[0]?.name || '');
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || '');
  const [skuId, setSkuId] = useState(skus[0]?.id || '');
  const [quantity, setQuantity] = useState('');
  const [etaDate, setEtaDate] = useState('2026-11-28');
  const [error, setError] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
      if (directionFilter !== 'ALL' && o.direction !== directionFilter) return false;
      return true;
    });
  }, [orders, statusFilter, directionFilter]);

  const handleReceive = async (orderId: string) => {
    const res = await receiveOrder(orderId);
    if (!res.ok) {
      notify(res.error || 'Could not process order receipt', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await createOrder({
      orderNumber,
      direction,
      partnerName,
      supplierId: direction === 'inbound' ? supplierId : undefined,
      warehouseId,
      skuId,
      quantity: Number(quantity),
      etaDate,
    });
    if (!res.ok) {
      setError(res.error || 'Unable to create order.');
      return;
    }
    setOrderNumber('');
    setQuantity('');
    closeModal();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-[32px] font-semibold tracking-tight text-[#17211E]">
            Purchase &amp; Dispatch Orders
          </h1>
          <p className="text-sm text-[#7C8982] mt-1">
            Manage inbound replenishment POs and outbound fulfillment dispatches with atomic stock updates.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card-surface p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="inline-flex items-center p-1 rounded-lg bg-[#F5F7F3] border border-[#E2E8E4] self-start">
          {(
            [
              { id: 'ALL', label: 'All Flows' },
              { id: 'inbound', label: 'Inbound PO' },
              { id: 'outbound', label: 'Outbound SO' },
            ] as const
          ).map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDirectionFilter(d.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                directionFilter === d.id
                  ? 'bg-white text-[#14211D] shadow-xs'
                  : 'text-[#7C8982] hover:text-[#17211E]'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className="inline-flex flex-wrap items-center p-1 rounded-lg bg-[#F5F7F3] border border-[#E2E8E4] self-start lg:self-auto">
          {(
            [
              { id: 'ALL', label: 'All Statuses' },
              { id: 'draft', label: 'Draft' },
              { id: 'ordered', label: 'Ordered' },
              { id: 'in_transit', label: 'In Transit' },
              { id: 'received', label: 'Fulfilled' },
            ] as const
          ).map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === st.id
                  ? 'bg-white text-[#14211D] shadow-xs'
                  : 'text-[#7C8982] hover:text-[#17211E]'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="card-surface overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-display text-base font-semibold text-[#17211E]">
              No orders match the selected filters
            </p>
            <p className="text-xs text-[#7C8982] mt-1">
              Switch status tabs or create a new Purchase / Dispatch Order.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F5F7F3] border-b border-[#E2E8E4] h-10 text-[12px] font-display font-semibold uppercase tracking-wider text-[#7C8982]">
                  <th className="px-4">Order #</th>
                  <th className="px-4">Partner &amp; Direction</th>
                  <th className="px-4">SKU &amp; Hub</th>
                  <th className="px-4 text-right">Qty</th>
                  <th className="px-4 text-right">Amount</th>
                  <th className="px-4">ETA</th>
                  <th className="px-4">Status</th>
                  <th className="px-4 text-right">Workflow Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8E4] text-[13px]">
                {filteredOrders.map((ord) => (
                  <tr key={ord.id} className="h-14 bg-white hover:bg-[#F9FAF7] transition-colors">
                    <td className="px-4 font-mono text-xs font-semibold text-[#17211E] whitespace-nowrap">
                      {ord.orderNumber}
                    </td>
                    <td className="px-4">
                      <div className="font-semibold text-[#17211E]">{ord.partnerName}</div>
                      <div className="text-[11px] uppercase tracking-wider text-[#7C8982] font-semibold">
                        {ord.direction === 'inbound' ? 'Inbound PO' : 'Outbound SO'}
                      </div>
                    </td>
                    <td className="px-4">
                      <div className="font-medium text-[#17211E]">
                        <span className="font-mono text-xs text-[#7C8982] mr-1.5">
                          {ord.skuCode}
                        </span>
                        {ord.skuName}
                      </div>
                      <div className="text-[11px] text-[#7C8982]">{ord.warehouseName}</div>
                    </td>
                    <td className="px-4 text-right font-mono font-semibold tabular-nums-lining text-[#17211E]">
                      {ord.quantity.toLocaleString()}
                    </td>
                    <td className="px-4 text-right font-mono font-semibold tabular-nums-lining text-[#17211E] whitespace-nowrap">
                      {formatCurrency(ord.totalAmount, settings.currency)}
                    </td>
                    <td className="px-4 font-mono text-xs text-[#434846] whitespace-nowrap">
                      {ord.etaDate}
                    </td>
                    <td className="px-4">
                      <OrderStatusBadge status={ord.status} />
                    </td>
                    <td className="px-4 text-right whitespace-nowrap">
                      {ord.status === 'draft' && (
                        <button
                          type="button"
                          onClick={() => void advanceOrderStatus(ord.id, 'ordered')}
                          className="h-8 px-3 rounded-lg border border-[#E2E8E4] hover:bg-[#F5F7F3] text-xs font-semibold text-[#17211E] cursor-pointer"
                        >
                          Submit PO
                        </button>
                      )}
                      {ord.status === 'ordered' && (
                        <button
                          type="button"
                          onClick={() => void advanceOrderStatus(ord.id, 'in_transit')}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#E2E8E4] hover:bg-[#F5F7F3] text-xs font-semibold text-[#17211E] cursor-pointer"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Mark In Transit</span>
                        </button>
                      )}
                      {ord.status === 'in_transit' && (
                        <button
                          type="button"
                          onClick={() => void handleReceive(ord.id)}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#C7E78B] hover:bg-[#B8DC7A] text-xs font-bold text-[#14211D] cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>
                            {ord.direction === 'inbound' ? 'Receive Shipment' : 'Confirm Dispatch'}
                          </span>
                        </button>
                      )}
                      {ord.status === 'received' && (
                        <span className="text-xs text-[#7C8982] font-medium">Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Order Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#14211D]/60 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-modal-title"
        >
          <div className="modal-surface rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#E2E8E4]">
              <h2 id="order-modal-title" className="font-display text-lg font-semibold text-[#17211E]">
                Create Purchase / Dispatch Order
              </h2>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close order modal"
                className="w-9 h-9 rounded-lg border border-[#E2E8E4] flex items-center justify-center text-[#434846] hover:bg-[#F5F7F3] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-[#E9A18D]/25 border border-[#E9A18D] text-xs font-medium text-[#732B1A]">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ord-num" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                    Order Number *
                  </label>
                  <input
                    id="ord-num"
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                    placeholder="PO-26-901"
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] text-sm font-mono uppercase focus:border-[#14211D] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="ord-dir" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                    Direction *
                  </label>
                  <select
                    id="ord-dir"
                    value={direction}
                    onChange={(e) => {
                      const d = e.target.value as OrderDirection;
                      setDirection(d);
                      if (d === 'inbound' && suppliers[0]) {
                        setSupplierId(suppliers[0].id);
                        setPartnerName(suppliers[0].name);
                      } else {
                        setPartnerName('');
                      }
                    }}
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] bg-white text-sm focus:border-[#14211D] focus:outline-none"
                  >
                    <option value="inbound">Inbound Purchase Order</option>
                    <option value="outbound">Outbound Sales Dispatch</option>
                  </select>
                </div>
              </div>

              {direction === 'inbound' ? (
                <div>
                  <label htmlFor="ord-sup" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                    Supplier *
                  </label>
                  <select
                    id="ord-sup"
                    value={supplierId}
                    onChange={(e) => {
                      setSupplierId(e.target.value);
                      const sup = suppliers.find((s) => s.id === e.target.value);
                      if (sup) setPartnerName(sup.name);
                    }}
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] bg-white text-sm focus:border-[#14211D] focus:outline-none"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.leadTimeDays}d lead)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label htmlFor="ord-partner" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                    Customer / Destination Partner *
                  </label>
                  <input
                    id="ord-partner"
                    type="text"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    placeholder="e.g. Munich Automation GmbH"
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] text-sm focus:border-[#14211D] focus:outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ord-sku" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                    SKU *
                  </label>
                  <select
                    id="ord-sku"
                    value={skuId}
                    onChange={(e) => setSkuId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] bg-white text-sm focus:border-[#14211D] focus:outline-none"
                  >
                    {skus.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} — {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="ord-wh" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                    Destination / Origin Hub *
                  </label>
                  <select
                    id="ord-wh"
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] bg-white text-sm focus:border-[#14211D] focus:outline-none"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ord-qty" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                    Order Quantity *
                  </label>
                  <input
                    id="ord-qty"
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="50"
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] text-sm font-mono tabular-nums-lining focus:border-[#14211D] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="ord-eta" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                    Target ETA Date *
                  </label>
                  <input
                    id="ord-eta"
                    type="date"
                    value={etaDate}
                    onChange={(e) => setEtaDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] text-sm font-mono focus:border-[#14211D] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#E2E8E4] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="h-10 px-4 rounded-lg border border-[#E2E8E4] text-sm font-semibold text-[#17211E] hover:bg-[#F5F7F3] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-lg bg-[#C7E78B] hover:bg-[#B8DC7A] text-[#14211D] text-sm font-bold cursor-pointer"
                >
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
