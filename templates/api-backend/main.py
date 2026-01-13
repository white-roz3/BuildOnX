"""
{{PROJECT_NAME}} API
{{PROJECT_DESCRIPTION}}

Built with BuildOnX
"""

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────
# App Configuration
# ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="{{PROJECT_NAME}}",
    description="{{PROJECT_DESCRIPTION}}",
    version="1.0.0",
)

# CORS - allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────────

class ItemBase(BaseModel):
    """Base item model."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    price: float = Field(..., ge=0)
    quantity: int = Field(default=0, ge=0)


class ItemCreate(ItemBase):
    """Model for creating items."""
    pass


class ItemUpdate(BaseModel):
    """Model for updating items."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    price: Optional[float] = Field(None, ge=0)
    quantity: Optional[int] = Field(None, ge=0)


class Item(ItemBase):
    """Full item model with ID and timestamps."""
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────
# In-Memory Database (replace with real DB in production)
# ─────────────────────────────────────────────────────────────

items_db: dict[UUID, dict] = {}


# ─────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    """API root endpoint."""
    return {
        "name": "{{PROJECT_NAME}}",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


@app.get("/items", response_model=list[Item])
async def list_items(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
):
    """List all items with pagination."""
    items = list(items_db.values())
    return [Item(**item) for item in items[skip : skip + limit]]


@app.get("/items/{item_id}", response_model=Item)
async def get_item(item_id: UUID):
    """Get a specific item by ID."""
    if item_id not in items_db:
        raise HTTPException(status_code=404, detail="Item not found")
    return Item(**items_db[item_id])


@app.post("/items", response_model=Item, status_code=201)
async def create_item(data: ItemCreate):
    """Create a new item."""
    now = datetime.utcnow()
    item_id = uuid4()
    
    item = {
        "id": item_id,
        "name": data.name,
        "description": data.description,
        "price": data.price,
        "quantity": data.quantity,
        "created_at": now,
        "updated_at": now,
    }
    
    items_db[item_id] = item
    return Item(**item)


@app.patch("/items/{item_id}", response_model=Item)
async def update_item(item_id: UUID, data: ItemUpdate):
    """Update an existing item."""
    if item_id not in items_db:
        raise HTTPException(status_code=404, detail="Item not found")
    
    item = items_db[item_id]
    update_data = data.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        item[key] = value
    
    item["updated_at"] = datetime.utcnow()
    items_db[item_id] = item
    
    return Item(**item)


@app.delete("/items/{item_id}")
async def delete_item(item_id: UUID):
    """Delete an item."""
    if item_id not in items_db:
        raise HTTPException(status_code=404, detail="Item not found")
    
    del items_db[item_id]
    return {"status": "deleted", "id": str(item_id)}


# ─────────────────────────────────────────────────────────────
# Run with: uvicorn main:app --reload
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)

