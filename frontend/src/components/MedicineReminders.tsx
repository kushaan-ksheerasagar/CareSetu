import React, { useState } from 'react';
import { Clock, Plus, CheckCircle2, Circle, Pill, Sparkles, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { MedicineReminder } from '../types';

interface MedicineRemindersProps {
  reminders: MedicineReminder[];
  onToggleReminder: (reminderId: string, nextStatus: 'completed' | 'pending') => void;
  onAddReminder: (name: string, time: string, meal: string) => void;
}

export const MedicineReminders: React.FC<MedicineRemindersProps> = ({
  reminders,
  onToggleReminder,
  onAddReminder
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMedName, setNewMedName] = useState('');
  const [newTime, setNewTime] = useState('08:30 AM');
  const [newMeal, setNewMeal] = useState('After Breakfast');

  const handleToggle = (reminder: MedicineReminder) => {
    const nextStatus = reminder.status === 'completed' ? 'pending' : 'completed';
    if (nextStatus === 'completed') {
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.6 }
      });
    }
    onToggleReminder(reminder.id, nextStatus);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedName.trim()) return;
    onAddReminder(newMedName.trim(), newTime, newMeal);
    setNewMedName('');
    setShowAddForm(false);
  };

  return (
    <div className="bg-white rounded-3xl border border-[#E9E4DC] p-5 sm:p-7 shadow-sm transition-all hover:shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#F0EBE3] pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#0F294A] tracking-tight">
              Daily Medicine Reminders
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Elder daily pill schedule with audio reminders
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 hover:bg-teal-100 transition text-xs font-bold"
        >
          {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showAddForm ? 'Cancel' : 'Add Reminder'}</span>
        </button>
      </div>

      {/* Add Reminder Form */}
      {showAddForm && (
        <form onSubmit={handleFormSubmit} className="bg-[#FAF8F5] border border-[#EBE3D6] rounded-2xl p-4 mb-4 text-xs space-y-3">
          <h4 className="font-bold text-sm text-[#0F294A]">Add New Medicine Schedule</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-600 font-bold mb-1">Medicine Name:</label>
              <input
                type="text"
                placeholder="e.g. Shelcal 500 or Atorva 10"
                value={newMedName}
                onChange={(e) => setNewMedName(e.target.value)}
                className="w-full bg-white border border-[#D5CDC0] rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                required
              />
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">Time Slot:</label>
              <select
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full bg-white border border-[#D5CDC0] rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-teal-600"
              >
                <option value="08:30 AM">08:30 AM (Morning)</option>
                <option value="02:00 PM">02:00 PM (Afternoon)</option>
                <option value="08:30 PM">08:30 PM (Night)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">Meal Routine:</label>
              <select
                value={newMeal}
                onChange={(e) => setNewMeal(e.target.value)}
                className="w-full bg-white border border-[#D5CDC0] rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-teal-600"
              >
                <option value="After Breakfast">After Breakfast</option>
                <option value="After Lunch">After Lunch</option>
                <option value="After Dinner">After Dinner</option>
                <option value="Empty Stomach">Empty Stomach</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs transition shadow-xs"
          >
            Save Pill Reminder Schedule
          </button>
        </form>
      )}

      {/* Reminders List */}
      <div className="space-y-3">
        {reminders.map((reminder) => {
          const isDone = reminder.status === 'completed';
          return (
            <div
              key={reminder.id}
              className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                isDone
                  ? 'bg-emerald-50/60 border-emerald-200 text-slate-500'
                  : 'bg-white border-[#E9E4DC] hover:border-teal-300 text-[#0F294A] shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <button
                  onClick={() => handleToggle(reminder)}
                  title={isDone ? "Click to mark as pending" : "Click to mark dose taken"}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : 'border-2 border-slate-300 text-slate-400 hover:border-teal-600 hover:text-teal-600'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                </button>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className={`text-base font-bold ${isDone ? 'line-through text-slate-500' : 'text-[#0F294A]'}`}>
                      {reminder.medicine_name}
                    </h4>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-slate-200 font-semibold text-slate-600">
                      {reminder.dosage}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{reminder.time_slot}</span>
                    <span>•</span>
                    <span className="font-semibold text-teal-800">{reminder.timing_label}</span>
                  </p>
                </div>
              </div>

              <div className="text-right">
                {isDone ? (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full border border-emerald-300">
                    ✓ Taken Today
                  </span>
                ) : (
                  <button
                    onClick={() => handleToggle(reminder)}
                    className="text-xs font-bold text-teal-800 hover:bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200 transition"
                  >
                    Mark as Taken
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
