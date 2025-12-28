# Drone Survey Management System

A production-quality, real-time drone survey management system built with modern web technologies. This system enables mission planning, fleet monitoring, live mission tracking, and comprehensive survey reporting.

![Tech Stack](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)

## 🚀 Features

### 1. **Fleet Management**
- Add, edit, and remove drones from the fleet
- Real-time drone status monitoring (Available, In Mission, Charging, Maintenance, Offline)
- Battery level tracking with visual indicators
- Fleet statistics dashboard

### 2. **Mission Planning**
- Interactive map-based survey area definition using polygon drawing
- Three flight path patterns:
  - **Grid**: Parallel lines with configurable overlap
  - **Perimeter**: Follow polygon boundary
  - **Crosshatch**: Grid with perpendicular passes
- Configurable parameters:
  - Altitude (20-120m)
  - Speed (5-20 m/s)
  - Image overlap percentage (50-90%)
- Automatic flight path generation and waypoint calculation

### 3. **Live Mission Monitoring**
- Real-time drone position tracking on interactive map
- Mission progress visualization with percentage and waypoint tracking
- Live telemetry data (battery, altitude, speed)
- Mission controls (Pause, Resume, Abort)
- ETA calculation
- Multi-mission concurrent monitoring

### 4. **Survey Reporting & Analytics**
- Comprehensive mission reports with:
  - Duration, distance, coverage area
  - Waypoint completion rate
  - Battery consumption
  - Average and max speed
- Organization-wide statistics
- Per-drone performance metrics
- Interactive charts and visualizations

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Frontend (React + TypeScript)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Fleet      │  │   Mission    │  │   Reports    │      │
│  │  Dashboard   │  │   Planning   │  │  Analytics   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                   ┌────────▼────────┐                        │
│                   │  Mapbox GL JS   │                        │
│                   └─────────────────┘                        │
└────────────────────────┬───────────────────┬─────────────────┘
                         │ REST API          │ WebSocket
                         │                   │
┌────────────────────────▼───────────────────▼─────────────────┐
│                Backend (Fastify + TypeScript)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Mission    │  │    Fleet     │  │   Survey     │       │
│  │   Service    │  │   Service    │  │   Service    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│         │                  │                  │               │
│  ┌─────────────────────────▼──────────────────────┐          │
│  │     Mission Simulation Engine (Bull Queue)     │          │
│  └─────────────────────────────────────────────────┘          │
│         │                  │                  │               │
│    ┌────▼─────┐      ┌────▼─────┐      ┌────▼─────┐         │
│    │PostgreSQL│      │  Redis   │      │Socket.IO │         │
│    │ +PostGIS │      │  Cache   │      │  Server  │         │
│    └──────────┘      └──────────┘      └──────────┘         │
└───────────────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Mapbox GL JS** for interactive maps
- **Socket.IO Client** for real-time updates
- **Zustand** for state management
- **Recharts** for data visualization
- **Axios** for API communication

### Backend
- **Node.js** with TypeScript
- **Fastify** for high-performance API server
- **Prisma ORM** for database management
- **PostgreSQL** for data persistence
- **Redis** for caching and job queues
- **Bull** for background job processing
- **Socket.IO** for WebSocket communication
- **Turf.js** for geospatial calculations
- **Zod** for request validation

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (or use the provided Railway connection)
- Redis instance (or use the provided Redis Labs connection)
- Mapbox API token

### 1. Clone the Repository
```bash
cd /home/satyendra9580/Desktop/Flytbase
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file (already configured with your credentials)
# The .env file is already set up with:
# - PostgreSQL connection (Railway)
# - Redis connection (Redis Labs)
# - Server ports

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start the backend server
npm run dev
```

The backend will start on `http://localhost:3001`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file (already configured)
# The .env.example contains your Mapbox token

# Copy .env.example to .env
cp .env.example .env

# Start the development server
npm run dev
```

The frontend will start on `http://localhost:3000`

### 4. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## 🎯 Usage Guide

### Adding a Drone
1. Navigate to **Fleet Management**
2. Click **Add Drone**
3. Fill in drone details (name, model, speed, max altitude)
4. Click **Add Drone**

