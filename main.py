import uvicorn
from fastapi import FastAPI, WebSocket
import json
import sys
import io
from code import InteractiveConsole

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "FastAPI is running on Fly.io"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    # Create a persistent interactive console for this connection.
    console = InteractiveConsole()

    while True:
        try:
            data = await websocket.receive_text()
            request = json.loads(data)
            action = request.get("action")
            code = request.get("code")

            # In this example, we use the same interactive session for "run" commands.
            # You can extend this to handle "compile" or "test" actions differently if needed.

            # Redirect stdout and stderr to capture output.
            old_stdout = sys.stdout
            old_stderr = sys.stderr
            sys.stdout = io.StringIO()
            sys.stderr = io.StringIO()

            try:
                # Try compiling as an expression so that "1+1" outputs the result.
                code_obj = compile(code, "<input>", "eval")
                result = eval(code_obj, console.locals)
                if result is not None:
                    print(">>" + repr(result))
            except SyntaxError:
                # If not an expression, try executing as statements.
                try:
                    exec(code, console.locals)
                except Exception as e:
                    print(">>" + f"Error: {str(e)}")
            except Exception as e:
                print(">>" + f"Error: {str(e)}")

            # Gather all output.
            output = sys.stdout.getvalue() + sys.stderr.getvalue()

            # Restore original stdout and stderr.
            sys.stdout = old_stdout
            sys.stderr = old_stderr

            await websocket.send_text(output)
        except Exception as e:
            await websocket.send_text(f"Error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
