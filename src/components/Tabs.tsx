"use client";

import * as React from 'react';
import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
}

const Tabs: React.FC<TabsProps> = ({ tabs, defaultTab }) => {
  const [activeTab, setActiveTab] = React.useState(defaultTab || tabs[0]?.id);

  if (!tabs || tabs.length === 0) {
    return null;
  }

  const activeContent = tabs.find(tab => tab.id === activeTab)?.content;

  return (
    <div>
      <div className="sm:hidden">
        <label htmlFor="tabs" className="sr-only">
          Select a tab
        </label>
        <select
          id="tabs"
          name="tabs"
          className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
          onChange={(e) => setActiveTab(e.target.value)}
          value={activeTab}
        >
          {tabs.map((tab) => (
            <option key={tab.id} value={tab.id}>{tab.label}</option>
          ))}
        </select>
      </div>
      <div className="hidden sm:block">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  tab.id === activeTab
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                  'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
                )}
                aria-current={tab.id === activeTab ? 'page' : undefined}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
      <div className="py-6">
        {activeContent}
      </div>
    </div>
  );
};

export default Tabs;