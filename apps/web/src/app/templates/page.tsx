'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/lib/api';

const templates = [
  {
    id: 'landing',
    name: 'Landing Page',
    description: 'Clean marketing landing page with hero, features, and CTA sections',
    prompt: 'Build a modern landing page with a hero section, 3 feature cards, testimonials section, and a call-to-action footer. Use a clean minimal design.',
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    description: 'Personal portfolio site to showcase your work and skills',
    prompt: 'Build a personal portfolio website with an about section, projects grid with hover effects, skills list, and contact form. Dark theme.',
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Analytics dashboard with charts, stats, and data tables',
    prompt: 'Build an analytics dashboard with stat cards at the top, a line chart showing trends, a bar chart for comparisons, and a data table. Dark theme with orange accents.',
  },
  {
    id: 'todo',
    name: 'Todo App',
    description: 'Task management app with add, complete, and delete functionality',
    prompt: 'Build a todo app where users can add tasks, mark them complete, delete them, and filter by status. Include local storage persistence. Clean minimal UI.',
  },
  {
    id: 'calculator',
    name: 'Calculator',
    description: 'Functional calculator with basic and scientific operations',
    prompt: 'Build a calculator app with basic operations (add, subtract, multiply, divide), clear button, and calculation history. Clean grid layout.',
  },
  {
    id: 'timer',
    name: 'Pomodoro Timer',
    description: 'Focus timer with work/break intervals and notifications',
    prompt: 'Build a pomodoro timer with 25 min work sessions and 5 min breaks. Include start/pause/reset buttons, session counter, and audio notification when timer ends.',
  },
  {
    id: 'weather',
    name: 'Weather App',
    description: 'Weather display with current conditions and forecast',
    prompt: 'Build a weather app UI showing current temperature, conditions, humidity, wind speed, and a 5-day forecast. Use weather icons. Allow city search.',
  },
  {
    id: 'quiz',
    name: 'Quiz Game',
    description: 'Interactive quiz with score tracking and results',
    prompt: 'Build a quiz game with 10 multiple choice questions about general knowledge. Track score, show correct answers after each question, display final results.',
  },
  {
    id: 'countdown',
    name: 'Event Countdown',
    description: 'Countdown timer to a specific date with days/hours/minutes',
    prompt: 'Build an event countdown page showing days, hours, minutes, seconds until a target date. Include a date picker to set the target. Animated numbers.',
  },
  {
    id: 'pricing',
    name: 'Pricing Page',
    description: 'SaaS pricing table with feature comparison',
    prompt: 'Build a pricing page with 3 tiers (Basic, Pro, Enterprise), feature comparison checkmarks, highlighted recommended plan, and CTA buttons.',
  },
  {
    id: 'blog',
    name: 'Blog Layout',
    description: 'Blog homepage with article cards and sidebar',
    prompt: 'Build a blog homepage with article cards showing title, excerpt, date, and read time. Include a sidebar with categories and recent posts.',
  },
  {
    id: 'form',
    name: 'Contact Form',
    description: 'Contact form with validation and submission handling',
    prompt: 'Build a contact form with name, email, subject, and message fields. Include validation, error messages, and a success state after submission.',
  },
];

export default function TemplatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const useTemplate = async (template: typeof templates[0]) => {
    setLoading(template.id);
    try {
      const res = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: template.prompt }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/studio/${data.slug}`);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(null);
  };

  return (
    <div className="min-h-screen bg-[#1c1917] text-stone-100">
      <header className="border-b border-stone-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/claude-symbol.svg" alt="" width={24} height={24} />
            <Image src="/heyclaude-text.png" alt="HeyClaude" width={100} height={20} className="h-5 w-auto" />
          </Link>
          <div className="flex gap-4 text-sm">
            <Link href="/explore" className="text-stone-400 hover:text-white">Explore</Link>
            <Link href="/dashboard" className="text-stone-400 hover:text-white">Dashboard</Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Templates</h1>
          <p className="text-stone-400">Start with a template and customize it to your needs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-stone-900 border border-stone-800 rounded-lg p-5 hover:border-stone-700 transition-colors"
            >
              <h3 className="font-semibold mb-2">{template.name}</h3>
              <p className="text-sm text-stone-400 mb-4">{template.description}</p>
              <button
                onClick={() => useTemplate(template)}
                disabled={loading === template.id}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 px-4 py-2 rounded text-sm font-medium transition-colors"
              >
                {loading === template.id ? 'Building...' : 'Use Template'}
              </button>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-stone-800 px-6 py-4 mt-8">
        <div className="max-w-6xl mx-auto text-center text-xs text-stone-600">
          <div>Built with Claude</div>
          <div className="font-mono mt-1">CA: 2d5G383QyAWEMvoFx2Qy4xYznjR4D9UBCgW1jiWApump</div>
        </div>
      </footer>
    </div>
  );
}

