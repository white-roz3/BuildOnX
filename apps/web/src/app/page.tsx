"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  Code2, 
  Rocket, 
  Activity,
  Box,
  ChevronRight,
  Bell,
  User,
  MoreHorizontal
} from "lucide-react";

// X Logo component
function XLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

// Animated counter for stats
function AnimatedStat({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <div className="stat-card">
      <div className="flex items-baseline gap-1">
        <span className="text-stat text-mars-100">{value}</span>
        {unit && <span className="text-sm text-mars-400">{unit}</span>}
      </div>
      <span className="stat-label">{label}</span>
    </div>
  );
}

// Glass card component
function GlassCard({ 
  children, 
  className = "",
  hover = false,
}: { 
  children: React.ReactNode; 
  className?: string;
  hover?: boolean;
}) {
  return (
    <motion.div 
      className={`glass-card p-6 ${hover ? "transition-all duration-300 hover:border-accent-warm/30 hover:shadow-warm" : ""} ${className}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
}

// Circular gauge component
function CircularGauge({ 
  percentage, 
  label, 
  size = 140 
}: { 
  percentage: number; 
  label: string;
  size?: number;
}) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="absolute transform -rotate-90" width={size} height={size}>
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e8a87c" />
            <stop offset="100%" stopColor="#ff8c42" />
          </linearGradient>
        </defs>
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(245, 230, 211, 0.1)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress ring with gradient */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#gaugeGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Center content */}
      <div className="text-center z-10">
        <div className="text-2xl font-light text-accent-warm">{percentage}%</div>
        <div className="text-xs text-mars-400">{label}</div>
      </div>
      {/* Glow effect */}
      <div 
        className="absolute rounded-full opacity-30 blur-xl"
        style={{
          width: size * 0.6,
          height: size * 0.6,
          background: "radial-gradient(circle, #e8a87c 0%, transparent 70%)"
        }}
      />
    </div>
  );
}

// Project card
function ProjectCard({ 
  name, 
  description, 
  author, 
  views 
}: { 
  name: string; 
  description: string; 
  author: string;
  views: number;
}) {
  return (
    <Link href={`/p/${name.toLowerCase().replace(/\s/g, "-")}`}>
      <GlassCard hover className="group cursor-pointer h-full">
        {/* Mini preview */}
        <div className="h-32 rounded-xl bg-mars-900/50 mb-4 overflow-hidden relative">
          <div className="absolute inset-0 wireframe-grid opacity-50" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Box className="w-8 h-8 text-mars-500" />
          </div>
        </div>
        
        {/* Content */}
        <h3 className="font-display text-lg text-mars-100 mb-1 group-hover:text-accent-warm transition-colors">
          {name}
        </h3>
        <p className="text-sm text-mars-400 mb-3 line-clamp-2">{description}</p>
        
        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-mars-500">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {author}
          </span>
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3" />
            {views}
          </span>
        </div>
      </GlassCard>
    </Link>
  );
}

// Toggle group component
function ToggleGroup({ 
  options, 
  value, 
  onChange 
}: { 
  options: string[]; 
  value: string; 
  onChange: (v: string) => void;
}) {
  return (
    <div className="toggle-group">
      {options.map((option) => (
        <button
          key={option}
          className={`toggle-item ${value === option ? "active" : ""}`}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState("3D");
  const [buildCount, setBuildCount] = useState(2847);
  
  // Simulate live counter
  useEffect(() => {
    const interval = setInterval(() => {
      setBuildCount(c => c + Math.floor(Math.random() * 3));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="glass-card px-6 py-3 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-warm flex items-center justify-center">
                <XLogo className="w-5 h-5 text-mars-950" />
              </div>
              <span className="font-display font-semibold text-lg text-mars-100">
                BuildOnX
              </span>
            </Link>
            
            {/* Center nav */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="/explore" className="text-mars-300 hover:text-mars-100 transition-colors">
                Overview
              </Link>
              <Link href="/explore" className="text-mars-300 hover:text-mars-100 transition-colors">
                Projects
              </Link>
              <Link href="/dashboard" className="text-mars-300 hover:text-mars-100 transition-colors">
                Dashboard
              </Link>
            </div>
            
            {/* Right side */}
            <div className="flex items-center gap-4">
              <span className="text-xs text-mars-500">UPD: 12s ago</span>
              <button className="p-2 text-mars-400 hover:text-mars-100 transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              <div className="w-9 h-9 rounded-full bg-mars-700 border border-mars-600 overflow-hidden">
                <div className="w-full h-full bg-gradient-warm opacity-50" />
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Top stats row */}
          <div className="flex items-start justify-between mb-8">
            <GlassCard className="inline-flex gap-8">
              <AnimatedStat value={buildCount.toLocaleString()} label="Total Builds" />
              <div className="w-px bg-mars-700" />
              <AnimatedStat value="4.2" unit="s" label="Avg Deploy Time" />
            </GlassCard>
            
            <GlassCard className="inline-flex gap-8">
              <AnimatedStat value="99.7" unit="%" label="Uptime" />
              <div className="w-px bg-mars-700" />
              <AnimatedStat value="847" label="Active Users" />
            </GlassCard>
          </div>

          {/* Main hero content - 3 column layout */}
          <div className="grid grid-cols-12 gap-6">
            {/* Left sidebar */}
            <div className="col-span-3 space-y-6">
              <GlassCard>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-mars-300 text-sm font-medium">Build Activity</h3>
                </div>
                <div className="flex justify-center py-4">
                  <CircularGauge percentage={73} label="success" />
                </div>
                <div className="flex justify-between text-xs text-mars-500 mt-4">
                  <span>+12.4%</span>
                  <span>vs last week</span>
                </div>
              </GlassCard>
              
              <GlassCard>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-mars-300 text-sm font-medium">3D Templates</h3>
                  <MoreHorizontal className="w-4 h-4 text-mars-500" />
                </div>
                <div className="h-32 rounded-xl overflow-hidden relative">
                  <div className="absolute inset-0 wireframe-grid" />
                  <div className="absolute bottom-2 left-2 right-2 flex gap-2">
                    <span className="pill text-[10px] py-1 px-2">React</span>
                    <span className="pill text-[10px] py-1 px-2">Vue</span>
                    <span className="pill text-[10px] py-1 px-2">Static</span>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Center - Main hero */}
            <div className="col-span-6">
              <GlassCard className="text-center py-16 relative overflow-hidden">
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent-warm/5 blur-3xl" />
                </div>
                
                <motion.div 
                  className="relative z-10"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <h1 className="font-display text-display-lg mb-4">
                    TWEET.<br/>
                    <span className="text-transparent bg-clip-text bg-gradient-warm">BUILD.</span><br/>
                    SHIP.
                  </h1>
                  
                  <p className="text-mars-400 text-lg max-w-md mx-auto mb-8">
                    Describe what you want in a tweet.<br/>
                    Get a deployed app in seconds.
                  </p>
                  
                  <div className="flex items-center justify-center gap-4">
                    <Link 
                      href="https://twitter.com/intent/tweet?text=@BuildAppsOnX%20make%20me%20" 
                      className="btn-primary inline-flex items-center gap-2"
                    >
                      <XLogo className="w-4 h-4" />
                      Start Building
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    
                    <Link href="/explore" className="btn-secondary inline-flex items-center gap-2">
                      Explore Projects
                    </Link>
                  </div>
                </motion.div>
                
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                  <ToggleGroup 
                    options={["3D", "2D"]} 
                    value={view} 
                    onChange={setView} 
                  />
                </div>
              </GlassCard>
            </div>

            {/* Right sidebar */}
            <div className="col-span-3 space-y-6">
              <GlassCard>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-mars-300 text-sm font-medium">Performance</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <AnimatedStat value="0.8" unit="ms" label="Latency" />
                  <AnimatedStat value="94" unit="%" label="Accuracy" />
                </div>
              </GlassCard>
              
              <GlassCard>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-mars-300 text-sm font-medium">View</h3>
                  <MoreHorizontal className="w-4 h-4 text-mars-500" />
                </div>
                
                <ToggleGroup 
                  options={["Structure", "Composition"]} 
                  value="Structure" 
                  onChange={() => {}} 
                />
                
                <div className="mt-4 h-20 flex items-end justify-center gap-1">
                  {[40, 65, 85, 100, 85, 65, 40].map((h, i) => (
                    <div 
                      key={i}
                      className="w-6 bg-gradient-to-t from-accent-warm/20 to-accent-warm rounded-t"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                
                <div className="flex justify-between text-xs text-mars-500 mt-2">
                  <span>Min</span>
                  <span>Current</span>
                  <span>Max</span>
                </div>
              </GlassCard>
              
              <GlassCard>
                <h3 className="text-mars-300 text-sm font-medium mb-4">Tech Ratio</h3>
                
                <div className="relative h-16 flex items-end justify-center mb-2">
                  <svg className="absolute" width="120" height="60" viewBox="0 0 120 60">
                    <defs>
                      <linearGradient id="semiGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#c17f59" />
                        <stop offset="50%" stopColor="#e8a87c" />
                        <stop offset="100%" stopColor="#ff8c42" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 10 60 A 50 50 0 0 1 110 60"
                      stroke="rgba(245, 230, 211, 0.1)"
                      strokeWidth="8"
                      fill="none"
                    />
                    <path
                      d="M 10 60 A 50 50 0 0 1 110 60"
                      stroke="url(#semiGradient)"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray="157"
                      strokeDashoffset="35"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="text-xl font-light text-mars-100 relative">78%</span>
                </div>
                
                <div className="flex justify-center gap-6 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-accent-coral" />
                    React
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-accent-orange" />
                    Static
                  </span>
                </div>
                
                <button className="w-full btn-secondary mt-4 text-sm">
                  Generate Report
                </button>
              </GlassCard>
            </div>
          </div>
        </div>
      </section>

      {/* Projects grid */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-2xl text-mars-100">Recent Projects</h2>
            <Link href="/explore" className="text-accent-warm flex items-center gap-1 text-sm hover:gap-2 transition-all">
              View all
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ProjectCard 
              name="Crypto Dashboard" 
              description="Real-time portfolio tracker with price alerts and analytics"
              author="@trader_joe"
              views={1247}
            />
            <ProjectCard 
              name="Recipe Finder" 
              description="Find recipes based on ingredients you have at home"
              author="@home_chef"
              views={892}
            />
            <ProjectCard 
              name="Pomodoro Timer" 
              description="Minimalist focus timer with statistics and sounds"
              author="@productivity"
              views={654}
            />
            <ProjectCard 
              name="Weather App" 
              description="Beautiful weather forecasts for any city worldwide"
              author="@outdoor_person"
              views={521}
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-display-md text-mars-100 mb-4">How It Works</h2>
            <p className="text-mars-400 max-w-lg mx-auto">
              From tweet to deployed app in three simple steps
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: XLogo, title: "Tweet Your Idea", desc: "Mention @BuildAppsOnX with your app description" },
              { icon: Code2, title: "Code Generated", desc: "Claude AI writes production-ready code" },
              { icon: Rocket, title: "Instant Deploy", desc: "Your app goes live with a shareable URL" },
            ].map((step, i) => (
              <GlassCard key={i} hover className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-mars-800/50 border border-mars-700 flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-6 h-6 text-accent-warm" />
                </div>
                <div className="text-accent-warm text-sm font-medium mb-2">Step {i + 1}</div>
                <h3 className="font-display text-lg text-mars-100 mb-2">{step.title}</h3>
                <p className="text-mars-400 text-sm">{step.desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard>
              <h3 className="font-display text-xl text-mars-100 mb-2">Free</h3>
              <div className="mb-6">
                <span className="text-stat">$0</span>
                <span className="text-mars-500 text-sm"> /forever</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["3 builds per day", "Projects live for 7 days", "All templates", "Community support"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-mars-300">
                    <span className="text-accent-success">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <button className="w-full btn-secondary">Get Started</button>
            </GlassCard>
            
            <GlassCard className="border-accent-warm/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent-warm/10 rounded-full blur-3xl" />
              <h3 className="font-display text-xl text-mars-100 mb-2">Pro</h3>
              <div className="mb-6">
                <span className="text-stat">$19</span>
                <span className="text-mars-500 text-sm"> /month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["Unlimited builds", "Projects live forever", "Custom domains", "Priority builds", "API access"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-mars-300">
                    <span className="text-accent-warm">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <button className="w-full btn-primary">Upgrade to Pro</button>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <GlassCard className="text-center py-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-warm opacity-5" />
            <h2 className="font-display text-display-md text-mars-100 mb-4 relative z-10">
              Ready to build something?
            </h2>
            <p className="text-mars-400 mb-8 relative z-10">
              Just tweet at @BuildAppsOnX and describe what you want.<br/>
              We'll take it from there.
            </p>
            <Link 
              href="https://twitter.com/intent/tweet?text=@BuildAppsOnX%20make%20me%20"
              className="btn-primary inline-flex items-center gap-2 relative z-10"
            >
              <XLogo className="w-4 h-4" />
              Tweet @BuildAppsOnX
              <ArrowRight className="w-4 h-4" />
            </Link>
          </GlassCard>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-mars-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="https://x.com/BuildAppsOnX" className="text-mars-500 hover:text-mars-300 transition-colors">
              <XLogo className="w-5 h-5" />
            </Link>
            <Link href="https://github.com" className="text-mars-500 hover:text-mars-300 transition-colors">
              <Code2 className="w-5 h-5" />
            </Link>
            <Link href="/docs" className="text-mars-500 hover:text-mars-300 text-sm transition-colors">
              Docs
            </Link>
          </div>
          <span className="text-xs text-mars-600">
            Built with ❤️ and Claude
          </span>
        </div>
      </footer>
    </div>
  );
}
