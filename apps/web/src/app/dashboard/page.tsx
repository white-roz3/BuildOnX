"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Box,
  Clock,
  ExternalLink,
  Settings,
  Trash2,
  Plus,
  Activity,
  Zap,
  Calendar,
  ChevronRight,
  MoreHorizontal,
  Search,
  Grid,
  List,
  Star,
  Eye,
  GitFork,
  LogOut,
  User as UserIcon,
  Twitter,
} from "lucide-react";

// Mock user data (replace with real auth)
const mockUser = {
  id: "1",
  x_username: "demo_user",
  x_display_name: "Demo User",
  x_profile_image: null,
  tier: "free",
  credits: 7,
  created_at: "2024-01-15T10:00:00Z",
};

// Mock projects data
const mockProjects = [
  {
    id: "1",
    name: "Crypto Dashboard",
    slug: "crypto-dashboard-7x9k",
    original_prompt: "make me a crypto price tracker with dark mode",
    deployment_url: "https://crypto-dashboard-7x9k.BuildOnX.app",
    deployment_status: "deployed",
    is_public: true,
    views: 1247,
    forks: 23,
    created_at: "2024-01-20T14:30:00Z",
    expires_at: "2024-01-27T14:30:00Z",
  },
  {
    id: "2",
    name: "Recipe Finder",
    slug: "recipe-finder-abc1",
    original_prompt: "build a recipe search app with ingredient filters",
    deployment_url: "https://recipe-finder-abc1.BuildOnX.app",
    deployment_status: "deployed",
    is_public: true,
    views: 892,
    forks: 15,
    created_at: "2024-01-18T09:15:00Z",
    expires_at: "2024-01-25T09:15:00Z",
  },
  {
    id: "3",
    name: "Weather App",
    slug: "weather-app-xyz2",
    original_prompt: "create a beautiful weather app with 5 day forecast",
    deployment_url: null,
    deployment_status: "building",
    is_public: false,
    views: 0,
    forks: 0,
    created_at: "2024-01-21T16:45:00Z",
    expires_at: null,
  },
];

