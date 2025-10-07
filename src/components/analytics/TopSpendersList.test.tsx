import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TopSpendersList } from './TopSpendersList';
import { SpendData } from '@/types/analytics';

describe('TopSpendersList', () => {
  const mockData: SpendData[] = [
    { name: 'Vendor A', Total: 5000 },
    { name: 'Vendor B', Total: 3500 },
    { name: 'Vendor C', Total: 1500 },
  ];

  it('should render the loading state correctly', () => {
    render(<TopSpendersList title="Top Vendors" data={[]} isLoading={true} />);
    expect(screen.getByText('Top Vendors')).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0); // No list items
    // Check for pulse animation if possible, or just presence of loading structure
    const loadingDivs = screen.getAllByRole('generic', { name: '' });
    expect(loadingDivs.length).toBeGreaterThan(0);
  });

  it('should render the empty state when no data is provided', () => {
    render(<TopSpendersList title="Top Categories" data={[]} isLoading={false} />);
    expect(screen.getByText('Top Categories')).toBeInTheDocument();
    expect(screen.getByText('No data available.')).toBeInTheDocument();
  });

  it('should render the list of spenders correctly', () => {
    render(<TopSpendersList title="Top Departments" data={mockData} isLoading={false} />);
    expect(screen.getByText('Top Departments')).toBeInTheDocument();

    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(3);

    expect(screen.getByText('Vendor A')).toBeInTheDocument();
    expect(screen.getByText('₹5,000.00')).toBeInTheDocument(); // Assuming INR currency format

    expect(screen.getByText('Vendor B')).toBeInTheDocument();
    expect(screen.getByText('₹3,500.00')).toBeInTheDocument();

    expect(screen.getByText('Vendor C')).toBeInTheDocument();
    expect(screen.getByText('₹1,500.00')).toBeInTheDocument();
  });

  it('should handle items with zero or undefined totals gracefully', () => {
    const dataWithZeros: SpendData[] = [
        { name: 'Vendor X', Total: 1000 },
        { name: 'Vendor Y', Total: 0 },
        { name: 'Vendor Z' },
    ];
    render(<TopSpendersList title="Edge Cases" data={dataWithZeros} isLoading={false} />);

    expect(screen.getByText('Vendor X')).toBeInTheDocument();
    expect(screen.getByText('₹1,000.00')).toBeInTheDocument();

    expect(screen.getByText('Vendor Y')).toBeInTheDocument();
    expect(screen.getByText('Vendor Z')).toBeInTheDocument();

    // Check that there are two entries with ₹0.00
    expect(screen.getAllByText('₹0.00')).toHaveLength(2);
  });
});