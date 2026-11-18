import React, { useState } from 'react';
import { Mail, MapPin, Plus, X } from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import { CategoryChip, SupplierStatusBadge } from './StatusBadge';

export function SuppliersScreen() {
  const { suppliers, skus, createSupplier } = useLedger();
  const [modalOpen, setModalOpen] = useState(false);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [region, setRegion] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('10');
  const [activeCategory, setActiveCategory] = useState('Sensors');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await createSupplier({
      name,
      code,
      region,
      contactEmail,
      leadTimeDays: Number(leadTimeDays),
      activeCategory,
    });
    if (!res.ok) {
      setError(res.error || 'Unable to onboard supplier.');
      return;
    }
    setName('');
    setCode('');
    setRegion('');
    setContactEmail('');
    setLeadTimeDays('10');
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-[32px] font-semibold tracking-tight text-[#17211E]">
            Suppliers &amp; SLA Directory
          </h1>
          <p className="text-sm text-[#7C8982] mt-1">
            Approved manufacturing partners, standard lead times, and on-time delivery compliance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#14211D] hover:bg-[#23332D] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Onboard Supplier</span>
        </button>
      </div>

      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F5F7F3] border-b border-[#E2E8E4] h-10 text-[12px] font-display font-semibold uppercase tracking-wider text-[#7C8982]">
                <th className="px-4">Partner</th>
                <th className="px-4">Region &amp; Contact</th>
                <th className="px-4">Category</th>
                <th className="px-4 text-right">SKUs Supplied</th>
                <th className="px-4 text-right">Lead Time</th>
                <th className="px-4">On-Time SLA</th>
                <th className="px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E4] text-[13px]">
              {suppliers.map((sup) => {
                const suppliedCount = skus.filter((s) => s.supplierId === sup.id).length;
                const slaGood = sup.onTimeRate >= 92;
                return (
                  <tr key={sup.id} className="h-16 bg-white hover:bg-[#F9FAF7] transition-colors">
                    <td className="px-4">
                      <div className="font-mono text-xs font-semibold text-[#7C8982]">
                        {sup.code}
                      </div>
                      <div className="font-semibold text-[#17211E]">{sup.name}</div>
                    </td>
                    <td className="px-4">
                      <div className="flex items-center gap-1.5 text-xs text-[#17211E]">
                        <MapPin className="w-3.5 h-3.5 text-[#7C8982]" />
                        <span>{sup.region}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#7C8982] mt-0.5">
                        <Mail className="w-3 h-3" />
                        <span>{sup.contactEmail}</span>
                      </div>
                    </td>
                    <td className="px-4">
                      <CategoryChip label={sup.activeCategory} />
                    </td>
                    <td className="px-4 text-right font-mono font-semibold tabular-nums-lining text-[#17211E]">
                      {suppliedCount}
                    </td>
                    <td className="px-4 text-right font-mono tabular-nums-lining text-[#434846] whitespace-nowrap">
                      {sup.leadTimeDays} days
                    </td>
                    <td className="px-4 min-w-[160px]">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-mono font-semibold tabular-nums-lining text-[#17211E]">
                          {sup.onTimeRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#E2E8E4] overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, sup.onTimeRate)}%` }}
                          className={`h-full rounded-full ${
                            slaGood ? 'bg-[#C7E78B]' : 'bg-[#E9A18D]'
                          }`}
                        />
                      </div>
                    </td>
                    <td className="px-4">
                      <SupplierStatusBadge status={sup.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Supplier Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#14211D]/60 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sup-modal-title"
        >
          <div className="modal-surface rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#E2E8E4]">
              <h2 id="sup-modal-title" className="font-display text-lg font-semibold text-[#17211E]">
                Onboard Approved Supplier
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close supplier modal"
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
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="sup-code" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                    Code *
                  </label>
                  <input
                    id="sup-code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="SUP-VLT"
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] text-sm font-mono uppercase focus:border-[#14211D] focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label htmlFor="sup-name" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                    Company Name *
                  </label>
                  <input
                    id="sup-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Voltaic Precision Controls"
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] text-sm focus:border-[#14211D] focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sup-region" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                    City / Region *
                  </label>
                  <input
                    id="sup-region"
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="Zurich, CH"
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] text-sm focus:border-[#14211D] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="sup-cat" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                    Primary Category *
                  </label>
                  <select
                    id="sup-cat"
                    value={activeCategory}
                    onChange={(e) => setActiveCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] bg-white text-sm focus:border-[#14211D] focus:outline-none"
                  >
                    <option value="Sensors">Sensors</option>
                    <option value="Actuators">Actuators</option>
                    <option value="Telemetry">Telemetry</option>
                    <option value="Power">Power</option>
                    <option value="Enclosures">Enclosures</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label htmlFor="sup-email" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                    Dispatch Email *
                  </label>
                  <input
                    id="sup-email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="orders@voltaic.ch"
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] text-sm focus:border-[#14211D] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="sup-lead" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                    Lead (Days) *
                  </label>
                  <input
                    id="sup-lead"
                    type="number"
                    min={1}
                    value={leadTimeDays}
                    onChange={(e) => setLeadTimeDays(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] text-sm font-mono tabular-nums-lining focus:border-[#14211D] focus:outline-none"
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-[#E2E8E4] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-10 px-4 rounded-lg border border-[#E2E8E4] text-sm font-semibold text-[#17211E] hover:bg-[#F5F7F3] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-lg bg-[#C7E78B] hover:bg-[#B8DC7A] text-[#14211D] text-sm font-bold cursor-pointer"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
