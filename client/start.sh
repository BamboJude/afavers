#!/bin/bash
echo "🚀 Starting Job Tracker..."
echo ""
echo "Opening two terminals:"
echo "  Terminal 1: Backend (http://localhost:3000)"
echo "  Terminal 2: Frontend (http://localhost:5173)"
echo ""

# Start backend in background
cd server && npm run dev &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Start frontend in background
cd client && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Both servers are starting..."
echo "📍 Frontend: http://localhost:5173"
echo "📍 Backend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
