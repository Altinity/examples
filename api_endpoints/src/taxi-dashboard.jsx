import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Clock, DollarSign, MapPin } from 'lucide-react';

// Use Vite proxy for development (bypasses SSL certificate issues)
const API_BASE_URL = '/api';
const API_USERNAME = import.meta.env.VITE_CLICKHOUSE_USERNAME || 'probably_not_admin';
const API_PASSWORD = import.meta.env.VITE_CLICKHOUSE_PASSWORD || 'password_goes_here';

// Helper function to make authenticated requests
const authenticatedFetch = async (url) => {
  const credentials = btoa(`${API_USERNAME}:${API_PASSWORD}`);
  return fetch(url, {
    headers: {
      'Authorization': `Basic ${credentials}`
    }
  });
};

const TaxiDashboard = () => {
  // State for Query 1: Rush Hour Distribution
  const [timeRange, setTimeRange] = useState({ start: 16, end: 20 });
  const [rushHourData, setRushHourData] = useState(null);
  
  // State for Query 2: Tip Percentage by Distance
  const [distanceRange, setDistanceRange] = useState({ min: 0, max: 5 });
  const [tipData, setTipData] = useState(null);
  
  // State for Query 3: Popular Routes
  const [topN, setTopN] = useState(10);
  const [borough, setBorough] = useState('Manhattan');
  const [routeData, setRouteData] = useState(null);
  
  const [loading, setLoading] = useState({ q1: false, q2: false, q3: false });

  // Query 1: What percentage of rides happen during rush hour?
  const fetchRushHourData = async () => {
    setLoading(prev => ({ ...prev, q1: true }));
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/rush-hour?start_time=${timeRange.start}&end_time=${timeRange.end}`);
      const result = await response.json();

      if (result.data && result.data.length > 0) {
        const { rush_hour_rides, total_rides, percentage } = result.data[0];

        const rushHourNum = Number(rush_hour_rides) || 0;
        const totalNum = Number(total_rides) || 0;
        const pctNum = Number(percentage) || 0;

        setRushHourData({
          pieData: [
            { name: 'Rush Hour', value: rushHourNum, color: '#00d4ff' },
            { name: 'Other Times', value: totalNum - rushHourNum, color: '#1a1a2e' }
          ],
          percentage: pctNum
        });
      }
    } catch (error) {
      console.error('Error fetching rush hour data:', error);
    }
    setLoading(prev => ({ ...prev, q1: false }));
  };

  // Query 2: How do tips vary by trip distance?
  const fetchTipData = async () => {
    setLoading(prev => ({ ...prev, q2: true }));
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/tips?min_distance=${distanceRange.min}&max_distance=${distanceRange.max}`);
      const result = await response.json();
      
      if (result.data) {
        setTipData(result.data.map(row => ({
          distance: `${row.distance_mile}mi`,
          tipPercent: row.avg_tip_pct,
          trips: row.num_trips
        })));
      }
    } catch (error) {
      console.error('Error fetching tip data:', error);
    }
    setLoading(prev => ({ ...prev, q2: false }));
  };

  // Query 3: What are the most popular pickup/dropoff location pairs?
  const fetchRouteData = async () => {
    setLoading(prev => ({ ...prev, q3: true }));
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/routes?limit=${topN}&borough=${encodeURIComponent(borough)}`);
      const result = await response.json();
      
      if (result.data) {
        setRouteData(result.data.map((row, idx) => ({
          route: `${row.pickup} → ${row.dropoff}`,
          trips: row.trip_count,
          avgDistance: row.avg_distance,
          avgFare: row.avg_fare,
          rank: idx + 1
        })));
      }
    } catch (error) {
      console.error('Error fetching route data:', error);
    }
    setLoading(prev => ({ ...prev, q3: false }));
  };

  useEffect(() => {
    fetchRushHourData();
  }, [timeRange]);

  useEffect(() => {
    fetchTipData();
  }, [distanceRange]);

  useEffect(() => {
    fetchRouteData();
  }, [topN, borough]); // Fetch when either topN or borough changes

  const formatHour = (hour) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)',
      color: '#e8e8e8',
      fontFamily: '"IBM Plex Mono", monospace',
      padding: '40px 20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background noise texture */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.03,
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' /%3E%3C/svg%3E")',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <div style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{
          marginBottom: '60px',
          animation: 'fadeInDown 0.8s ease-out'
        }}>
          <h1 style={{
            fontSize: '4rem',
            fontWeight: '900',
            margin: '0 0 10px 0',
            background: 'linear-gradient(135deg, #00d4ff 0%, #0088ff 50%, #00d4ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.02em',
            textShadow: '0 0 40px rgba(0, 212, 255, 0.3)'
          }}>
            NYC TAXI ANALYTICS
          </h1>
          <p style={{
            fontSize: '1.1rem',
            color: '#FFC107',
            margin: 0,
            fontWeight: 400,
            letterSpacing: '0.05em'
          }}>
              REAL-TIME ANALYTICS DASHBOARD • AUGUST–OCTOBER 2025
	      <br />
	      POWERED BY ClickHouse® API ENDPOINTS SERVED BY ALTINITY.CLOUD®
          </p>
        </div>

        {/* Query 1: Rush Hour Distribution */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0, 212, 255, 0.1)',
          borderRadius: '20px',
          padding: '40px',
          marginBottom: '40px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
          animation: 'fadeInUp 0.8s ease-out 0.1s backwards'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
            <Clock size={32} style={{ color: '#00d4ff', marginRight: '15px' }} />
            <div>
              <h2 style={{ 
                fontSize: '1.8rem', 
                margin: 0,
                fontWeight: 700,
                color: '#00d4ff'
              }}>
                RUSH HOUR ANALYSIS
              </h2>
              <p style={{ margin: '5px 0 0 0', color: '#8892a0', fontSize: '0.95rem' }}>
                What percentage of rides occur during peak hours?
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '15px',
              fontSize: '0.9rem',
              color: '#00d4ff',
              fontWeight: 600,
              letterSpacing: '0.05em'
            }}>
              TIME WINDOW: {formatHour(timeRange.start)} – {formatHour(timeRange.end)}
            </label>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.85rem', color: '#8892a0', display: 'block', marginBottom: '8px' }}>
                  START HOUR
                </label>
                <input
                  type="range"
                  min="0"
                  max="23"
                  value={timeRange.start}
                  onChange={(e) => {
                    const newStart = parseInt(e.target.value);
                    if (newStart < timeRange.end) {
                      setTimeRange({ ...timeRange, start: newStart });
                    }
                  }}
                  style={{
                    width: '100%',
                    height: '6px',
                    background: 'linear-gradient(90deg, #00d4ff 0%, #0088ff 100%)',
                    outline: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.85rem', color: '#8892a0', display: 'block', marginBottom: '8px' }}>
                  END HOUR
                </label>
                <input
                  type="range"
                  min="1"
                  max="24"
                  value={timeRange.end}
                  onChange={(e) => {
                    const newEnd = parseInt(e.target.value);
                    if (newEnd > timeRange.start) {
                      setTimeRange({ ...timeRange, end: newEnd });
                    }
                  }}
                  style={{
                    width: '100%',
                    height: '6px',
                    background: 'linear-gradient(90deg, #0088ff 0%, #00d4ff 100%)',
                    outline: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                />
              </div>
            </div>
          </div>

          {loading.q1 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#00d4ff' }}>
              <div style={{ fontSize: '1.2rem' }}>LOADING DATA...</div>
            </div>
          ) : rushHourData ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
              <div style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={rushHourData.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      dataKey="value"
                      startAngle={90}
                      endAngle={450}
                    >
                      {rushHourData.pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} stroke="rgba(0, 212, 255, 0.3)" strokeWidth={2} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '5rem',
                  fontWeight: '900',
                  color: '#00d4ff',
                  textShadow: '0 0 30px rgba(0, 212, 255, 0.5)',
                  lineHeight: 1,
                  marginBottom: '10px'
                }}>
                  {rushHourData.percentage}%
                </div>
                <div style={{ fontSize: '1.1rem', color: '#8892a0' }}>
                  of all rides occur during this time window
                </div>
                <div style={{
                  marginTop: '20px',
                  padding: '15px',
                  background: 'rgba(0, 212, 255, 0.05)',
                  borderLeft: '3px solid #00d4ff',
                  borderRadius: '5px'
                }}>
                  <div style={{ fontSize: '0.85rem', color: '#8892a0', marginBottom: '5px' }}>
                    RUSH HOUR RIDES
                  </div>
                  <div style={{ fontSize: '1.5rem', color: '#00d4ff', fontWeight: 700 }}>
                    {rushHourData.pieData[0].value.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Query 2: Tip Analysis */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 193, 7, 0.1)',
          borderRadius: '20px',
          padding: '40px',
          marginBottom: '40px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
          animation: 'fadeInUp 0.8s ease-out 0.2s backwards'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
            <DollarSign size={32} style={{ color: '#ffc107', marginRight: '15px' }} />
            <div>
              <h2 style={{ 
                fontSize: '1.8rem', 
                margin: 0,
                fontWeight: 700,
                color: '#ffc107'
              }}>
                TIP DISTRIBUTION BY DISTANCE
              </h2>
              <p style={{ margin: '5px 0 0 0', color: '#8892a0', fontSize: '0.95rem' }}>
                How do tips vary based on trip length?
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '15px',
              fontSize: '0.9rem',
              color: '#ffc107',
              fontWeight: 600,
              letterSpacing: '0.05em'
            }}>
              DISTANCE RANGE: {distanceRange.min}–{distanceRange.max} MILES
            </label>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.85rem', color: '#8892a0', display: 'block', marginBottom: '8px' }}>
                  MINIMUM DISTANCE
                </label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={distanceRange.min}
                  onChange={(e) => {
                    const newMin = parseInt(e.target.value);
                    if (newMin < distanceRange.max) {
                      setDistanceRange({ ...distanceRange, min: newMin });
                    }
                  }}
                  style={{
                    width: '100%',
                    height: '6px',
                    background: 'linear-gradient(90deg, #ffc107 0%, #ff9800 100%)',
                    outline: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.85rem', color: '#8892a0', display: 'block', marginBottom: '8px' }}>
                  MAXIMUM DISTANCE
                </label>
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={distanceRange.max}
                  onChange={(e) => {
                    const newMax = parseInt(e.target.value);
                    if (newMax > distanceRange.min) {
                      setDistanceRange({ ...distanceRange, max: newMax });
                    }
                  }}
                  style={{
                    width: '100%',
                    height: '6px',
                    background: 'linear-gradient(90deg, #ff9800 0%, #ffc107 100%)',
                    outline: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                />
              </div>
            </div>
          </div>

          {loading.q2 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#ffc107' }}>
              <div style={{ fontSize: '1.2rem' }}>LOADING DATA...</div>
            </div>
          ) : tipData ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={tipData}>
                <XAxis 
                  dataKey="distance" 
                  stroke="#8892a0"
                  style={{ fontSize: '0.85rem' }}
                />
                <YAxis 
                  stroke="#8892a0"
                  style={{ fontSize: '0.85rem' }}
                  label={{ value: 'Avg Tip %', angle: -90, position: 'insideLeft', fill: '#8892a0' }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(26, 26, 46, 0.95)',
                    border: '1px solid #ffc107',
                    borderRadius: '10px',
                    color: '#e8e8e8'
                  }}
                  formatter={(value, name) => [
                    name === 'tipPercent' ? `${value}%` : value.toLocaleString(),
                    name === 'tipPercent' ? 'Avg Tip' : 'Number of Trips'
                  ]}
                />
                <Bar dataKey="tipPercent" fill="#ffc107" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </div>

        {/* Query 3: Popular Routes */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(76, 175, 80, 0.1)',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
          animation: 'fadeInUp 0.8s ease-out 0.3s backwards'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
            <MapPin size={32} style={{ color: '#4caf50', marginRight: '15px' }} />
            <div>
              <h2 style={{ 
                fontSize: '1.8rem', 
                margin: 0,
                fontWeight: 700,
                color: '#4caf50'
              }}>
                HOTTEST ROUTES
              </h2>
              <p style={{ margin: '5px 0 0 0', color: '#8892a0', fontSize: '0.95rem' }}>
                Most popular routes starting in {borough}
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '15px',
              fontSize: '0.9rem',
              color: '#4caf50',
              fontWeight: 600,
              letterSpacing: '0.05em'
            }}>
              BOROUGH: {borough.toUpperCase()}
            </label>
            <select
              value={borough}
              onChange={(e) => setBorough(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 15px',
                background: 'rgba(76, 175, 80, 0.1)',
                border: '2px solid rgba(76, 175, 80, 0.3)',
                borderRadius: '8px',
                color: '#4caf50',
                fontSize: '1rem',
                fontWeight: 600,
                fontFamily: '"IBM Plex Mono", monospace',
                cursor: 'pointer',
                outline: 'none',
                marginBottom: '25px'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#4caf50';
                e.target.style.background = 'rgba(76, 175, 80, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = 'rgba(76, 175, 80, 0.3)';
                e.target.style.background = 'rgba(76, 175, 80, 0.1)';
              }}
            >
              <option value="Manhattan">Manhattan</option>
              <option value="Brooklyn">Brooklyn</option>
              <option value="Queens">Queens</option>
              <option value="Bronx">Bronx</option>
              <option value="Staten Island">Staten Island</option>
            </select>
            
            <label style={{ 
              display: 'block', 
              marginBottom: '15px',
              fontSize: '0.9rem',
              color: '#4caf50',
              fontWeight: 600,
              letterSpacing: '0.05em'
            }}>
              SHOW TOP {topN} ROUTES
            </label>
            <input
              type="range"
              min="5"
              max="25"
              step="5"
              value={topN}
              onChange={(e) => setTopN(parseInt(e.target.value))}
              style={{
                width: '100%',
                height: '6px',
                background: 'linear-gradient(90deg, #4caf50 0%, #8bc34a 100%)',
                outline: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            />
          </div>

          {loading.q3 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#4caf50' }}>
              <div style={{ fontSize: '1.2rem' }}>LOADING DATA...</div>
            </div>
          ) : routeData ? (
            <div style={{ 
              display: 'grid', 
              gap: '12px',
              maxHeight: '500px',
              overflowY: 'auto'
            }}>
              {routeData.map((route) => (
                <div 
                  key={route.rank}
                  style={{
                    background: 'rgba(76, 175, 80, 0.05)',
                    border: '1px solid rgba(76, 175, 80, 0.2)',
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(76, 175, 80, 0.1)';
                    e.currentTarget.style.transform = 'translateX(5px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(76, 175, 80, 0.05)';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div style={{
                    width: '50px',
                    height: '50px',
                    background: 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    fontWeight: '900',
                    color: '#0a0a0f',
                    flexShrink: 0
                  }}>
                    {route.rank}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: '1.1rem', 
                      fontWeight: 700, 
                      color: '#4caf50',
                      marginBottom: '5px',
                      fontFamily: '"JetBrains Mono", monospace'
                    }}>
                      {route.route}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#8892a0' }}>
                      {route.trips.toLocaleString()} trips • ${route.avgFare} avg fare • {route.avgDistance}mi avg distance
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '60px',
          paddingTop: '40px',
          borderTop: '1px solid rgba(136, 146, 160, 0.1)',
          color: '#8892a0',
          fontSize: '0.9rem'
        }}>
          <p style={{ fontSize: '0.8rem', marginTop: '10px' }}>
            Data: NYC Taxi & Limousine Commission • August–October 2025
          </p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=JetBrains+Mono:wght@700&display=swap');
        
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
        }
        
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
          transition: all 0.2s ease;
        }
        
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.8);
        }
        
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
          transition: all 0.2s ease;
        }
        
        input[type="range"]::-moz-range-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.8);
        }
        
        ::-webkit-scrollbar {
          width: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(76, 175, 80, 0.5);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(76, 175, 80, 0.7);
        }
      `}</style>
    </div>
  );
};

export default TaxiDashboard;