### Creating a Mission
1. Navigate to **Mission Planning**
2. Click **Draw Survey Area**
3. Draw a polygon on the map to define the survey area
4. Select an available drone
5. Choose a flight pattern (Grid, Perimeter, or Crosshatch)
6. Configure altitude, speed, and overlap percentage
7. Click **Create Mission**

### Starting a Mission
1. Navigate to **Live Monitoring**
2. Find your planned mission in the list
3. Click **Start** to begin the mission
4. Watch real-time drone movement on the map
5. Use **Pause**, **Resume**, or **Abort** controls as needed

### Viewing Reports
1. Navigate to **Reports & Analytics**
2. View organization-wide statistics
3. Check per-drone performance metrics
4. Review individual mission reports

## 🔧 API Documentation

### Fleet Endpoints
- `GET /api/fleet` - Get all drones
- `POST /api/fleet` - Create new drone
- `GET /api/fleet/:id` - Get drone by ID
- `PUT /api/fleet/:id` - Update drone
- `DELETE /api/fleet/:id` - Delete drone
- `GET /api/fleet/stats/overview` - Get fleet statistics

### Mission Endpoints
- `GET /api/missions` - Get all missions
- `POST /api/missions` - Create new mission
- `GET /api/missions/:id` - Get mission by ID
- `POST /api/missions/:id/start` - Start mission
- `POST /api/missions/:id/pause` - Pause mission
- `POST /api/missions/:id/resume` - Resume mission
- `POST /api/missions/:id/abort` - Abort mission
- `GET /api/missions/active/list` - Get active missions

### Survey Endpoints
- `GET /api/surveys/:missionId` - Get mission report
- `GET /api/surveys` - Get all reports
- `GET /api/surveys/stats/organization` - Get organization stats
- `GET /api/surveys/stats/drone/:droneId` - Get drone stats

### WebSocket Events
- `drone:position` - Real-time drone position updates
- `drone:status` - Drone status changes
- `mission:progress` - Mission progress updates
- `mission:status` - Mission status changes
- `fleet:stats` - Fleet statistics updates

## 🏛️ Database Schema

### Drone
- Stores drone information (name, model, status, battery, position)
- Tracks current location and capabilities

### Mission
- Stores mission configuration and progress
- Links to drone and waypoints
- Tracks survey area (GeoJSON polygon)

### Waypoint
- Individual points in the flight path
- Sequence-ordered for navigation
- Tracks completion status

### SurveyReport
- Generated after mission completion
- Stores performance metrics and statistics

## 🎨 Design Decisions

### 1. **Event-Driven Architecture**
- WebSocket for real-time updates eliminates polling
- Background workers prevent API blocking
- Efficient resource utilization

### 2. **Geospatial Optimization**
- Turf.js for client-side calculations
- PostGIS-ready schema for future spatial queries
- Efficient flight path generation algorithms

### 3. **Caching Strategy**
- Redis caching for frequently accessed data
- 60-second TTL for drone/mission data
- Pattern-based cache invalidation

### 4. **Simulation Engine**
- Bull queue for reliable background processing
- Realistic drone movement with interpolation
- Battery drain simulation
- Automatic mission completion/abort handling

### 5. **State Management**
- Zustand for lightweight, performant state
- WebSocket integration for real-time sync
- Optimistic UI updates

## 🚀 Performance Considerations

- **Concurrent Missions**: Supports 10+ simultaneous missions
- **WebSocket Efficiency**: Event-based updates only when needed
- **Database Indexing**: Optimized queries with proper indexes
- **Caching Layer**: Redis reduces database load
- **Background Processing**: Non-blocking mission simulation



## 📝 Future Enhancements

- [ ] User authentication and authorization
- [ ] Multi-organization support
- [ ] Historical mission replay
- [ ] Weather integration
- [ ] No-fly zone enforcement
- [ ] Advanced analytics and ML predictions
- [ ] Mobile app for field operations
- [ ] Drone telemetry logging
- [ ] Export reports to PDF/CSV

## 🐛 Troubleshooting

### Backend won't start
- Ensure PostgreSQL and Redis are accessible
- Check `.env` file configuration
- Run `npm run prisma:generate` again

### Frontend can't connect to backend
- Verify backend is running on port 3001
- Check CORS configuration
- Ensure WebSocket port is not blocked

### Map not loading
- Verify Mapbox access token in `.env`
- Check browser console for errors
- Ensure internet connection for map tiles