// Glass card component
function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={`glass-card p-6 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {children}
    </motion.div>
  );
}

// Stat card
function StatCard({
  icon: Icon,
  value,
  label,
  trend,
}: {
  icon: React.ElementType;
  value: string | number;
  label: string;
  trend?: string;
}) {
  return (
    <GlassCard>
      <div className="flex items-start justify-between">
        <div>
          <div
            className="text-2xl font-light mb-1"
            style={{
              background: "linear-gradient(135deg, #e8a87c 0%, #ff8c42 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {value}
          </div>
          <div className="text-xs text-mars-500 uppercase tracking-wider">
            {label}
          </div>
        </div>
        <div className="w-10 h-10 rounded-lg bg-mars-100 flex items-center justify-center">
          <Icon className="w-5 h-5 text-mars-400" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 text-xs text-green-400">{trend}</div>
      )}
    </GlassCard>
  );
}

// Project row
function ProjectRow({ project, viewMode }: { project: typeof mockProjects[0]; viewMode: "grid" | "list" }) {
  const daysLeft = project.expires_at
    ? Math.ceil((new Date(project.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const statusColors: Record<string, string> = {
    deployed: "bg-green-500",
    building: "bg-yellow-500",
    failed: "bg-red-500",
    pending: "bg-mars-500",
  };

  if (viewMode === "grid") {
    return (
      <GlassCard className="group cursor-pointer hover:border-accent-warm/30 transition-all">
        {/* Preview */}
        <div className="h-32 rounded-lg bg-mars-100 mb-4 overflow-hidden relative">
          <div className="absolute inset-0 wireframe-grid opacity-50" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Box className="w-8 h-8 text-mars-400" />
          </div>
          {/* Status badge */}
          <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm">
            <span className={`w-1.5 h-1.5 rounded-full ${statusColors[project.deployment_status]}`} />
            <span className="text-[10px] text-mars-300 capitalize">{project.deployment_status}</span>
          </div>
        </div>

        {/* Content */}
        <h3 className="font-display text-lg text-mars-100 mb-1 group-hover:text-mars-300 transition-colors">
          {project.name}
        </h3>
        <p className="text-xs text-mars-500 mb-3 line-clamp-2">{project.original_prompt}</p>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-mars-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {project.views}
            </span>
            <span className="flex items-center gap-1">
              <GitFork className="w-3 h-3" />
              {project.forks}
            </span>
          </div>
          {daysLeft !== null && daysLeft > 0 && (
            <span className={daysLeft <= 2 ? "text-red-400" : ""}>
              {daysLeft}d left
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 pt-4 border-t border-mars-200 flex items-center gap-2">
          <Link
            href={`/studio/${project.slug}`}
            className="flex-1 btn-secondary text-center text-xs py-2"
          >
            Edit
          </Link>
          {project.deployment_url && (
            <a
              href={project.deployment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-mars-100 hover:bg-mars-200 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-mars-400" />
            </a>
          )}
        </div>
      </GlassCard>
    );
  }

  // List view
  return (
    <GlassCard className="flex items-center gap-4 p-4 hover:border-accent-warm/30 transition-all">
      {/* Icon */}
      <div className="w-12 h-12 rounded-lg bg-mars-100 flex items-center justify-center shrink-0">
        <Box className="w-6 h-6 text-mars-400" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-display text-mars-100 truncate">{project.name}</h3>
          <span className={`w-1.5 h-1.5 rounded-full ${statusColors[project.deployment_status]}`} />
        </div>
        <p className="text-xs text-mars-500 truncate">{project.original_prompt}</p>
      </div>

      {/* Stats */}
      <div className="hidden md:flex items-center gap-6 text-xs text-mars-500">
        <span className="flex items-center gap-1">
          <Eye className="w-3 h-3" />
          {project.views}
        </span>
        <span className="flex items-center gap-1">
          <GitFork className="w-3 h-3" />
          {project.forks}
        </span>
        {daysLeft !== null && daysLeft > 0 && (
          <span className={daysLeft <= 2 ? "text-red-400" : ""}>
            {daysLeft}d
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Link
          href={`/studio/${project.slug}`}
          className="btn-secondary text-xs py-2 px-4"
        >
          Edit
        </Link>
        {project.deployment_url && (
          <a
            href={project.deployment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-mars-100 hover:bg-mars-200 transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-mars-400" />
          </a>
        )}
      </div>
    </GlassCard>
  );
}

export default function DashboardPage() {
  const [user] = useState(mockUser);
  const [projects] = useState(mockProjects);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.original_prompt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalViews = projects.reduce((sum, p) => sum + p.views, 0);
  const totalForks = projects.reduce((sum, p) => sum + p.forks, 0);

  return (
    <div className="min-h-screen pb-16">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="glass-card px-6 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-warm flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-black" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
              <span className="font-display font-semibold text-lg text-mars-100">
                BuildOnX
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <Link href="/explore" className="text-mars-500 hover:text-mars-100 transition-colors">
                Explore
              </Link>
              <Link href="/dashboard" className="text-mars-100">
                Dashboard
              </Link>
            </div>

            {/* User menu */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-sm text-mars-100">@{user.x_username}</div>
                  <div className="text-xs text-mars-500 capitalize">{user.tier} tier</div>
                </div>
                <div className="w-9 h-9 rounded-full bg-mars-200 border border-mars-300 flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-mars-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="pt-28 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="font-display text-3xl text-mars-100 mb-2">
                Welcome back, <span className="text-mars-400">@{user.x_username}</span>
              </h1>
              <p className="text-mars-500">
                Manage your projects and track your builds
              </p>
            </div>

            <Link
              href="https://twitter.com/intent/tweet?text=@BuildAppsOnX%20make%20me%20"
              target="_blank"
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Project
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={Box}
              value={projects.length}
              label="Total Projects"
            />
            <StatCard
              icon={Eye}
              value={totalViews.toLocaleString()}
              label="Total Views"
              trend="+12% this week"
            />
            <StatCard
              icon={GitFork}
              value={totalForks}
              label="Total Forks"
            />
            <StatCard
              icon={Zap}
              value={`${user.credits}/10`}
              label="Credits Left"
            />
          </div>

          {/* Tier upgrade banner (for free users) */}
          {user.tier === "free" && (
            <GlassCard className="mb-8 border-white/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-accent-warm/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg text-mars-100 mb-1">
                    Upgrade to Pro
                  </h3>
                  <p className="text-sm text-mars-500">
                    Get unlimited builds, permanent hosting, custom domains, and more.
                  </p>
                </div>
                <Link href="/pro" className="btn-primary">
                  Upgrade for $19/mo
                </Link>
              </div>
            </GlassCard>
          )}

          {/* Projects section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl text-mars-100">Your Projects</h2>

              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mars-500" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-mars-100 border border-mars-200 rounded-lg text-sm text-mars-100 placeholder:text-mars-500 focus:outline-none focus:border-white/30 w-48"
                  />
                </div>

                {/* View toggle */}
                <div className="flex items-center gap-1 p-1 bg-mars-100 rounded-lg">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === "grid" ? "bg-gradient-warm text-mars-950" : "text-mars-500 hover:text-mars-100"
                    }`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === "list" ? "bg-gradient-warm text-mars-950" : "text-mars-500 hover:text-mars-100"
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Projects grid/list */}
            {filteredProjects.length > 0 ? (
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                    : "flex flex-col gap-3"
                }
              >
                {filteredProjects.map((project) => (
                  <ProjectRow key={project.id} project={project} viewMode={viewMode} />
                ))}
              </div>
            ) : (
              <GlassCard className="text-center py-12">
                <Box className="w-12 h-12 text-mars-400 mx-auto mb-4" />
                <h3 className="font-display text-lg text-mars-100 mb-2">No projects yet</h3>
                <p className="text-mars-500 mb-6">
                  Tweet at @BuildAppsOnX to create your first project!
                </p>
                <Link
                  href="https://twitter.com/intent/tweet?text=@BuildAppsOnX%20make%20me%20"
                  target="_blank"
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Twitter className="w-4 h-4" />
                  Create First Project
                </Link>
              </GlassCard>
            )}
          </div>

          {/* Recent activity */}
          <div>
            <h2 className="font-display text-xl text-mars-100 mb-4">Recent Activity</h2>
            <GlassCard>
              <div className="space-y-4">
                {[
                  { action: "Project deployed", project: "Crypto Dashboard", time: "2 hours ago", icon: Zap },
                  { action: "Build started", project: "Weather App", time: "4 hours ago", icon: Activity },
                  { action: "Project forked", project: "Recipe Finder", time: "1 day ago", icon: GitFork },
                ].map((activity, i) => (
                  <div key={i} className="flex items-center gap-4 py-3 border-b border-mars-200 last:border-0">
                    <div className="w-8 h-8 rounded-lg bg-mars-100 flex items-center justify-center">
                      <activity.icon className="w-4 h-4 text-mars-400" />
                    </div>
                    <div className="flex-1">
                      <span className="text-mars-100">{activity.action}</span>
                      <span className="text-mars-500"> · {activity.project}</span>
                    </div>
                    <span className="text-xs text-mars-500">{activity.time}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      </main>
    </div>
  );
}

