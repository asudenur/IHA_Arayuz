import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Typography } from '@mui/material';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="tooltip-time">Time: {label}s</p>
        {payload.map((entry, index) => (
          <p key={index} className="tooltip-item" style={{ color: entry.color }}>
            {entry.name}: {entry.value.toFixed(2)}°
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const TuningGraph = ({ attitudeData }) => {
  const [data, setData] = useState([]);
  const maxDataPoints = 150; 

  useEffect(() => {
    if (attitudeData) {
      setData(prevData => {
        const newData = [...prevData, {
          time: new Date().getTime(),
          roll: attitudeData.roll,
          pitch: attitudeData.pitch,
          yaw: attitudeData.yaw,
          rollTarget: 0,
          pitchTarget: 0,
          yawTarget: 0
        }];

        if (newData.length > maxDataPoints) {
          return newData.slice(-maxDataPoints);
        }
        return newData;
      });
    }
  }, [attitudeData]);

  return (
    <div className="tuning-graph">
      <Typography 
        variant="h5" 
        sx={{ 
          mb: 2,
          fontWeight: 600,
          color: 'var(--accent-color)',
          fontSize: '1.4rem',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}
      >
        Attitude Tuning Graph
      </Typography>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 20
          }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="var(--grid-color)"
            opacity={0.3}
          />
          <XAxis
            dataKey="time"
            type="number"
            domain={['auto', 'auto']}
            tickFormatter={(time) => Math.round((time - data[0]?.time || 0) / 1000)}
            stroke="var(--text-secondary)"
            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
            label={{ 
              value: 'Time (seconds)', 
              position: 'bottom',
              fill: 'var(--text-secondary)',
              fontSize: 12,
              offset: 0
            }}
          />
          <YAxis
            domain={[-180, 180]}
            stroke="var(--text-secondary)"
            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
            label={{ 
              value: 'Angle (degrees)', 
              angle: -90, 
              position: 'insideLeft',
              fill: 'var(--text-secondary)',
              fontSize: 12,
              offset: 10
            }}
          />
          <Tooltip 
            content={<CustomTooltip />}
            contentStyle={{
              backgroundColor: 'var(--bg-panel)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '12px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}
          />
          <Legend 
            verticalAlign="top" 
            height={36}
            wrapperStyle={{
              paddingTop: '10px',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--text-secondary)'
            }}
          />
          <ReferenceLine 
            y={0} 
            stroke="var(--text-secondary)"
            strokeDasharray="3 3"
            opacity={0.2}
          />
          <Line
            type="monotone"
            dataKey="roll"
            name="Roll"
            stroke="#ff4757"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="pitch"
            name="Pitch"
            stroke="#2ed573"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="yaw"
            name="Yaw"
            stroke="#1e90ff"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="rollTarget"
            name="Roll Target"
            stroke="#ff4757"
            strokeWidth={1}
            strokeDasharray="5 5"
            dot={false}
            opacity={0.3}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="pitchTarget"
            name="Pitch Target"
            stroke="#2ed573"
            strokeWidth={1}
            strokeDasharray="5 5"
            dot={false}
            opacity={0.3}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="yawTarget"
            name="Yaw Target"
            stroke="#1e90ff"
            strokeWidth={1}
            strokeDasharray="5 5"
            dot={false}
            opacity={0.3}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TuningGraph; 