import React from 'react'
import { CreditCard, X, User, Mail, Phone, Lock } from 'lucide-react'
import { OrgLogo } from '../OrgLogo'

export interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  selectedOrgName: string
  selectedOrgId: number | string
  selectedOrgAmount: number
  paymentSender: {
    name: string
    phone: string
    email: string
  }
  onSenderChange: (updated: { name: string; phone: string; email: string }) => void
  onSubmit: (e: React.FormEvent) => void
  mode?: 'single' | 'bulk'
  candidateCount?: number
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  selectedOrgName,
  selectedOrgId,
  selectedOrgAmount,
  paymentSender,
  onSenderChange,
  onSubmit,
  mode = 'single',
  candidateCount = 1,
}) => {
  if (!isOpen) return null

  const displayAmount = selectedOrgAmount ? selectedOrgAmount.toFixed(2) : '470.82'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-scale-up">
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-6 text-white relative">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-[#10B981]">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                  Payment Gateway Checkout
                </span>
                <h3 className="text-lg font-black text-white">
                  {mode === 'bulk' ? 'Batch Payer & Contact Details' : 'Payer Contact Details'}
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-300 mt-2">
            Confirm your receipt &amp; contact information for Razorpay transaction processing and instant invoice dispatch.
          </p>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={onSubmit} className="p-6 space-y-5">
          {/* Target Enterprise & Itemized Amount Pill */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <OrgLogo name={selectedOrgName} className="w-10 h-10 rounded-xl shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Target Enterprise
                </p>
                <h4 className="text-sm font-black text-slate-900 truncate">{selectedOrgName}</h4>
                {mode === 'bulk' && (
                  <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {candidateCount} Candidates Batch
                  </span>
                )}
              </div>
            </div>

            <div className="text-right shrink-0 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Due
              </span>
              <span className="text-base font-black text-emerald-700 font-mono">
                ₹{displayAmount}
              </span>
            </div>
          </div>

          {/* Form Inputs for paymentSender */}
          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Payer / Client Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={paymentSender.name}
                  onChange={(e) =>
                    onSenderChange({ ...paymentSender, name: e.target.value })
                  }
                  placeholder="Enter payer full name"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#0680A6] focus:ring-2 focus:ring-[#0680A6]/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Client Email Address (Receipt &amp; Confirmation) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={paymentSender.email}
                  onChange={(e) =>
                    onSenderChange({ ...paymentSender, email: e.target.value })
                  }
                  placeholder="e.g. client@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#0680A6] focus:ring-2 focus:ring-[#0680A6]/10 outline-none transition-all"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 pl-1 font-medium">
                Official client email used to associate candidate verification records and send receipt.
              </p>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Contact Mobile Number (10-digits) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  maxLength={10}
                  required
                  value={paymentSender.phone}
                  onChange={(e) =>
                    onSenderChange({
                      ...paymentSender,
                      phone: e.target.value.replace(/\D/g, '').slice(0, 10),
                    })
                  }
                  placeholder="Enter 10-digit mobile number"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#0680A6] focus:ring-2 focus:ring-[#0680A6]/10 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-all cursor-pointer text-xs sm:text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-[#10B981] to-[#5850EC] hover:brightness-110 hover:shadow-[0_8px_25px_rgba(16,185,129,0.3)] text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Pay ₹{displayAmount} via Razorpay</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PaymentModal
