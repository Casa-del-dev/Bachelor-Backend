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

    async def websocket_input(prompt: str) -> str:
        # Send a prompt to the frontend
        await websocket.send_text(json.dumps({
            "action": "input_request",
            "prompt": prompt
        }))

        # Wait for a response from the frontend
        while True:
            response = await websocket.receive_text()
            data = json.loads(response)
            if data.get("action") == "input_response":
                return data.get("value", "")

    while True:
        try:
            data = await websocket.receive_text()
            request = json.loads(data)
            action = request.get("action")

            old_stdout = sys.stdout
            old_stderr = sys.stderr
            sys.stdout = io.StringIO()
            sys.stderr = io.StringIO()

            try:
                if action == "run":
                    code = request.get("code", "")

                    try:
                        # Step 1: Compile check (syntax only)
                        compile(code, "<input>", "exec")
                    except SyntaxError as e:
                        print(f"❌ SyntaxError: {e.msg} on line {e.lineno}")
                    else:
                        # Step 2: Run the code if it compiled cleanly
                        async def run_code():
                            console.locals["input"] = lambda prompt="": asyncio.run(websocket_input(prompt))
                            try:
                                exec(code, console.locals)
                                main_fn = console.locals.get("main")
                                if callable(main_fn):
                                    main_fn()
                                else:
                                    print("ℹ️ No main() function found to run.")
                            except Exception as e:
                                print(f"⚠️ Runtime error: {type(e).__name__}: {str(e)}")
                        await run_code()

                    code = request.get("code", "")

                    async def run_code():
                        # Inject async-aware input shim
                        console.locals["input"] = lambda prompt="": asyncio.run(websocket_input(prompt))
                        exec(code, console.locals)

                        # Call main() if defined
                        main_fn = console.locals.get("main")
                        if callable(main_fn):
                            main_fn()
                        else:
                            print("ℹ️ No main() function found to run.")

                    await run_code()

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
