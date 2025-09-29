// src/components/DeliverPOModal.tsx
"use client";

import { useState } from 'react';
import { Star } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

interface DeliverPOModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (qualityScore: number, deliveryNotes: string) => Promise<void>;
}

export default function DeliverPOModal({ isOpen, onClose, onSubmit }: DeliverPOModalProps) {
  const [qualityScore, setQualityScore] = useState(5);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSubmit(qualityScore, deliveryNotes);
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Mark as Delivered</h2>
        <p className="text-gray-600 mb-6">Please provide a quality rating and any delivery notes for this order.</p>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Quality Score *</label>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-8 w-8 cursor-pointer ${qualityScore >= star ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                  onClick={() => setQualityScore(star)}
                />
              ))}
            </div>
          </div>
          <div className="mb-6">
            <label htmlFor="deliveryNotes" className="block text-sm font-medium text-gray-700">Delivery Notes</label>
            <textarea
              id="deliveryNotes"
              rows={4}
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="e.g., Package arrived in good condition, one item was slightly damaged..."
            />
          </div>
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white px-6 py-2 rounded-md flex items-center justify-center"
            >
              {isSubmitting && <LoadingSpinner />}
              {isSubmitting ? 'Submitting...' : 'Confirm Delivery'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}