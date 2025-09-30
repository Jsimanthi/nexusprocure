"use client";

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';

interface ForecastData {
  historicalData: { month: string; quantity: number }[];
  forecast: number;
}

const fetchPopularItems = async (): Promise<{ popularItems: string[] }> => {
  const res = await fetch('/api/analytics/forecast');
  if (!res.ok) throw new Error('Failed to fetch popular items');
  return res.json();
};

const fetchForecastData = async (itemName: string): Promise<ForecastData> => {
  const res = await fetch(`/api/analytics/forecast?itemName=${encodeURIComponent(itemName)}`);
  if (!res.ok) throw new Error('Failed to fetch forecast data');
  return res.json();
};

export default function DemandForecasting() {
  const [selectedItem, setSelectedItem] = useState<string>('');

  const { data: popularItemsData, isLoading: isLoadingItems } = useQuery({
    queryKey: ['popularItems'],
    queryFn: fetchPopularItems,
  });

  const {
    data: forecastData,
    isLoading: isLoadingForecast,
    isError,
    error,
  } = useQuery({
    queryKey: ['forecastData', selectedItem],
    queryFn: () => fetchForecastData(selectedItem),
    enabled: !!selectedItem, // Only run this query if an item is selected
  });

  useEffect(() => {
    if (popularItemsData?.popularItems?.length && !selectedItem) {
      setSelectedItem(popularItemsData.popularItems[0]);
    }
  }, [popularItemsData, selectedItem]);

  const handleItemChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedItem(e.target.value);
  };

  const chartData = forecastData?.historicalData ?? [];
  if (forecastData) {
    const lastMonth = chartData.length > 0 ? chartData[chartData.length - 1].month : new Date().toISOString().slice(0, 7);
    const nextMonthDate = new Date(lastMonth + '-01T00:00:00');
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const nextMonth = nextMonthDate.toISOString().slice(0, 7);
    chartData.push({ month: nextMonth, quantity: forecastData.forecast });
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Demand Forecasting</h2>
      <div className="mb-4">
        <label htmlFor="item-select" className="block text-sm font-medium text-gray-700">Select an Item:</label>
        <select
          id="item-select"
          value={selectedItem}
          onChange={handleItemChange}
          disabled={isLoadingItems || !popularItemsData?.popularItems?.length}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          {isLoadingItems ? (
            <option>Loading items...</option>
          ) : (
            popularItemsData?.popularItems.map(item => (
              <option key={item} value={item}>{item}</option>
            ))
          )}
        </select>
      </div>

      {isLoadingForecast && <div className="h-80 flex justify-center items-center"><LoadingSpinner /></div>}
      {isError && <ErrorDisplay title="Error" message={error.message} />}

      {forecastData && !isLoadingForecast && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
          <div className="md:col-span-3">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="quantity" stroke="#8884d8" name="Historical Quantity" />
                <Line type="monotone" dataKey="quantity" stroke="#82ca9d" name="Forecasted Quantity" dot={false} activeDot={false} legendType="none" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-700">Next Month&apos;s Forecast</h3>
            <p className="text-5xl font-bold text-blue-600 my-4">{forecastData.forecast}</p>
            <p className="text-sm text-gray-500">units of {selectedItem}</p>
          </div>
        </div>
      )}
    </div>
  );
}