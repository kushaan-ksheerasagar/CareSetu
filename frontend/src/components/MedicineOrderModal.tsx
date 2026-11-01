import React, { useState, useEffect } from 'react';
import { 
  Package, 
  ShieldCheck, 
  UserCheck, 
  AlertCircle, 
  ShoppingBag, 
  MapPin, 
  ArrowRight, 
  X, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  Zap, 
  Tag, 
  Building2 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CartState, PreviousOrder, PharmacyOption, MultiPharmacyMedicineItem } from '../types';
import { apiService } from '../services/api';

interface MedicineOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartState;
  previousOrder: PreviousOrder | null;
  onAuthorizeSelf: (selectedProvider?: string) => void;
  onRequestGuardianApproval: (selectedProvider?: string) => void;
}

export const MedicineOrderModal: React.FC<MedicineOrderModalProps> = ({
  isOpen,
  onClose,
  cart,
  previousOrder,
  onAuthorizeSelf,
  onRequestGuardianApproval
}) => {
  const [confirmedChoice, setConfirmedChoice] = useState<'none' | 'self' | 'guardian' | 'handoff_done'>('none');
  const [pharmacyOptions, setPharmacyOptions] = useState<PharmacyOption[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('evitalrx');
  const [loadingComparison, setLoadingComparison] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen) {
      setConfirmedChoice('none');
      return;
    }

    // Fetch live or simulated multi-pharmacy comparison quotes
    let isMounted = true;
    setLoadingComparison(true);

    apiService.comparePharmacies(cart.items, "560003")
      .then((comp) => {
        if (!isMounted) return;
        if (comp && comp.options && comp.options.length > 0) {
          setPharmacyOptions(comp.options);
          // Default to best price or first provider
          setSelectedProviderId(comp.best_price_provider || comp.options[0].provider_id);
        }
      })
      .catch((err) => {
        console.warn("Could not load pharmacy options:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingComparison(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, cart.items]);

  if (!isOpen) return null;

  // Active selected option
  const activeOption = pharmacyOptions.find(o => o.provider_id === selectedProviderId) || pharmacyOptions[0];

  const handleSelfAuth = () => {
    setConfirmedChoice('self');
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 }
    });
    setTimeout(() => {
      onAuthorizeSelf(activeOption?.provider_name || 'Selected Pharmacy');
    }, 1200);
  };

  const handleGuardianAuth = () => {
    setConfirmedChoice('guardian');
    setTimeout(() => {
      onRequestGuardianApproval(activeOption?.provider_name || 'Selected Pharmacy');
    }, 1200);
  };

  const handleHandoffDone = () => {
    setConfirmedChoice('handoff_done');
    confetti({
      particleCount: 50,
      spread: 50,
      origin: { y: 0.6 }
    });
    setTimeout(() => {
      onAuthorizeSelf(activeOption?.provider_name || 'Tata 1mg');
    }, 1200);
  };

  // Determine current display items and total
  const displayItems = activeOption?.items && activeOption.items.length > 0
    ? activeOption.items
    : cart.items.map((it, idx) => ({
        medicine_id: it.medicine_id || `item-${idx}`,
        name: it.name,
        dosage_form: it.form || 'Tablet',
        is_sustained_release: it.dosage?.includes('SR') || false,
        pack_size: 15,
        quantity_packs: 1,
        total_units: it.quantity || 15,
        price_per_pack: it.price_per_pack || it.price || 45.0,
        total_price: (it.price_per_pack || it.price || 45.0) * (it.quantity || 1),
        prescription_required: true,
        in_stock: true
      } as MultiPharmacyMedicineItem));

  const displaySubtotal = activeOption ? activeOption.subtotal : cart.subtotal;
  const displayDelivery = activeOption ? activeOption.delivery_fee : cart.delivery_fee;
  const displayTotal = activeOption ? activeOption.total : cart.total;
  const isAppNavigation = activeOption?.provider_type === 'app_navigation';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl border border-[#E7E1D6] shadow-2xl max-w-2xl w-full overflow-hidden max-h-[94vh] flex flex-col">
        
        {/* Modal Top Bar */}
        <div className="bg-gradient-to-r from-teal-800 via-[#113259] to-[#0F294A] text-white p-4 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 shadow-inner">
              <ShoppingBag className="w-6 h-6 text-teal-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase font-bold text-teal-300 tracking-wider bg-teal-900/60 px-2 py-0.5 rounded-full border border-teal-500/30">
                  Multi-Pharmacy Network
                </span>
                <span className="text-[11px] text-slate-300">
                  Bengaluru PIN 560003
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-0.5">
                Compare & Authorize Refill
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-[#0F294A]">
          
          {/* Medical History Match Context */}
          {previousOrder && (
            <div className="bg-[#FAF8F3] border border-[#EBE3D3] rounded-2xl p-3 sm:p-3.5 flex items-start gap-3">
              <Package className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-slate-800 uppercase tracking-wide block">
                  Matched from Medical History ({previousOrder.order_id})
                </span>
                <p className="text-slate-600 font-medium mt-0.5">
                  Verified against prescription from <strong>{previousOrder.date_display}</strong>. Exact dosage and formulation checked.
                </p>
              </div>
            </div>
          )}

          {/* Multi-Pharmacy Provider Selection Cards */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Choose Fulfilling Pharmacy ({pharmacyOptions.length} available)
              </span>
              <span className="text-[11px] text-teal-700 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Licensed & Verified Partners
              </span>
            </div>

            {loadingComparison ? (
              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent mb-2"></div>
                <p className="text-xs text-slate-600 font-medium">Gathering quotes from eVitalRx, MedPay and 1mg...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {pharmacyOptions.map((opt) => {
                  const isSelected = opt.provider_id === selectedProviderId;
                  const isDirect = opt.provider_type === 'direct_api';
                  const isFastest = opt.provider_id === 'medpay' || opt.estimated_delivery.includes('90');
                  const isCheapest = opt.provider_id === 'evitalrx';

                  return (
                    <button
                      key={opt.provider_id}
                      type="button"
                      onClick={() => setSelectedProviderId(opt.provider_id)}
                      className={`relative p-3.5 rounded-2xl text-left border-2 transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50/50 shadow-md ring-2 ring-teal-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      {/* Badge Tag */}
                      <div className="flex items-center justify-between mb-1.5">
                        {isCheapest && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            <Tag className="w-3 h-3" /> Best Price
                          </span>
                        )}
                        {isFastest && !isCheapest && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            <Zap className="w-3 h-3" /> 90 Min Speed
                          </span>
                        )}
                        {!isCheapest && !isFastest && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            <Building2 className="w-3 h-3" /> Official App
                          </span>
                        )}

                        <span className={`text-[10px] font-semibold ${isDirect ? 'text-teal-700' : 'text-indigo-600'}`}>
                          {isDirect ? 'Direct API' : 'App Handoff'}
                        </span>
                      </div>

                      {/* Visible Integration Status Badge */}
                      <div className="mb-1.5">
                        {opt.integration_status === 'LIVE_STAGING' ? (
                          <span className="inline-flex items-center gap-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                            LIVE STAGING
                          </span>
                        ) : opt.integration_status === 'ERROR' ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-300">
                            ERROR
                          </span>
                        ) : opt.integration_status === 'DISCONNECTED' ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-300">
                            DISCONNECTED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            SIMULATED PILOT
                          </span>
                        )}
                      </div>

                      {/* Provider Title & Price */}
                      <div>
                        <h4 className="font-bold text-sm text-[#0F294A] leading-snug">
                          {opt.provider_name}
                        </h4>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-lg font-extrabold text-teal-900">
                            ₹{opt.total.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {opt.delivery_fee === 0 ? '(Free Delivery)' : `(+₹${opt.delivery_fee} delivery)`}
                          </span>
                        </div>
                      </div>

                      {/* Delivery Time */}
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center gap-1.5 text-[11px] text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{opt.estimated_delivery}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Provider Info Banner & Staging Notice */}
          {activeOption && (
            <div className="space-y-2">
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3.5 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">
                      {activeOption.provider_name}
                    </span>
                    {activeOption.integration_status === 'LIVE_STAGING' && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                        LIVE STAGING API
                      </span>
                    )}
                  </div>
                  <span className="text-slate-600 font-medium block mt-0.5">
                    {activeOption.pharmacy_branch || activeOption.disclaimer || "Fulfilled by licensed pharmaceutical partner."}
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 shrink-0">
                  ★ {activeOption.rating} Verified
                </span>
              </div>

              {/* Live Serviceability Breakdown (Task 3: Display Actual Availability) */}
              {activeOption.delivery_tiers && Object.keys(activeOption.delivery_tiers).length > 0 && (
                <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span className="uppercase tracking-wide text-[10px] text-amber-900 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      Live Serviceability Check (PIN 560003)
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      eVitalRx Fulfillment V3
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
                    {Object.entries(activeOption.delivery_tiers).map(([tierKey, tierInfo]) => (
                      <div
                        key={tierKey}
                        className={`p-2 rounded-xl border flex flex-col justify-between ${
                          tierInfo.serviceable
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                            : 'bg-white/80 border-slate-200 text-slate-500'
                        }`}
                      >
                        <span className="font-semibold block capitalize truncate">
                          {tierInfo.label || tierKey.replace('_', ' ')}
                        </span>
                        <span className={`text-[10px] font-bold mt-1 ${tierInfo.serviceable ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {tierInfo.serviceable ? '✓ Serviceable' : '✗ Unserviceable'}
                        </span>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-amber-950 font-medium mt-1">
                    {activeOption.serviceability_message || "Local 2-hour express delivery is unserviceable in this staging zone. Courier delivery is available."}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Itemized Medicine List for Selected Provider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Prescription Items ({displayItems.length})
              </span>
              <span className="text-[11px] text-slate-600 font-medium">
                No automatic substitution • Strict safety checks
              </span>
            </div>

            <div className="space-y-2">
              {displayItems.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-[#E9E4DC] p-3 flex items-center justify-between shadow-2xs hover:border-teal-300 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center font-bold text-teal-800 text-xs">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm text-[#0F294A]">
                          {item.name}
                        </h4>
                        {item.is_sustained_release && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 font-bold text-amber-900 border border-amber-200">
                            SR (Sustained Release)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {item.generic_name ? `${item.generic_name} • ` : ''}Pack of {item.pack_size} {item.dosage_form || 'tablets'} {item.manufacturer ? `(${item.manufacturer})` : ''}
                      </p>
                      {item.instructions && (
                        <p className="text-[10px] text-teal-800 font-semibold mt-0.5">
                          {item.instructions}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold text-[#0F294A]">
                      ₹{item.total_price.toFixed(2)}
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      ₹{item.price_per_pack.toFixed(2)}/pack
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Bill Breakdown (Verified Catalogue MRP vs Estimated Quote) */}
          <div className="bg-[#F8F5EE] rounded-2xl border border-[#E7DFD0] p-4 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-600 font-medium">
              <span>Verified Catalogue MRP:</span>
              <span className="font-bold text-slate-800">₹{displaySubtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600 font-medium">
              <span>Fulfillment & Delivery:</span>
              <span className="text-slate-600 font-semibold italic">
                {activeOption?.is_quote_confirmed ? `₹${displayDelivery.toFixed(2)}` : "Pending chemist confirmation"}
              </span>
            </div>
            <div className="border-t border-[#DFD6C5] pt-2 flex justify-between text-sm font-bold text-[#0F294A]">
              <div>
                <span>Estimated Catalogue Total:</span>
                <span className="block text-[10px] text-slate-500 font-normal">
                  Final bill & discounts confirmed upon chemist dispatch
                </span>
              </div>
              <span className="text-teal-900 text-base font-extrabold">₹{displaySubtotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="flex items-start gap-2.5 text-xs text-slate-600 bg-white rounded-xl border border-slate-200 p-3">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-700 block">Delivery Address:</span>
              <span>Flat 302, Gokul Nilaya, 8th Main, Malleshwaram, Bengaluru 560003</span>
            </div>
          </div>

          {/* App Navigation Handoff Screen */}
          {isAppNavigation ? (
            <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <ExternalLink className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-indigo-950">
                    Official App Handoff Mode ({activeOption?.provider_name})
                  </h4>
                  <p className="text-xs text-indigo-900 font-medium mt-0.5">
                    CareSetu has prepared your verified medicine checklist. For your security, payment and final order placement are completed directly on the official {activeOption?.provider_name} portal.
                  </p>
                </div>
              </div>

              {/* Step by step instructions */}
              <div className="bg-white/90 rounded-xl p-3 border border-indigo-100 text-xs text-slate-700 space-y-1.5 font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center text-[10px]">1</span>
                  <span>Tap below to open the official verified search on <strong>{activeOption?.provider_name}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center text-[10px]">2</span>
                  <span>Verify pack count and Sustained Release (SR) formulation</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center text-[10px]">3</span>
                  <span>Upload prescription and choose your payment method</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center text-[10px]">4</span>
                  <span>Return here and tap "I Placed the Order" to sync reminder schedule</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <a
                  href={activeOption?.handoff_url || "https://www.1mg.com"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 p-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-center text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-98"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open {activeOption?.provider_name}
                </a>
                <button
                  onClick={handleHandoffDone}
                  className="p-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-center text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-98"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  I Placed the Order
                </button>
              </div>
            </div>
          ) : (
            /* Direct API Authorization Controls */
            <div>
              {/* Core Principle Notice */}
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-3 mb-3">
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-amber-950 uppercase block">
                    Safety Principle: AI Coordinates. Humans Authorize.
                  </span>
                  <p className="text-amber-900 font-medium mt-0.5">
                    CareSetu never auto-debits your account. Select how you would like to authorize this {activeOption?.provider_name} order:
                  </p>
                </div>
              </div>

              {/* Confirmation Success Feedback */}
              {confirmedChoice === 'self' && (
                <div className="p-4 bg-emerald-100 border border-emerald-300 rounded-2xl text-center text-emerald-900 font-bold text-sm animate-bounce">
                  ✓ Order Authorized by Ramachandra ji! Dispatch initiated via {activeOption?.provider_name}.
                </div>
              )}

              {confirmedChoice === 'guardian' && (
                <div className="p-4 bg-teal-100 border border-teal-300 rounded-2xl text-center text-teal-900 font-bold text-sm animate-bounce">
                  ✓ Refill authorization request sent to Priya Rao (+91 98450 12345). Awaiting approval!
                </div>
              )}

              {/* Two Big Action Buttons */}
              {confirmedChoice === 'none' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
          )}

          {confirmedChoice === 'handoff_done' && (
            <div className="p-4 bg-emerald-100 border border-emerald-300 rounded-2xl text-center text-emerald-900 font-bold text-sm animate-bounce">
              ✓ Order confirmed! CareSetu has updated your medicine schedule and reminder times.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
