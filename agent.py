import os
from dotenv import load_dotenv
import asyncio

from livekit.agents import Agent, AgentSession, WorkerOptions, cli
from livekit.plugins import silero, cartesia, deepgram
from livekit.plugins.google import LLM as GeminiLLM

load_dotenv(".env.local")

async def entrypoint(ctx):
    await ctx.connect()

    vad = silero.VAD.load()

    agent = Agent(
        instructions=(
            "You are a helpful voice AI assistant. "
            "Greet the user politely, answer questions clearly, and give useful advice. "
            "Always be friendly and professional."
        ),
    )

    session = AgentSession(
        vad=vad,
        stt=deepgram.STT(),
        llm=GeminiLLM(model="gemini-2.5-flash"),
        tts=cartesia.TTS(
            model="sonic-3",
            api_key=os.getenv("CARTESIA_API_KEY")
        ),
    )

    await session.start(agent=agent, room=ctx.room)

if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            api_key=os.getenv("LIVEKIT_API_KEY"),
            api_secret=os.getenv("LIVEKIT_API_SECRET"),
        )
    )
