import React, { useEffect, useRef, useState } from 'react';
import { useRealTimeData } from '../../hooks/useRealTimeData';

export const AnalyticsView: React.FC = () => {
  const trendChartRef = useRef<HTMLDivElement>(null);
  const distributionChartRef = useRef<HTMLDivElement>(null);
  
  // Fetch real-time statistics from backend
  const { data: backendStats, loading: statsLoading } = useRealTimeData<any>({ endpoint: '/api/v1/analytics', interval: 5000 });
  
  const [stats, setStats] = useState({
    incidentsTrend: [0, 0, 0, 1, 1, 2, 3, 3, 1, 1, 0, 0],
    totalIncidents: [2, 1, 0, 3, 5, 8, 11, 14, 9, 6, 4, 2],
    distribution: [33, 17, 21, 17, 12],
    healthMetrics: {
      accuracy: 98.4,
      fps: 120,
      cameras: 19,
      alerts: 3
    },
    recentIncidents: [
      { id: 'INC-MDP-8812', title: 'VEHICLE ACCIDENT & IMPACT DETECTED', location: 'MITS College Junction - Sector 1, Madanapalle', severity: 9.3, status: 'Active' },
      { id: 'INC-MDP-8811', title: 'WEAPON SIGNATURE LOCK ALERT', location: 'RTC Bus Stand Circle - Sector 2, Madanapalle', severity: 7.4, status: 'Active' },
      { id: 'INC-MDP-8810', title: 'SMOKE & FIRE ANOMALY DETECTED', location: 'Patel Road Kadiri Junction - Sector 3, Madanapalle', severity: 5.8, status: 'Investigating' }
    ]
  });

  // Update stats when backend data changes
  useEffect(() => {
    if (backendStats) {
      setStats({
        incidentsTrend: backendStats.incidents_trend || stats.incidentsTrend,
        totalIncidents: backendStats.total_incidents || stats.totalIncidents,
        distribution: backendStats.distribution || stats.distribution,
        healthMetrics: backendStats.health_metrics || stats.healthMetrics,
        recentIncidents: backendStats.recent_incidents && backendStats.recent_incidents.length > 0 ? backendStats.recent_incidents : stats.recentIncidents
      });
    }
  }, [backendStats]);

  useEffect(() => {
    let trendChart: any = null;
    let distChart: any = null;

    const renderCharts = async () => {
      if (typeof window === 'undefined') return;
      const ApexCharts = (await import('apexcharts')).default;

      // Trend Chart
      if (trendChartRef.current) {
        const trendOptions = {
          chart: {
            type: 'area' as const,
            height: 280,
            background: 'transparent',
            toolbar: { show: false },
          },
          theme: { mode: 'dark' as const },
          colors: ['#ef4444', '#3b82f6'],
          stroke: { curve: 'smooth' as const, width: 2 },
          fill: {
            type: 'gradient',
            gradient: { opacityFrom: 0.4, opacityTo: 0.05 },
          },
          dataLabels: { enabled: false },
          series: [
            { name: 'Critical Threats', data: stats.incidentsTrend },
            { name: 'Total Incidents', data: stats.totalIncidents },
          ],
          xaxis: {
            categories: ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'],
            labels: { style: { colors: '#94a3b8', fontSize: '10px', fontFamily: 'sans-serif' } },
          },
          yaxis: {
            labels: { style: { colors: '#94a3b8', fontSize: '10px', fontFamily: 'sans-serif' } },
          },
          grid: { borderColor: 'rgba(255,255,255,0.08)' },
        };
        trendChart = new ApexCharts(trendChartRef.current, trendOptions);
        trendChart.render();
      }

      // Distribution Donut Chart
      if (distributionChartRef.current) {
        const distOptions = {
          chart: {
            type: 'donut' as const,
            height: 280,
            background: 'transparent',
          },
          theme: { mode: 'dark' as const },
          colors: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'],
          labels: ['Fights / Assaults', 'Weapon Detection', 'Perimeter Intrusion', 'Unattended Object', 'Traffic Collision'],
          series: stats.distribution,
          dataLabels: { enabled: false },
          legend: {
            position: 'bottom' as const,
            labels: { colors: '#e2e8f0' },
            fontFamily: 'sans-serif',
            fontSize: '11px',
          },
        };
        distChart = new ApexCharts(distributionChartRef.current, distOptions);
        distChart.render();
      }
    };

    renderCharts();

    return () => {
      if (trendChart) trendChart.destroy();
      if (distChart) distChart.destroy();
    };
  }, [stats]);

  return (
    <div className="flex-1 p-6 bg-slate-900 text-white overflow-y-auto font-sans space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white">Analytics Dashboard</h2>
          <p className="text-sm text-slate-400">Real-time system performance and incident statistics</p>
        </div>
        {statsLoading && <span className="text-sm text-slate-400">Syncing live analytics...</span>}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 p-4 rounded-lg">
          <p className="text-sm text-slate-400 mb-1">AI Vision Accuracy</p>
          <p className="text-2xl font-bold text-emerald-400">{stats.healthMetrics.accuracy.toFixed(1)}%</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg">
          <p className="text-sm text-slate-400 mb-1">Processing Speed</p>
          <p className="text-2xl font-bold text-blue-400">{stats.healthMetrics.fps.toFixed(0)} FPS</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg">
          <p className="text-sm text-slate-400 mb-1">Active Cameras</p>
          <p className="text-2xl font-bold text-white">{stats.healthMetrics.cameras}</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg">
          <p className="text-sm text-slate-400 mb-1">Active Alerts</p>
          <p className="text-2xl font-bold text-amber-400">{stats.healthMetrics.alerts}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <div className="bg-slate-800 p-5 rounded-lg">
          <h3 className="text-md font-bold text-white mb-3">24-Hour Incident Trend</h3>
          <div ref={trendChartRef} className="w-full"></div>
        </div>

        {/* Distribution Chart */}
        <div className="bg-slate-800 p-5 rounded-lg">
          <h3 className="text-md font-bold text-white mb-3">Incident Category Distribution</h3>
          <div ref={distributionChartRef} className="w-full"></div>
        </div>
      </div>

      {/* Incident Summary Table */}
      <div className="bg-slate-800 p-5 rounded-lg font-mono">
        <h3 className="text-md font-bold text-white mb-3 flex items-center justify-between">
          <span>Recent Incidents Summary</span>
          <span className="text-xs text-blue-400 font-normal">{stats.recentIncidents.length} Records</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-xs">
                <th className="text-left py-2 px-3 text-slate-400 font-medium">ID</th>
                <th className="text-left py-2 px-3 text-slate-400 font-medium">Title</th>
                <th className="text-left py-2 px-3 text-slate-400 font-medium">Location</th>
                <th className="text-left py-2 px-3 text-slate-400 font-medium">Severity</th>
                <th className="text-left py-2 px-3 text-slate-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentIncidents.map((inc) => (
                <tr key={inc.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="py-2.5 px-3 text-white font-bold text-xs">{inc.id}</td>
                  <td className="py-2.5 px-3 text-slate-200 text-xs">{inc.title}</td>
                  <td className="py-2.5 px-3 text-slate-400 text-xs truncate max-w-[200px]">{inc.location}</td>
                  <td className="py-2.5 px-3 font-bold text-xs">
                    <span className={inc.severity >= 8.0 ? 'text-red-400' : (inc.severity >= 6.0 ? 'text-amber-400' : 'text-blue-400')}>
                      {typeof inc.severity === 'number' ? inc.severity.toFixed(1) : inc.severity}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-xs">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      inc.status === 'Active' ? 'bg-red-950 text-red-400 border border-red-500/30' : (inc.status === 'Resolved' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-blue-950 text-blue-400 border border-blue-500/30')
                    }`}>
                      {inc.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
