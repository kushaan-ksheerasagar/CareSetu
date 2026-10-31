import React, { useState } from 'react';
import { Package, ShieldCheck, UserCheck, AlertCircle, ShoppingBag, MapPin, ArrowRight, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { CartState, PreviousOrder } from '../types';

interface MedicineOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartState;
  previousOrder: PreviousOrder | null;
  onAuthorizeSelf: () => void;
  onRequestGuardianApproval: () => void;
}

export const MedicineOrderModal: React.FC<MedicineOrderModalProps> = ({
  isOpen,
  onClose,
  cart,
  previousOrder,
  onAuthorizeSelf,
  onRequestGuardianApproval
}) => {
  const [confirmedChoice, setConfirmedChoice] = useState<'none' | 'self' | 'guardian'>('none');

  if (!isOpen) return null;

  const handleSelfAuth = () => {
    setConfirmedChoice('self');
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 }
    });
    setTimeout(() => {
      onAuthorizeSelf();
    }, 1200);
  };

  const handleGuardianAuth = () => {
    setConfirmedChoice('guardian');
    setTimeout(() => {
      onRequestGuardianApproval();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl border border-[#E7E1D6] shadow-2xl max-w-2xl w-full overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Top Bar */}
        <div className="bg-gradient-to-r from-teal-800 to-[#0F294A] text-white p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-teal-300" />
            </div>
            <div>
              <span className="text-xs uppercase font-bold text-teal-200 tracking-wider">
                Primary Demonstration Workflow
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                Medicine Refill Summary
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-[#0F294A]">
          {/* Historical Order Match Badge */}
          {previousOrder && (
            <div className="bg-[#FAF8F3] border border-[#EBE3D3] rounded-2xl p-4 flex items-start gap-3">
              <Package className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-slate-800 uppercase tracking-wide block mb-0.5">
                  Matched from Medical History ({previousOrder.order_id})
                </span>
                <p className="text-slate-600 font-medium">
                  Verified against previously approved prescription from <strong>{previousOrder.date_display}</strong> via <strong>{previousOrder.pharmacy}</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Itemized Medicine Cart */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Medicines in Cart ({cart.items.length})
              </span>
              <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Pharmacy Catalogue
              </span>
            </div>

            <div className="space-y-2.5">
              {cart.items.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-[#E9E4DC] p-3.5 flex items-center justify-between shadow-2xs hover:border-teal-300 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center font-bold text-teal-800 text-sm">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-base text-[#0F294A]">
                          {item.name}
                        </h4>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-700">
                          {item.dosage}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Qty: {item.quantity} tablets • Rx Verified
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-bold text-[#0F294A]">
                      ₹{item.price_per_pack || item.price || 0}
                    </span>
                    <span className="block text-[10px] text-slate-400 font-medium">
                      Inclusive of GST
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Bill Breakdown */}
          <div className="bg-[#F8F5EE] rounded-2xl border border-[#E7DFD0] p-4 text-xs space-y-2">
            <div className="flex justify-between text-slate-600 font-medium">
              <span>Medicines Subtotal:</span>
              <span className="font-bold text-slate-800">₹{cart.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600 font-medium">
              <span>Standard Home Delivery:</span>
              <span className="text-emerald-700 font-bold">
                {cart.delivery_fee === 0 ? "FREE (Elder Healthcare CareSetu Waiver)" : `₹${cart.delivery_fee}`}
              </span>
            </div>
            <div className="border-t border-[#DFD6C5] pt-2 flex justify-between text-sm font-bold text-[#0F294A]">
              <span>Total Payable at Delivery:</span>
              <span className="text-teal-900 text-base">₹{cart.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="flex items-start gap-2.5 text-xs text-slate-600 bg-white rounded-xl border border-slate-200 p-3">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-700 block">Deliver To Registered Home Address:</span>
              <span>Flat 302, Gokul Nilaya, 8th Main, Malleshwaram, Bengaluru 560003</span>
            </div>
          </div>

          {/* Core Principle Notice */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-amber-950 uppercase block">
                Safety Principle: AI Coordinates. Humans Authorize.
              </span>
              <p className="text-amber-900 font-medium mt-0.5">
                CareSetu will never auto-debit your bank or finalize medicine without human authorization. Choose your preferred authorization method below:
              </p>
            </div>
          </div>

          {/* Confirmation Success Feedback */}
          {confirmedChoice === 'self' && (
            <div className="p-4 bg-emerald-100 border border-emerald-300 rounded-2xl text-center text-emerald-900 font-bold text-sm animate-bounce">
              ✓ Order Authorized by Ramachandra ji! Dispatch initiated with Apollo Pharmacy.
            </div>
          )}

          {confirmedChoice === 'guardian' && (
            <div className="p-4 bg-teal-100 border border-teal-300 rounded-2xl text-center text-teal-900 font-bold text-sm animate-bounce">
              ✓ Authorization Request Sent to Priya Rao (+91 98450 12345). Awaiting confirmation!
            </div>
          )}

          {/* Two Big Clickable Action Buttons for Elderly Choice */}
          {confirmedChoice === 'none' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleSelfAuth}
                className="p-4 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-left transition transform active:scale-98 shadow-md flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5 text-teal-200 text-xs font-semibold uppercase">
                    <UserCheck className="w-4 h-4" />
                    Option 1
                  </div>
                  <div className="text-base font-bold mt-1">Authorize Myself</div>
                  <div className="text-xs text-teal-200 font-normal mt-0.5">
                    Proceed as Independent Elder
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-teal-300" />
              </button>

              <button
                onClick={handleGuardianAuth}
                className="p-4 rounded-2xl bg-[#0F294A] hover:bg-[#1E3A5F] text-white font-bold text-left transition transform active:scale-98 shadow-md flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5 text-amber-300 text-xs font-semibold uppercase">
                    <ShieldCheck className="w-4 h-4" />
                    Option 2 (Recommended)
                  </div>
                  <div className="text-base font-bold mt-1">Request Priya's Approval</div>
                  <div className="text-xs text-slate-300 font-normal mt-0.5">
                    Send to Daughter (+91 98450 12345)
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-amber-300" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
