"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Zap, 
  Search, 
  ArrowRight, 
  Eye, 
  GitFork, 
  Loader2,
  Grid3X3,
  LayoutList,
  Sparkles,
  TrendingUp,
  Clock,
  Star,
  Filter,
  ChevronDown,
  Box,
  Code2,
  Palette,
  Timer,
  Cloud,
  Calculator,
  Bell,
  User,
  Activity,
  Flame,
  Trophy,
  ExternalLink,
  Play
} from "lucide-react";

interface Project {
  id: string;
  slug: string;
  name: string;
  description: string;
  views: number;
  forks: number;
  created_at: string;
  category?: string;
  author?: string;
  tech?: string[];
  featured?: boolean;
}

// Categories with icons
const categories = [
  { id: "all", name: "All Projects", icon: Grid3X3 },
  { id: "productivity", name: "Productivity", icon: Timer },
  { id: "dashboard", name: "Dashboards", icon: Activity },
  { id: "tools", name: "Dev Tools", icon: Code2 },
  { id: "design", name: "Design", icon: Palette },
  { id: "weather", name: "Weather", icon: Cloud },
  { id: "finance", name: "Finance", icon: Calculator },
];

// Sort options
const sortOptions = [
  { id: "trending", name: "Trending", icon: TrendingUp },
  { id: "newest", name: "Newest", icon: Clock },
  { id: "popular", name: "Most Popular", icon: Star },
];

