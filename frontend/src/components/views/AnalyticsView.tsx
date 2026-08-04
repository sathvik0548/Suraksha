import React, { useEffect, useRef, useState } from 'react';
import { useRealTimeData } from '../../hooks/useRealTimeData';

export const AnalyticsView: React.FC = () => {
  const trendChartRef = useRef<HTMLDivElement>(null);
  const distributionChartRef = useRef<HTMLDivElement>(null);
  
  // Fetch real-time statistics from backend
  const { data: backendStats, loading: statsLoading } = useRealTimeData<any>({ endpoint: '/api/v1/statistics', interval: 5000 });
  
  const [stats, setStats] = useState({
    incidentsTrend: [0, 0, 0, 1, 1, 2, 3, 3, 1, 1, 0, 0],
    totalIncidents: [2, 1, 0, 3, 5, 8, 11, 14, 9, 6, 4, 2],
    distribution: [33, 17, 21, 17, 12],
    healthMetrics: {
      accuracy: 98.4,
      fps: 178,
      cameras: 6,
      alerts: 3
    }
  });

  // Update stats when backend data changes
  useEffect(() => {
    if (backendStats) {
      setStats({
        incidentsTrend: backendStats.incidents_trend || stats.incidentsTrend,
        totalIncidents: backendStats.total_incidents || stats.totalIncidents,
        distribution: backendStats.distribution || stats.distribution,
        healthMetrics: backendStats.health_metrics || stats.healthMetrics
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
        {statsLoading && <span className="text-sm text-slate-400">Loading...</span>}
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
      <div className="bg-slate-800 p-5 rounded-lg">
        <h3 className="text-md font-bold text-white mb-3">Recent Incidents Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 px-3 text-slate-400 font-medium">ID</th>
                <th className="text-left py-2 px-3 text-slate-400 font-medium">Title</th>
                <th className="text-left py-2 px-3 text-slate-400 font-medium">Location</th>
                <th className="text-left py-2 px-3 text-slate-400 font-medium">Severity</th>
                <th className="text-left py-2 px-3 text-slate-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-700">
                <td className="py-2 px-3 text-white">INC-001</td>
                <td className="py-2 px-3 text-white">Weapon Detection</td>
                <td className="py-2 px-3 text-slate-400">Sector 7G</td>
                <td className="py-2 px-3 text-red-400">8.5</td>
                <td className="py-2 px-3 text-green-400">Resolved</td>
              </tr>
              <tr className="border-b border-slate-700">
                <td className="py-2 px-3 text-white">INC-002</td>
                <td className="py-2 px-3 text-white">Fight Detected</td>
                <td className="py-2 px-3 text-slate-400">Sector 3A</td>
                <td className="py-2 px-3 text-yellow-400">6.2</td>
                <td className="py-2 px-3 text-blue-400">Investigating</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-white">INC-003</td>
                <td className="py-2 px-3 text-white">Perimeter Breach</td>
                <td className="py-2 px-3 text-slate-400">Sector 9</td>
                <td className="py-2 px-3 text-red-400">7.8</td>
                <td className="py-2 px-3 text-yellow-400">Dispatched</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
