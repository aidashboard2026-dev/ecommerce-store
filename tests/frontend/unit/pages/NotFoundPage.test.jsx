import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import NotFoundPage from '@/storefront/pages/NotFoundPage';

// Mock Lucide icons to avoid complex renders
vi.mock('lucide-react', () => ({
  Compass: () => <svg data-testid="mock-compass"></svg>,
}));

describe('NotFoundPage Page Component', () => {
  it('renders correctly with not found messages and active redirect link', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );

    // Verify messages
    expect(screen.getByText('Page not found')).toBeInTheDocument();
    expect(
      screen.getByText("The page you're looking for doesn't exist or may have moved.")
    ).toBeInTheDocument();

    // Verify back to home link
    const link = screen.getByRole('link', { name: /Back to Home/i });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toBe('/');

    // Verify mocked icon
    expect(screen.getByTestId('mock-compass')).toBeInTheDocument();
  });
});
