'use client';

import { useEffect, useState, useCallback } from 'react';
import { ExternalLink, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { SkillExecution } from '@/types';
import { SKILLS_REGISTRY } from '@/lib/skills-registry';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

function truncate(s: string, n = 8) {
  return s.length > n * 2 ? `${s.slice(0, n)}…${s.slice(-n)}` : s;
}

interface SkillCount {
  name: string;
  count: number;
  volume: number;
}

export default function LeaderboardPage() {
  const [executions, setExecutions] = useState<SkillExecution[]>([]);
  const [stats, setStats] = useState({ totalExecutions: 0, totalVolumeUsdc: 0, uniqueProviders: 1 });
  const [rolling24h, setRolling24h] = useState(0);

  const skillMap = Object.fromEntries(SKILLS_REGISTRY.map((s) => [s.id, s.name]));

  const fetchData = useCallback(() => {
    fetch('/api/registry/executions?limit=50')
      .then((r) => r.json())
      .then((d) => {
        const execs: SkillExecution[] = d.executions || [];
        setExecutions(execs);

        const now = Date.now();
        const h24 = execs.filter((e) => now - new Date(e.created_at).getTime() < 86_400_000).length;
        setRolling24h(h24);
      })
      .catch(() => {});

    fetch('/api/registry/stats')
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 10_000);
    return () => clearInterval(t);
  }, [fetchData]);

  // Aggregate by skill
  const skillCounts: Record<string, SkillCount> = {};
  for (const exec of executions) {
    const id = exec.skill_id;
    if (!skillCounts[id]) {
      skillCounts[id] = { name: skillMap[id] || id, count: 0, volume: 0 };
    }
    skillCounts[id].count++;
    skillCounts[id].volume += exec.amount_usdc;
  }
  const chartData = Object.values(skillCounts).sort((a, b) => b.count - a.count);

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-[#1e1e2e] bg-[#13131a] px-3 py-2 text-xs">
          <p className="text-white font-medium">{label}</p>
          <p className="text-[#14F195]">{payload[0].value} executions</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#9945FF]/30 bg-[#9945FF]/10 px-3 py-1 text-xs text-[#9945FF] mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-[#9945FF] animate-pulse" />
            Live · 10s refresh
          </div>
          <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
          <p className="text-[#6B7280] mt-2">Top skills, providers, and execution history.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Executions', value: stats.totalExecutions.toLocaleString(), color: 'text-white' },
            { label: 'Total Volume', value: `$${stats.totalVolumeUsdc.toFixed(4)} USDC`, color: 'text-[#14F195]' },
            { label: 'Active Providers', value: stats.uniqueProviders.toString(), color: 'text-[#9945FF]' },
            { label: 'Rolling 24h', value: rolling24h.toString(), color: 'text-[#FFB800]' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-[#1e1e2e] bg-[#13131a] p-4">
              <p className="text-xs text-[#6B7280] mb-1">{label}</p>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Bar chart */}
          <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] p-5">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp size={16} className="text-[#9945FF]" />
              <h2 className="text-base font-semibold text-white">Top Skills by Executions</h2>
            </div>
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-[#6B7280] text-sm">
                No data yet — run some skills!
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ left: -20 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#6B7280', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#6B7280', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(153,69,255,0.05)' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={i === 0 ? '#9945FF' : i === 1 ? '#7b2fd6' : '#1e1e2e'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top by volume */}
          <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] p-5">
            <h2 className="text-base font-semibold text-white mb-5">Top Skills by Volume</h2>
            <div className="space-y-3">
              {chartData.length === 0 ? (
                <p className="text-sm text-[#6B7280] text-center py-8">No data yet.</p>
              ) : (
                chartData.slice(0, 5).map((item, i) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="w-5 text-xs text-[#6B7280] font-mono shrink-0">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-white">{item.name}</span>
                        <span className="text-xs text-[#14F195] font-mono">
                          ${item.volume.toFixed(4)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#0a0a0f] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#9945FF] to-[#14F195]"
                          style={{
                            width: `${(item.volume / (chartData[0]?.volume || 1)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Transactions table */}
        <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e2e]">
            <h2 className="text-base font-semibold text-white">Recent Transactions</h2>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#14F195] animate-pulse" />
              <span className="text-xs text-[#6B7280]">Live</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1e1e2e] bg-[#0f0f18]">
                  {['Time', 'Skill', 'Amount', 'Duration', 'Tx Hash'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[#6B7280] font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e2e]">
                {executions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-[#6B7280]">
                      No transactions yet. Run a skill to see it here!
                    </td>
                  </tr>
                ) : (
                  executions.map((exec) => (
                    <tr key={exec.id} className="hover:bg-[#0a0a0f] transition-colors">
                      <td className="px-5 py-3 text-[#6B7280]">{timeAgo(exec.created_at)}</td>
                      <td className="px-5 py-3 text-white capitalize">
                        {(skillMap[exec.skill_id] || exec.skill_id).replace(/-/g, ' ')}
                      </td>
                      <td className="px-5 py-3 font-mono text-[#14F195]">
                        ${exec.amount_usdc.toFixed(3)}
                      </td>
                      <td className="px-5 py-3 text-[#6B7280]">{exec.duration_ms}ms</td>
                      <td className="px-5 py-3">
                        <a
                          href={`https://explorer.solana.com/tx/${exec.tx_hash}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[#9945FF] hover:text-[#b36bff] flex items-center gap-1"
                        >
                          {truncate(exec.tx_hash, 6)}
                          <ExternalLink size={10} />
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
