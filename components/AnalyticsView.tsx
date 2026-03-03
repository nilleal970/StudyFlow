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
import { Activity, Layers } from 'lucide-react';
import { StudyContent } from '@/lib/scheduler';

interface AnalyticsViewProps {
  studies: StudyContent[];
  chartData: any[];
  subjectData: any[];
}

export default function AnalyticsView({ studies, chartData, subjectData }: AnalyticsViewProps) {
  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800 shadow-xl">
          <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3">
            <Activity className="text-indigo-400" size={20} /> Atividade Semanal
          </h3>
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
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px' }}
                  itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="minutos" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorMin)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800 shadow-xl">
          <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3">
            <Layers className="text-emerald-400" size={20} /> Distribuição por Matéria
          </h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={subjectData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {subjectData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
