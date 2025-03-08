from fastapi import FastAPI
from pydantic import BaseModel
import subprocess

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change "*" to ["http://localhost:5173"] for better security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
class CodeInput(BaseModel):
    code: str

@app.post("/run-python/")
async def run_python(input: CodeInput):
    try:
        # Run the Python code in a separate process
        result = subprocess.run(
            ["python", "-c", input.code], capture_output=True, text=True, timeout=5
        )
        if result.stderr:
            return {"output": "Error: " + result.stderr}
        return {"output": result.stdout}
    except Exception as e:
        return {"output": f"Error: {str(e)}"}
