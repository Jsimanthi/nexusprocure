import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DepartmentalSpendChart } from './DepartmentalSpendChart';

// Mock the recharts library to avoid rendering actual charts in tests
vi.mock('recharts', async () => {
  const original = await vi.importActual('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
    BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
    Bar: () => <div data-testid="bar" />,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
  };
});

describe('DepartmentalSpendChart', () => {
  it('should display a message when no data is provided', () => {
    render(<DepartmentalSpendChart data={[]} />);
    expect(screen.getByText('No departmental spending data available.')).toBeInTheDocument();
  });

  it('should render the chart when data is provided', () => {
    const mockData = [
      { name: 'Engineering', Total: 15000 },
      { name: 'Marketing', Total: 8000 },
    ];
    render(<DepartmentalSpendChart data={mockData} />);

    // Check that the chart components are rendered
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();

    // Check that the no data message is not present
    expect(screen.queryByText('No departmental spending data available.')).not.toBeInTheDocument();
  });
});