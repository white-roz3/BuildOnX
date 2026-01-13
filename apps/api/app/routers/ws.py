"""
WebSocket endpoints for real-time build updates.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict
import json

router = APIRouter(tags=["websocket"])

# Active WebSocket connections per build
_connections: Dict[str, list[WebSocket]] = {}


async def broadcast_build_update(
    build_id: str,
    status: str,
    message: str,
    progress: int = 0,
    data: dict = None
):
    """
    Broadcast a build update to all connected clients.
    
    Call this from your build process to push live updates:
        await broadcast_build_update(build_id, "generating", "AI is writing code...", 25)
        await broadcast_build_update(build_id, "deploying", "Deploying to cloud...", 75)
        await broadcast_build_update(build_id, "complete", "Live!", 100, {"url": "..."})
    """
    if build_id not in _connections:
        return
    
    payload = json.dumps({
        "build_id": build_id,
        "status": status,
        "message": message,
        "progress": progress,
        "data": data or {}
    })
    
    # Send to all connected clients
    disconnected = []
    for ws in _connections[build_id]:
        try:
            await ws.send_text(payload)
        except Exception:
            disconnected.append(ws)
    
    # Clean up disconnected clients
    for ws in disconnected:
        if ws in _connections[build_id]:
            _connections[build_id].remove(ws)


@router.websocket("/ws/build/{build_id}")
async def build_websocket(websocket: WebSocket, build_id: str):
    """
    WebSocket endpoint for receiving build updates.
    
    Connect to this endpoint with your build ID to receive real-time updates:
        const ws = new WebSocket(`wss://api.BuildOnX.app/ws/build/${buildId}`);
        ws.onmessage = (e) => {
            const { status, message, progress, data } = JSON.parse(e.data);
            updateUI(status, message, progress);
        };
    """
    await websocket.accept()
    
    # Register connection
    if build_id not in _connections:
        _connections[build_id] = []
    _connections[build_id].append(websocket)
    
    # Send initial connection confirmation
    await websocket.send_text(json.dumps({
        "build_id": build_id,
        "status": "connected",
        "message": "Connected to build updates",
        "progress": 0
    }))
    
    try:
        # Keep connection alive
        while True:
            # Wait for ping/pong or client messages
            data = await websocket.receive_text()
            
            # Handle ping
            if data == "ping":
                await websocket.send_text("pong")
    
    except WebSocketDisconnect:
        pass
    finally:
        # Cleanup on disconnect
        if build_id in _connections:
            if websocket in _connections[build_id]:
                _connections[build_id].remove(websocket)
            if not _connections[build_id]:
                del _connections[build_id]


def get_connection_count(build_id: str) -> int:
    """Get number of clients watching a build."""
    return len(_connections.get(build_id, []))


def get_total_connections() -> int:
    """Get total number of active WebSocket connections."""
    return sum(len(conns) for conns in _connections.values())

