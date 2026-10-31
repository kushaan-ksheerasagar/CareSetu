import React, { useState } from 'react';
import { Calendar, Stethoscope, Clock, MapPin, CheckCircle, ChevronRight, User } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Appointment, AvailableDoctorSlot } from '../types';

interface DoctorAppointmentsProps {
  appointments: Appointment[];
  availableSlots: AvailableDoctorSlot[];
  onBookSlot: (slot: AvailableDoctorSlot) => void;
}

export const DoctorAppointments: React.FC<DoctorAppointmentsProps> = ({
  appointments,
  availableSlots,
  onBookSlot
}) => {
  const [selectedSlot, setSelectedSlot] = useState<AvailableDoctorSlot | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleStartBooking = (slot: AvailableDoctorSlot) => {
    setSelectedSlot(slot);
    setShowConfirmModal(true);
  };

  const handleConfirmBooking = () => {
    if (!selectedSlot) return;
    confetti({
      particleCount: 60,
      spread: 55,
      origin: { y: 0.65 }
    });
    onBookSlot(selectedSlot);
    setShowConfirmModal(false);
    setSelectedSlot(null);
  };

  return (
    <div className="bg-white rounded-3xl border border-[#E9E4DC] p-5 sm:p-7 shadow-sm transition-all hover:shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#F0EBE3] pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#0F294A] tracking-tight">
              Doctor Appointments & Consultations
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Simulated booking workflow with cardiologist & geriatrician
            </p>
          </div>
        </div>
      </div>

      {/* Confirmed Appointments */}
      <div className="mb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2.5">
          Upcoming Scheduled Appointments ({appointments.length})
        </span>

        <div className="space-y-3">
          {appointments.map((apt) => (
            <div
              key={apt.id}
              className="p-4 rounded-2xl bg-teal-50/50 border border-teal-200 text-[#0F294A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-teal-600 text-white font-bold flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-base text-[#0F294A]">
                      {apt.doctor_name}
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                      Confirmed
                    </span>
                  </div>
                  <p className="text-xs text-teal-800 font-semibold mt-0.5">
                    {apt.speciality} • {apt.type}
                  </p>
                  <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{apt.clinic}</span>
                  </p>
                </div>
              </div>

              <div className="text-right sm:border-l sm:border-teal-200 sm:pl-4">
                <span className="text-xs font-bold text-slate-700 block">
                  {apt.date}
                </span>
                <span className="text-sm font-black text-teal-900">
                  {apt.time}
                </span>
                <span className="block text-[10px] text-emerald-700 font-semibold mt-0.5">
                  ✓ Priya (Guardian) Synced
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Available Doctor Slots (Mock Healthcare Providers) */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Available Slots for Ramachandra ji
          </span>
          <span className="text-xs text-teal-700 font-semibold">
            Verified Partner Clinics
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {availableSlots.map((slot) => (
            <div
              key={slot.slot_id}
              className="bg-[#FAF8F5] border border-[#EBE3D6] rounded-2xl p-4 flex flex-col justify-between hover:border-teal-300 transition"
            >
              <div>
                <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wide bg-teal-100/70 px-2 py-0.5 rounded-md">
                  {slot.speciality}
                </span>
                <h4 className="font-bold text-sm text-[#0F294A] mt-2">
                  {slot.doctor_name}
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  {slot.hospital}
                </p>
                <div className="text-xs text-slate-600 font-medium mt-2 flex items-center justify-between">
                  <span>Slot: {slot.date}</span>
                  <span className="font-bold text-[#0F294A]">{slot.time}</span>
                </div>
              </div>

              <button
                onClick={() => handleStartBooking(slot)}
                className="mt-3.5 w-full py-2 bg-white hover:bg-teal-50 border border-teal-200 text-teal-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition"
              >
                <span>Book Slot</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Human Authorization Booking Modal */}
      {showConfirmModal && selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-[#E9E4DC] p-6 max-w-md w-full shadow-2xl text-[#0F294A]">
            <h3 className="text-xl font-bold mb-1">Confirm Doctor Appointment</h3>
            <p className="text-xs text-slate-500 font-medium mb-4">
              AI coordinates. Humans authorize.
            </p>

            <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#E8E1D4] text-xs space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Doctor:</span>
                <span className="font-bold">{selectedSlot.doctor_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Speciality:</span>
                <span className="font-bold">{selectedSlot.speciality}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hospital:</span>
                <span className="font-bold">{selectedSlot.hospital}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Slot Time:</span>
                <span className="font-bold text-teal-900">{selectedSlot.date} at {selectedSlot.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Consultation Fee:</span>
                <span className="font-bold">₹{selectedSlot.fee} (Pay at Clinic)</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleConfirmBooking}
                className="flex-1 py-3 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl text-xs transition shadow-md"
              >
                Authorize & Confirm Booking
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="py-3 px-4 border border-slate-300 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
