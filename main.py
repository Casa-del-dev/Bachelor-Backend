import uvicorn
from fastapi import FastAPI, WebSocket
import json
import sys
import io
import asyncio
from code import InteractiveConsole

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "FastAPI is running on Fly.io"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    console = InteractiveConsole()

    input_future = None  # ⬅️ Global inside this session

    async def websocket_input(prompt: str) -> str:
        nonlocal input_future
        input_future = asyncio.get_event_loop().create_future()

        await websocket.send_text(json.dumps({
            "action": "input_request",
            "prompt": prompt
        }))

        return await input_future

    def patched_input(prompt=""):
        return asyncio.get_event_loop().run_until_complete(websocket_input(prompt))

    while True:
        try:
            data = await websocket.receive_text()
            request = json.loads(data)
            action = request.get("action")

            # Handle input response
            if action == "input_response" and input_future:
                input_future.set_result(request.get("value", ""))
                continue

            old_stdout = sys.stdout
            old_stderr = sys.stderr
            sys.stdout = io.StringIO()
            sys.stderr = io.StringIO()

            try:
                if action == "run":
                    code = request.get("code", "")

                    try:
                        compile(code, "<input>", "exec")
                    except SyntaxError as e:
                        print(f"❌ SyntaxError: {e.msg} on line {e.lineno}")
                    else:
                        # Patch input and execute
                        console.locals["input"] = patched_input
                        try:
                            exec(code, console.locals)
                            main_fn = console.locals.get("main")
                            if callable(main_fn):
                                main_fn()
                            else:
                                print("ℹ️ No main() function found to run.")
                        except Exception as e:
                            print(f"⚠️ Runtime error: {type(e).__name__}: {str(e)}")

                elif action == "compile":
                    code = request.get("code", "")
                    try:
                        compile(code, "<input>", "exec")
                        exec(code, {})  # optional runtime check
                        print("✅ Code compiles and passes initial checks.")
                    except SyntaxError as e:
                        print(f"❌ SyntaxError: {e.msg} on line {e.lineno}")
                    except Exception as e:
                        print(f"❌ Runtime Error during setup: {type(e).__name__}: {str(e)}")

                elif action == "test":
                    import types
                    import unittest
                    import traceback

                    code_under_test = request.get("code", "")
                    test_code = request.get("tests", "")
                    test_globals = {}

                    try:
                        if not code_under_test.strip():
                            raise ValueError("No code provided to test.")
                        if not test_code.strip():
                            raise ValueError("No test cases provided.")

                        exec(code_under_test, test_globals)
                        test_globals["unittest"] = unittest
                        exec(test_code, test_globals)

                        test_module = types.ModuleType("__test_module__")
                        test_module.__dict__.update(test_globals)

                        loader = unittest.TestLoader()
                        suite = loader.loadTestsFromModule(test_module)

                        runner = unittest.TextTestRunner(stream=sys.stdout, verbosity=2)
                        runner.run(suite)

                    except Exception:
                        traceback.print_exc()

                else:
                    print(f"Unsupported action: {action}")

                output = sys.stdout.getvalue() + sys.stderr.getvalue()
            finally:
                sys.stdout = old_stdout
                sys.stderr = old_stderr

            await websocket.send_text(">> " + output)

        except Exception as e:
            await websocket.send_text(f"Error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