export default function ExplorePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("trending");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch("/api/projects?per_page=50");
        if (res.ok) {
          const data = await res.json();
          setProjects(data.items || []);
        }
      } catch (err) {
        console.error("Failed to fetch projects:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  // Demo projects with more data
  const demoProjects: Project[] = [
    {
      id: "1",
      slug: "crypto-dash-x8k2",
      name: "Crypto Dashboard",
      description: "Real-time cryptocurrency price tracker with portfolio management and price alerts",
      views: 2847,
      forks: 142,
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      category: "finance",
      author: "@trader_mike",
      tech: ["React", "Chart.js", "WebSocket"],
      featured: true,
    },
    {
      id: "2",
      slug: "recipe-match-m3n1",
      name: "Recipe Finder AI",
      description: "AI-powered recipe suggestions based on ingredients you have. Supports dietary restrictions.",
      views: 1923,
      forks: 89,
      created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      category: "tools",
      author: "@home_chef",
      tech: ["Vue", "AI", "API"],
      featured: true,
    },
    {
      id: "3",
      slug: "focus-timer-k2p4",
      name: "Zen Focus Timer",
      description: "Beautiful pomodoro timer with ambient sounds, session analytics, and focus streaks",
      views: 1567,
      forks: 67,
      created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      category: "productivity",
      author: "@deep_work",
      tech: ["React", "Audio API"],
    },
    {
      id: "4",
      slug: "habit-track-n5m2",
      name: "Habit Constellation",
      description: "Gamified habit tracking with beautiful visualizations. Watch your progress grow like stars.",
      views: 1245,
      forks: 54,
      created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      category: "productivity",
      author: "@growth_mindset",
      tech: ["Canvas", "LocalStorage"],
    },
    {
      id: "5",
      slug: "weather-now-p8k1",
      name: "Weather Canvas",
      description: "Immersive weather experience with animated backgrounds that match current conditions",
      views: 1678,
      forks: 78,
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      category: "weather",
      author: "@sky_watcher",
      tech: ["Three.js", "Weather API"],
      featured: true,
    },
    {
      id: "6",
      slug: "md-editor-q3w9",
      name: "Markdown Studio",
      description: "Professional markdown editor with vim keybindings, live preview, and GitHub sync",
      views: 2121,
      forks: 112,
      created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      category: "tools",
      author: "@dev_writer",
      tech: ["Monaco", "Markdown"],
    },
    {
      id: "7",
      slug: "color-picker-r7t5",
      name: "Palette Generator",
      description: "AI-powered color palette generator. Extract palettes from images or generate from keywords.",
      views: 1389,
      forks: 45,
      created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
      category: "design",
      author: "@color_theory",
      tech: ["Canvas", "AI"],
    },
    {
      id: "8",
      slug: "todo-minimal-s2u8",
      name: "Minimal Tasks",
      description: "Distraction-free task management with keyboard shortcuts and natural language input",
      views: 1923,
      forks: 87,
      created_at: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
      category: "productivity",
      author: "@minimal_dev",
      tech: ["Vanilla JS"],
    },
    {
      id: "9",
      slug: "budget-tracker-v4x",
      name: "Money Flow",
      description: "Visual expense tracking with beautiful charts. See exactly where your money goes.",
      views: 1456,
      forks: 63,
      created_at: new Date(Date.now() - 120 * 60 * 60 * 1000).toISOString(),
      category: "finance",
      author: "@save_money",
      tech: ["D3.js", "IndexedDB"],
    },
    {
      id: "10",
      slug: "code-snippets-b7n",
      name: "Snippet Vault",
      description: "Personal code snippet manager with syntax highlighting and cloud sync",
      views: 1834,
      forks: 94,
      created_at: new Date(Date.now() - 168 * 60 * 60 * 1000).toISOString(),
      category: "tools",
      author: "@code_hoader",
      tech: ["Prism", "Firebase"],
    },
    {
      id: "11",
      slug: "gradient-maker-c9m",
      name: "Gradient Lab",
      description: "Create stunning CSS gradients with mesh gradients, animations, and export options",
      views: 1678,
      forks: 71,
      created_at: new Date(Date.now() - 200 * 60 * 60 * 1000).toISOString(),
      category: "design",
      author: "@css_artist",
      tech: ["CSS", "Canvas"],
    },
    {
      id: "12",
      slug: "focus-sounds-d2k",
      name: "Ambient Focus",
      description: "Customizable ambient soundscapes for deep work. Mix rain, cafe, and nature sounds.",
      views: 2234,
      forks: 103,
      created_at: new Date(Date.now() - 240 * 60 * 60 * 1000).toISOString(),
      category: "productivity",
      author: "@sound_worker",
      tech: ["Web Audio", "PWA"],
    },
  ];

  const displayProjects = projects.length > 0 ? projects : demoProjects;

  // Filter and sort
  const filteredProjects = displayProjects
    .filter((p) => {
      const matchesSearch = 
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "popular") return b.views - a.views;
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      // Trending: combination of views and recency
      const aScore = a.views / (Date.now() - new Date(a.created_at).getTime());
      const bScore = b.views / (Date.now() - new Date(b.created_at).getTime());
      return bScore - aScore;
    });

  const featuredProjects = demoProjects.filter(p => p.featured);

  // Stats
  const totalViews = displayProjects.reduce((sum, p) => sum + p.views, 0);
  const totalForks = displayProjects.reduce((sum, p) => sum + p.forks, 0);

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="glass-card px-6 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-warm flex items-center justify-center">
                <Zap className="w-5 h-5 text-mars-950" />
              </div>
              <span className="font-display font-semibold text-lg text-mars-100">
                BuildOnX
              </span>
            </Link>
            
            <div className="hidden md:flex items-center gap-8">
              <Link href="/" className="text-mars-300 hover:text-mars-100 transition-colors">
                Home
              </Link>
              <Link href="/explore" className="text-mars-100 font-medium">
                Explore
              </Link>
              <Link href="/docs" className="text-mars-300 hover:text-mars-100 transition-colors">
                Documentation
              </Link>
            </div>
            
            <div className="flex items-center gap-4">
              <button className="p-2 text-mars-400 hover:text-mars-100 transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              <div className="w-9 h-9 rounded-full bg-mars-700 border border-mars-600" />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-8 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Stats Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <motion.div 
              className="glass-card px-6 py-4 inline-flex items-center gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div>
                <div className="text-2xl font-light text-mars-100">{displayProjects.length}</div>
                <div className="text-xs text-mars-500 uppercase tracking-wider">Projects</div>
              </div>
              <div className="w-px h-10 bg-mars-700" />
              <div>
                <div className="text-2xl font-light text-mars-100">{(totalViews / 1000).toFixed(1)}k</div>
                <div className="text-xs text-mars-500 uppercase tracking-wider">Total Views</div>
              </div>
              <div className="w-px h-10 bg-mars-700" />
              <div>
                <div className="text-2xl font-light text-mars-100">{totalForks}</div>
                <div className="text-xs text-mars-500 uppercase tracking-wider">Forks</div>
              </div>
            </motion.div>

            <motion.div 
              className="pill"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Flame className="w-3 h-3 text-mars-100" />
              <span>{filteredProjects.length} projects found</span>
            </motion.div>
          </div>

          {/* Title & Search */}
          <div className="grid grid-cols-12 gap-6">
            {/* Left - Title */}
            <div className="col-span-12 lg:col-span-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <h1 className="font-display text-display-md text-mars-100 mb-3">
                  Explore<br/>
                  <span className="text-transparent bg-clip-text bg-gradient-warm">Projects</span>
                </h1>
                <p className="text-mars-400">
                  Discover what the community is building.<br/>
                  Fork, remix, or get inspired.
                </p>
              </motion.div>
            </div>

            {/* Right - Search & Filters */}
            <div className="col-span-12 lg:col-span-8">
              <motion.div 
                className="glass-card p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {/* Search Bar */}
                <div className="relative mb-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-mars-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search projects, keywords, or authors..."
                    className="w-full bg-mars-900/50 border border-mars-700 rounded-xl pl-12 pr-4 py-3 text-mars-100 placeholder-mars-500 focus:border-accent-warm focus:outline-none transition-colors"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <kbd className="hidden sm:inline-block px-2 py-1 text-xs text-mars-500 bg-mars-800 rounded">⌘K</kbd>
                  </div>
                </div>

                {/* Filter Row */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Categories */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 -mb-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                          selectedCategory === cat.id
                            ? "bg-gradient-warm text-mars-950"
                            : "bg-mars-800/50 text-mars-300 hover:bg-mars-700/50"
                        }`}
                      >
                        <cat.icon className="w-4 h-4" />
                        {cat.name}
                      </button>
                    ))}
                  </div>

                  {/* Sort & View */}
                  <div className="flex items-center gap-3">
                    {/* Sort Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 px-4 py-2 bg-mars-800/50 rounded-lg text-sm text-mars-300 hover:bg-mars-700/50 transition-colors"
                      >
                        <Filter className="w-4 h-4" />
                        {sortOptions.find(s => s.id === sortBy)?.name}
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      
                      <AnimatePresence>
                        {showFilters && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute right-0 top-full mt-2 bg-mars-800 border border-mars-700 rounded-xl overflow-hidden z-20 min-w-[160px]"
                          >
                            {sortOptions.map((option) => (
                              <button
                                key={option.id}
                                onClick={() => {
                                  setSortBy(option.id);
                                  setShowFilters(false);
                                }}
                                className={`w-full flex items-center gap-2 px-4 py-3 text-sm text-left hover:bg-mars-700 transition-colors ${
                                  sortBy === option.id ? "text-mars-100" : "text-mars-300"
                                }`}
                              >
                                <option.icon className="w-4 h-4" />
                                {option.name}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* View Toggle */}
                    <div className="toggle-group">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={`toggle-item ${viewMode === "grid" ? "active" : ""}`}
                      >
                        <Grid3X3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        className={`toggle-item ${viewMode === "list" ? "active" : ""}`}
                      >
                        <LayoutList className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Projects */}
      {selectedCategory === "all" && !searchQuery && (
        <section className="py-8 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <Trophy className="w-5 h-5 text-mars-100" />
              <h2 className="font-display text-xl text-mars-100">Featured</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link href={`/p/${project.slug}`}>
                    <div className="glass-card p-1 group hover:border-accent-warm/30 transition-all duration-300 hover:shadow-warm">
                      {/* Preview Image */}
                      <div className="relative h-40 rounded-2xl bg-gradient-to-br from-mars-800 to-mars-900 overflow-hidden mb-4">
                        <div className="absolute inset-0 wireframe-grid opacity-30" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-16 h-16 rounded-2xl bg-mars-700/50 flex items-center justify-center">
                            <Sparkles className="w-8 h-8 text-mars-100" />
                          </div>
                        </div>
                        {/* Featured badge */}
                        <div className="absolute top-3 left-3">
                          <span className="px-2 py-1 bg-gradient-warm/20 text-mars-100 text-xs font-medium rounded-full">
                            ⭐ Featured
                          </span>
                        </div>
                        {/* Play button on hover */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-mars-950/50">
                          <div className="w-12 h-12 rounded-full bg-gradient-warm flex items-center justify-center">
                            <Play className="w-5 h-5 text-mars-950 ml-0.5" />
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 pt-0">
                        <h3 className="font-display text-lg text-mars-100 mb-2 group-hover:text-mars-100 transition-colors">
                          {project.name}
                        </h3>
                        <p className="text-sm text-mars-400 mb-4 line-clamp-2">
                          {project.description}
                        </p>
                        
                        {/* Tech tags */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {project.tech?.slice(0, 3).map((tech) => (
                            <span key={tech} className="px-2 py-1 bg-mars-800/50 text-mars-400 text-xs rounded-md">
                              {tech}
                            </span>
                          ))}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-mars-500">{project.author}</span>
                          <div className="flex items-center gap-3 text-mars-500">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5" />
                              {project.views.toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <GitFork className="w-3.5 h-3.5" />
                              {project.forks}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Projects Grid */}
      <section className="py-8 px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          {!loading && filteredProjects.length > 0 && (
            <div className="flex items-center gap-3 mb-6">
              <Box className="w-5 h-5 text-mars-400" />
              <h2 className="font-display text-xl text-mars-100">
                {selectedCategory === "all" ? "All Projects" : categories.find(c => c.id === selectedCategory)?.name}
              </h2>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-mars-100 animate-spin mb-4" />
              <p className="text-mars-400">Loading projects...</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Link href={`/p/${project.slug}`}>
                    <div className="glass-card-subtle p-4 group hover:border-accent-warm/20 transition-all duration-300 h-full flex flex-col">
                      {/* Mini preview */}
                      <div className="h-28 rounded-xl bg-mars-900/50 mb-4 overflow-hidden relative">
                        <div className="absolute inset-0 wireframe-grid opacity-20" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Box className="w-6 h-6 text-mars-600 group-hover:text-mars-100/50 transition-colors" />
                        </div>
                      </div>
                      
                      {/* Content */}
                      <h3 className="font-medium text-mars-100 mb-1 group-hover:text-mars-100 transition-colors">
                        {project.name}
                      </h3>
                      <p className="text-sm text-mars-500 mb-4 line-clamp-2 flex-grow">
                        {project.description}
                      </p>
                      
                      {/* Footer */}
                      <div className="flex items-center justify-between text-xs text-mars-500">
                        <span>{project.author || "@builder"}</span>
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
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="space-y-4">
              {filteredProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Link href={`/p/${project.slug}`}>
                    <div className="glass-card-subtle p-4 group hover:border-accent-warm/20 transition-all duration-300 flex items-center gap-6">
                      {/* Preview */}
                      <div className="w-20 h-20 rounded-xl bg-mars-900/50 flex-shrink-0 overflow-hidden relative">
                        <div className="absolute inset-0 wireframe-grid opacity-20" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Box className="w-6 h-6 text-mars-600" />
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-grow min-w-0">
                        <h3 className="font-medium text-mars-100 mb-1 group-hover:text-mars-100 transition-colors">
                          {project.name}
                        </h3>
                        <p className="text-sm text-mars-500 line-clamp-1">
                          {project.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-mars-500">
                          <span>{project.author || "@builder"}</span>
                          {project.tech?.slice(0, 2).map((t) => (
                            <span key={t} className="px-2 py-0.5 bg-mars-800/50 rounded">{t}</span>
                          ))}
                        </div>
                      </div>
                      
                      {/* Stats */}
                      <div className="flex items-center gap-6 text-sm text-mars-500">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {project.views.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <GitFork className="w-4 h-4" />
                          {project.forks}
                        </span>
                        <ArrowRight className="w-4 h-4 text-mars-600 group-hover:text-mars-100 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredProjects.length === 0 && (
            <motion.div 
              className="glass-card p-12 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="w-16 h-16 rounded-2xl bg-mars-800/50 flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-mars-500" />
              </div>
              <h3 className="font-display text-xl text-mars-100 mb-2">No projects found</h3>
              <p className="text-mars-400 mb-6">Try adjusting your search or filters</p>
              <a
                href="https://twitter.com/intent/tweet?text=@BuildAppsOnX%20make%20me%20"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex items-center gap-2"
              >
                Be the first to build something
                <ArrowRight className="w-4 h-4" />
              </a>
            </motion.div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-mars-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6 text-mars-500">
            <Link href="/" className="hover:text-mars-300 transition-colors">Home</Link>
            <Link href="/docs" className="hover:text-mars-300 transition-colors">Docs</Link>
          </div>
          <span className="text-xs text-mars-600">Built with ❤️ and Claude</span>
        </div>
      </footer>
    </div>
  );
}
