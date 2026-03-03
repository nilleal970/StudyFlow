'use client';

import React from 'react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface DashboardChartsProps {
  chartData: any[];
  subjectData: any[];
}

export function PerformanceChart({ chartData }: { chartData: any[] }) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorMin" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
          />
          <Area type="monotone" dataKey="minutos" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorMin)" />
          <Area type="monotone" dataKey="questoes" stroke="#10b981" strokeWidth={3} fillOpacity={0} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DistributionChart({ subjectData }: { subjectData: any[] }) {
  return (
    <div className="h-[200px] w-full flex-1">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={subjectData}
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {subjectData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
