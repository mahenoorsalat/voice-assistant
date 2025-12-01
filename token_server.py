# token_server.py (FIXED)
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from livekit import api
from dotenv import load_dotenv
import os


load_dotenv(dotenv_path="./.env.local")
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/token")
def get_token():
    token = api.AccessToken(
        os.getenv("LIVEKIT_API_KEY"),
        os.getenv("LIVEKIT_API_SECRET"),
    ).with_identity("user1").with_grants(api.VideoGrants(room_join=True, room="voice-assistant"))
    
    return JSONResponse(content={"token": token.to_jwt()})



@app.get("/")
def home():
    return {"message": "welcome"}