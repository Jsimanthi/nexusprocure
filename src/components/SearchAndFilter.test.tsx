import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import SearchAndFilter from './SearchAndFilter';

describe('SearchAndFilter Component', () => {
  it('should call onSearch when the user types in the search box', () => {
    const handleSearch = vi.fn();
    const handleFilter = vi.fn();

    render(
      <SearchAndFilter
        onSearch={handleSearch}
        onFilter={handleFilter}
        placeholder="Search..."
      />
    );

    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'test query' } });

    expect(handleSearch).toHaveBeenCalledWith('test query');
  });

  it('should call onFilter when a status checkbox is clicked', () => {
    const handleSearch = vi.fn();
    const handleFilter = vi.fn();
    const filterOptions = { status: ['DRAFT', 'APPROVED'] };

    render(
      <SearchAndFilter
        onSearch={handleSearch}
        onFilter={handleFilter}
        filterOptions={filterOptions}
      />
    );

    // First, open the filter panel
    const filterButton = screen.getByText('Filters');
    fireEvent.click(filterButton);

    // Then, click a checkbox
    const draftCheckbox = screen.getByLabelText('draft');
    fireEvent.click(draftCheckbox);

    // It should be called with the new filter state
    expect(handleFilter).toHaveBeenCalledWith({ status: ['DRAFT'], dateRange: { from: '', to: '' } });

    // Click it again to uncheck
    fireEvent.click(draftCheckbox);
    expect(handleFilter).toHaveBeenCalledWith({ status: [], dateRange: { from: '', to: '' } });
  });

  it('should call onFilter when a date is changed', () => {
    const handleSearch = vi.fn();
    const handleFilter = vi.fn();
    const filterOptions = { dateRange: true };

    render(
      <SearchAndFilter
        onSearch={handleSearch}
        onFilter={handleFilter}
        filterOptions={filterOptions}
      />
    );

    // Open the filter panel
    const filterButton = screen.getByText('Filters');
    fireEvent.click(filterButton);

    // Change the 'from' date
    const fromDateInput = screen.getByLabelText('From');
    fireEvent.change(fromDateInput, { target: { value: '2024-01-01' } });

    expect(handleFilter).toHaveBeenCalledWith({ status: [], dateRange: { from: '2024-01-01', to: '' } });
  });
});
