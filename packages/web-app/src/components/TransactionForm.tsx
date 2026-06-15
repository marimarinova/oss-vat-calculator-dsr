/**
 * Transaction Form Component
 * Handles single transaction input
 */

import React, { useState } from 'react';
import { getAllMemberStates, getMemberStateName } from '@oss-vat/shared-core';
import { getMemberStateRates } from '@oss-vat/oss-calculator';

interface TransactionFormProps {
  onSubmit: (data: {
    date: string;
    buyerCountry: string;
    amount: number;
    currency: string;
    description: string;
    productType: 'goods' | 'services';
  }) => void;
}

interface TransactionFormState {
  date: string;
  buyerCountry: string;
  amount: number | '';
  currency: string;
  description: string;
  productType: 'goods' | 'services';
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState<TransactionFormState>({
    date: new Date().toISOString().split('T')[0],
    buyerCountry: 'BG',
    amount: '',
    currency: 'EUR',
    description: '',
    productType: 'goods',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [vatPreview, setVatPreview] = useState<number | null>(null);

  const memberStates = getAllMemberStates();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'amount' ? (value === '' ? '' : parseFloat(value)) : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: '' }));

    // Update VAT preview
    if (name === 'amount' || name === 'buyerCountry') {
      const currentAmount = typeof formData.amount === 'number' ? formData.amount : 0;
      updateVatPreview(
        name === 'amount' ? parseFloat(value) || 0 : currentAmount,
        name === 'buyerCountry' ? value : formData.buyerCountry,
      );
    }
  };

  const updateVatPreview = (amount: number, country: string) => {
    if (amount > 0) {
      try {
        const rates = getMemberStateRates(country);
        if (rates) {
          const standardRate = rates.standard[0];
          setVatPreview((amount * standardRate.rate) / 100);
        }
      } catch {
        setVatPreview(null);
      }
    } else {
      setVatPreview(null);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.buyerCountry) newErrors.buyerCountry = 'Country is required';
    if (!formData.amount || (typeof formData.amount === 'number' && formData.amount <= 0)) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        ...formData,
        amount: typeof formData.amount === 'number' ? formData.amount : 0,
      });
      setFormData({
        date: new Date().toISOString().split('T')[0],
        buyerCountry: 'BG',
        amount: '',
        currency: 'EUR',
        description: '',
        productType: 'goods',
      });
      setVatPreview(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">Add Transaction</h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.date ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
        </div>

        {/* Buyer Country */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Buyer Country</label>
          <select
            name="buyerCountry"
            value={formData.buyerCountry}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.buyerCountry ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            {memberStates.map((code) => (
              <option key={code} value={code}>
                {getMemberStateName(code as any)} ({code})
              </option>
            ))}
          </select>
          {errors.buyerCountry && (
            <p className="text-red-500 text-xs mt-1">{errors.buyerCountry}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.amount ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
        </div>

        {/* Currency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
          <select
            name="currency"
            value={formData.currency}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
            <option value="BGN">BGN</option>
          </select>
        </div>

        {/* Product Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
          <select
            name="productType"
            value={formData.productType}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="goods">Goods</option>
            <option value="services">Services</option>
          </select>
        </div>
      </div>

      {/* VAT Preview */}
      {vatPreview !== null && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
          <p className="text-sm text-blue-700">
            <strong>Estimated VAT:</strong>{' '}
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'EUR',
            }).format(vatPreview)}
          </p>
        </div>
      )}

      {/* Description */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Item description, invoice reference, etc."
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.description ? 'border-red-500' : 'border-gray-300'
          }`}
          rows={3}
        ></textarea>
        {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
      >
        Add Transaction
      </button>
    </form>
  );
};
